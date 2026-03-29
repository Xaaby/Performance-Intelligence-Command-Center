import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { DataLoaderService } from '../data-loader/data-loader.service';
import type {
  ClickType,
  RedirectClickRequest,
  RedirectClickResponse,
  RedirectEvent,
  RedirectStatsResponse,
  RedirectVendorStats,
} from '../scoring/scoring.types';
import { VendorsService } from '../vendors/vendors.service';

type ClickWindowStats = {
  total: number;
  real: number;
  bot: number;
  top_ip_clicks: number;
};

@Injectable()
export class RedirectService implements OnModuleInit {
  private readonly logger = new Logger(RedirectService.name);
  private db!: Database.Database;
  private readonly vendorClickCounters = new Map<string, number>();
  private readonly vendorNames = new Map<string, string>();

  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly vendorsService: VendorsService,
  ) {}

  onModuleInit(): void {
    const dataDir = join(process.cwd(), 'data');
    mkdirSync(dataDir, { recursive: true });
    const dbPath = join(dataDir, 'clicks.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS click_events (
        id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        campaign_id TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        geo_region TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        click_type TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_click_events_vendor_ts
        ON click_events(vendor_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_click_events_ts
        ON click_events(timestamp);
    `);
    for (const v of this.dataLoader.getVendors()) {
      this.vendorNames.set(v.vendor_id, v.vendor_name);
    }
    this.logger.log(`Redirect DB initialized at ${dbPath}`);
  }

  recordClick(body: RedirectClickRequest): RedirectClickResponse {
    const clickId = randomUUID();
    const nowIso = new Date().toISOString();
    const ts = Number.isFinite(body.timestamp) ? body.timestamp : Date.now();
    const clickType = this.normalizeClickType(body.click_type);

    this.db
      .prepare(
        `INSERT INTO click_events (
          id, vendor_id, campaign_id, ip_address, user_agent, geo_region, timestamp, click_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        clickId,
        body.vendor_id,
        body.campaign_id,
        body.ip_address,
        body.user_agent,
        body.geo_region,
        ts,
        clickType,
        nowIso,
      );

    const count = (this.vendorClickCounters.get(body.vendor_id) ?? 0) + 1;
    this.vendorClickCounters.set(body.vendor_id, count);
    if (count % 50 === 0) {
      this.recomputeVendorFromLiveWindow(body.vendor_id);
    }
    const win = this.getWindowStatsForVendor(body.vendor_id, 60_000);
    if (win.total > 200) {
      this.recomputeVendorFromLiveWindow(body.vendor_id);
    }

    return { received: true, click_id: clickId, vendor_id: body.vendor_id };
  }

  getStats(): RedirectStatsResponse {
    const cutoff = Date.now() - 60_000;
    const rows = this.db
      .prepare(
        `SELECT vendor_id,
                COUNT(*) AS total,
                SUM(CASE WHEN click_type = 'real' THEN 1 ELSE 0 END) AS real_clicks,
                SUM(CASE WHEN click_type = 'bot' THEN 1 ELSE 0 END) AS bot_clicks
         FROM click_events
         WHERE timestamp >= ?
         GROUP BY vendor_id
         ORDER BY total DESC`,
      )
      .all(cutoff) as Array<{
      vendor_id: string;
      total: number;
      real_clicks: number;
      bot_clicks: number;
    }>;

    const vendors: RedirectVendorStats[] = rows.map((r) => {
      const total = Number(r.total) || 0;
      const bot = Number(r.bot_clicks) || 0;
      const real = Number(r.real_clicks) || 0;
      return {
        vendor_id: r.vendor_id,
        vendor_name: this.vendorNames.get(r.vendor_id) ?? r.vendor_id,
        clicks_last_60s: total,
        real_clicks: real,
        bot_clicks: bot,
        bot_percentage: total > 0 ? bot / total : 0,
      };
    });

    const totalClicks = vendors.reduce((sum, v) => sum + v.clicks_last_60s, 0);
    return {
      vendors,
      total_clicks_last_60s: totalClicks,
      last_updated: new Date().toISOString(),
    };
  }

  getEvents(vendorId?: string, rawLimit = 20): RedirectEvent[] {
    const limit = Math.max(1, Math.min(rawLimit || 20, 200));
    let rows: Array<{
      id: string;
      vendor_id: string;
      campaign_id: string;
      ip_address: string;
      user_agent: string;
      geo_region: string;
      timestamp: number;
      click_type: ClickType;
      created_at: string;
    }> = [];

    if (vendorId) {
      rows = this.db
        .prepare(
          `SELECT id, vendor_id, campaign_id, ip_address, user_agent, geo_region, timestamp, click_type, created_at
           FROM click_events
           WHERE vendor_id = ?
           ORDER BY timestamp DESC
           LIMIT ?`,
        )
        .all(vendorId, limit) as typeof rows;
    } else {
      rows = this.db
        .prepare(
          `SELECT id, vendor_id, campaign_id, ip_address, user_agent, geo_region, timestamp, click_type, created_at
           FROM click_events
           ORDER BY timestamp DESC
           LIMIT ?`,
        )
        .all(limit) as typeof rows;
    }

    return rows.map((r) => ({
      ...r,
      vendor_name: this.vendorNames.get(r.vendor_id) ?? r.vendor_id,
    }));
  }

  getHealth(): { status: 'ok'; total_clicks_stored: number } {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS total_clicks_stored FROM click_events`)
      .get() as { total_clicks_stored: number } | undefined;
    return {
      status: 'ok',
      total_clicks_stored: Number(row?.total_clicks_stored) || 0,
    };
  }

  private recomputeVendorFromLiveWindow(vendorId: string): void {
    const win = this.getWindowStatsForVendor(vendorId, 60_000);
    if (!win.total) return;
    const velocity = this.clamp(win.total / 500);
    const ipConcentration = this.clamp((win.top_ip_clicks / win.total) / 0.05);
    const botPct = this.clamp(win.bot / win.total);

    const thresholdExceeded = velocity > 0.8 || ipConcentration > 1 || botPct > 0.4;
    if (!thresholdExceeded) return;

    this.vendorsService.applyLiveFraudSignals({
      vendor_id: vendorId,
      velocity_anomaly: velocity,
      ip_concentration: ipConcentration,
      bot_percentage: botPct,
      clicks_last_60s: win.total,
    });
  }

  private getWindowStatsForVendor(vendorId: string, windowMs: number): ClickWindowStats {
    const cutoff = Date.now() - windowMs;
    const summary = this.db
      .prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN click_type = 'real' THEN 1 ELSE 0 END) AS real_clicks,
                SUM(CASE WHEN click_type = 'bot' THEN 1 ELSE 0 END) AS bot_clicks
         FROM click_events
         WHERE vendor_id = ? AND timestamp >= ?`,
      )
      .get(vendorId, cutoff) as {
      total: number;
      real_clicks: number;
      bot_clicks: number;
    };
    const ipRow = this.db
      .prepare(
        `SELECT COUNT(*) AS c
         FROM click_events
         WHERE vendor_id = ? AND timestamp >= ?
         GROUP BY ip_address
         ORDER BY c DESC
         LIMIT 1`,
      )
      .get(vendorId, cutoff) as { c: number } | undefined;

    return {
      total: Number(summary?.total) || 0,
      real: Number(summary?.real_clicks) || 0,
      bot: Number(summary?.bot_clicks) || 0,
      top_ip_clicks: Number(ipRow?.c) || 0,
    };
  }

  private normalizeClickType(clickType: ClickType): ClickType {
    return clickType === 'bot' || clickType === 'scanner' ? clickType : 'real';
  }

  private clamp(x: number): number {
    return Math.max(0, Math.min(x, 1));
  }
}
