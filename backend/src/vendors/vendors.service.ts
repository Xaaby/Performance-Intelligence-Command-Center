import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataLoaderService } from '../data-loader/data-loader.service';
import { ScoringService } from '../scoring/scoring.service';
import type { ScoreRequest, VendorScore } from '../scoring/scoring.types';
import type { VendorsResponse, VendorsSummary } from '../scoring/scoring.types';
import type { LiveVendorScoreUpdate } from '../scoring/scoring.types';

@Injectable()
export class VendorsService implements OnModuleInit {
  private readonly logger = new Logger(VendorsService.name);
  private scored: VendorScore[] = [];
  private vendorIndex = new Map<string, number>();
  private recentUpdates: LiveVendorScoreUpdate[] = [];
  private computedAt = '';

  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly scoring: ScoringService,
  ) {}

  onModuleInit(): void {
    const raw = this.dataLoader.getVendors();
    let scored = raw.map((r) => this.scoring.scoreVendor(r));
    scored = this.applyControlPartners(scored);
    this.scored = scored;
    this.vendorIndex = new Map(this.scored.map((v, i) => [v.vendor_id, i]));
    this.computedAt = new Date().toISOString();
    this.logger.log(`Scored ${this.scored.length} vendors`);
  }

  /** Same geo: lexicographically smallest other vendor_id is the control arm partner for demo. */
  private applyControlPartners(scores: VendorScore[]): VendorScore[] {
    const byGeo = new Map<string, VendorScore[]>();
    for (const s of scores) {
      const list = byGeo.get(s.geo_target) ?? [];
      list.push(s);
      byGeo.set(s.geo_target, list);
    }
    const sortedAll = [...scores].sort((a, b) =>
      a.vendor_id.localeCompare(b.vendor_id),
    );
    return scores.map((s) => {
      if (s.experiment_phase !== 'ab_test') {
        return s;
      }
      const peers = (byGeo.get(s.geo_target) ?? []).filter(
        (p) => p.vendor_id !== s.vendor_id,
      );
      peers.sort((a, b) => a.vendor_id.localeCompare(b.vendor_id));
      const control = peers[0] ?? sortedAll.find((p) => p.vendor_id !== s.vendor_id);
      if (!control) {
        return { ...s, ab_test_control_vendor: null };
      }
      return { ...s, ab_test_control_vendor: control.vendor_id };
    });
  }

  getScoredVendors(): VendorScore[] {
    return this.scored;
  }

  getVendorById(vendorId: string): VendorScore | null {
    const idx = this.vendorIndex.get(vendorId);
    if (idx === undefined) return null;
    return this.scored[idx] ?? null;
  }

  getVendorsResponse(): VendorsResponse {
    return {
      vendors: this.scored,
      summary: this.buildSummary(),
      computed_at: this.computedAt,
    };
  }

  private buildSummary(): VendorsSummary {
    const v = this.scored;
    const high_quality_count = v.filter((x) => x.quality_tier === 'high').length;
    const medium_quality_count = v.filter((x) => x.quality_tier === 'medium').length;
    const low_quality_count = v.filter((x) => x.quality_tier === 'low').length;
    const suspended_count = v.filter(
      (x) =>
        x.budget_decision === 'suspend' ||
        x.budget_decision === 'emergency_pause',
    ).length;
    const fraud_review_count = v.filter(
      (x) =>
        x.fraud_status === 'review' ||
        x.fraud_status === 'escalation' ||
        x.fraud_status === 'auto_pause',
    ).length;
    const raw_budget_at_risk = v
      .filter(
        (x) =>
          x.fraud_status === 'auto_pause' ||
          x.budget_decision === 'emergency_pause' ||
          x.budget_decision === 'suspend',
      )
      .reduce((sum, x) => sum + x.budget_allocation_pct, 0);
    const total_budget_at_risk = Math.min(raw_budget_at_risk, 100);

    return {
      total_vendors: v.length,
      high_quality_count,
      medium_quality_count,
      low_quality_count,
      suspended_count,
      fraud_review_count,
      total_budget_at_risk: Math.round(total_budget_at_risk * 1000) / 1000,
    };
  }

  scoreFromInput(input: ScoreRequest): VendorScore {
    return this.scoring.scoreFromRequest(input);
  }

  applyLiveFraudSignals(input: {
    vendor_id: string;
    velocity_anomaly: number;
    ip_concentration: number;
    bot_percentage: number;
    clicks_last_60s: number;
  }): VendorScore | null {
    const idx = this.vendorIndex.get(input.vendor_id);
    if (idx === undefined) return null;
    const current = this.scored[idx];
    if (!current) return null;

    const previousScore = current.effective_score;
    const fraud_signals = {
      ...current.fraud_signals,
      velocity_anomaly: this.clamp(input.velocity_anomaly),
      ip_concentration: this.clamp(input.ip_concentration),
      scanner_detection: this.clamp(input.bot_percentage / 0.2),
    };

    const fraud_p = this.scoring.computeFraudP(fraud_signals);
    const effective_score = this.scoring.computeEffectiveScore(current.tqs, fraud_p);
    const fraud_status = this.scoring.classifyFraudStatus(fraud_p);
    const baseDecision = this.scoring.computeBudgetDecision(effective_score, fraud_p);
    const emergency = fraud_p >= 0.8;
    const reason = `Live velocity anomaly detected: ${input.clicks_last_60s} clicks/60s`;

    const updated: VendorScore = {
      ...current,
      fraud_signals,
      fraud_p,
      effective_score,
      fraud_status,
      budget_decision: emergency ? 'emergency_pause' : baseDecision.budget_decision,
      budget_decision_label: emergency
        ? 'Emergency Pause'
        : baseDecision.budget_decision_label,
      budget_change_pct: emergency ? -100 : baseDecision.budget_change_pct,
      decision_reason: emergency
        ? 'Fraud probability is at least 0.80 from live click behavior; budget paused immediately.'
        : baseDecision.decision_reason,
      score_change_reason: reason,
    };

    this.scored[idx] = updated;
    this.computedAt = new Date().toISOString();
    const changedAt = new Date().toISOString();
    this.recentUpdates.push({
      vendor_id: updated.vendor_id,
      previous_effective_score: previousScore,
      current_effective_score: updated.effective_score,
      score_delta: updated.effective_score - previousScore,
      change_reason: reason,
      changed_at: changedAt,
    });
    this.pruneRecentUpdates();
    return updated;
  }

  getRecentLiveUpdates(): LiveVendorScoreUpdate[] {
    this.pruneRecentUpdates();
    return [...this.recentUpdates];
  }

  private pruneRecentUpdates(): void {
    const cutoff = Date.now() - 60_000;
    this.recentUpdates = this.recentUpdates.filter(
      (u) => Date.parse(u.changed_at) >= cutoff,
    );
  }

  private clamp(x: number): number {
    return Math.max(0, Math.min(x, 1));
  }
}
