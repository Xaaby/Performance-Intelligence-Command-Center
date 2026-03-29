import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
import type { VendorRaw } from '../scoring/scoring.types';

@Injectable()
export class DataLoaderService implements OnModuleInit {
  private readonly logger = new Logger(DataLoaderService.name);
  private vendors: VendorRaw[] = [];
  private loaded = false;

  onModuleInit(): void {
    const primaryPath = join(process.cwd(), 'data', 'vendors.csv');
    const fallbackPath = join(process.cwd(), 'data', 'vendors.generated.csv');
    let csvPath = primaryPath;
    let file = '';
    try {
      file = readFileSync(primaryPath, 'utf-8');
    } catch {
      file = readFileSync(fallbackPath, 'utf-8');
      csvPath = fallbackPath;
    }
    this.logger.log(`Loading vendors from ${csvPath}`);
    const rows = parse(file, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    this.vendors = rows.map((row) => this.mapRow(row));
    this.loaded = true;
    this.logger.log(`Loaded ${this.vendors.length} vendors`);
  }

  private parseNum(s: string | undefined): number {
    if (s === undefined || s === '') return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  private parseIntRow(s: string | undefined, fallback = 0): number {
    const n = this.parseNum(s);
    return Math.round(n);
  }

  private parseAbTestDay(s: string | undefined): number | null {
    if (s === undefined || s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  /** First non-empty value among alternate CSV header names (snake_case vs Excel export). */
  private cell(row: Record<string, string>, ...keys: string[]): string | undefined {
    for (const k of keys) {
      const v = row[k];
      if (v !== undefined && String(v).trim() !== '') return v;
    }
    return undefined;
  }

  private mapRow(row: Record<string, string>): VendorRaw {
    return {
      vendor_id: String(this.cell(row, 'vendor_id', 'Vendor ID') ?? ''),
      vendor_name: String(this.cell(row, 'vendor_name', 'Vendor Name') ?? ''),
      campaign_id: String(this.cell(row, 'campaign_id', 'Campaign ID') ?? ''),
      campaign_name: String(this.cell(row, 'campaign_name', 'Campaign Name') ?? ''),
      geo_target: String(this.cell(row, 'geo_target', 'Geo') ?? ''),
      total_clicks: this.parseIntRow(this.cell(row, 'total_clicks', 'Total Clicks')),
      unique_ips: this.parseIntRow(this.cell(row, 'unique_ips', 'Unique IPs')),
      in_geo_clicks: this.parseIntRow(this.cell(row, 'in_geo_clicks', 'In-Geo Clicks')),
      unique_device_fps: this.parseIntRow(
        this.cell(row, 'unique_device_fps', 'Device FPs'),
      ),
      click_timing_cov: this.parseNum(
        this.cell(row, 'click_timing_cov', 'Click Timing CoV'),
      ),
      bot_flagged_clicks: this.parseIntRow(
        this.cell(row, 'bot_flagged_clicks', 'Bot Flagged'),
      ),
      max_clicks_per_60s: this.parseIntRow(
        this.cell(row, 'max_clicks_per_60s', 'Max Clicks/60s'),
      ),
      max_single_ip_clicks: this.parseIntRow(
        this.cell(row, 'max_single_ip_clicks', 'Max IP Clicks'),
      ),
      device_fp_max_24h: this.parseIntRow(
        this.cell(row, 'device_fp_max_24h', 'Dev FP Max 24h'),
      ),
      scanner_clicks: this.parseIntRow(this.cell(row, 'scanner_clicks', 'Scanner Clicks')),
      days_active: this.parseIntRow(this.cell(row, 'days_active', 'Days Active')),
      experiment_phase: String(
        this.cell(row, 'experiment_phase', 'Exp. Phase') ?? '',
      ),
      ab_test_day: this.parseAbTestDay(this.cell(row, 'ab_test_day', 'AB Test Day')),
      budget_allocation_pct: this.parseNum(
        this.cell(row, 'budget_allocation_pct', 'Budget Alloc %'),
      ),
    };
  }

  getVendors(): VendorRaw[] {
    return this.vendors;
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}
