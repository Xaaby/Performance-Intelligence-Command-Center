import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type {
  BudgetDecisionResult,
  FraudSignals,
  FraudStatus,
  QualityTier,
  ScoreRequest,
  VendorRaw,
  VendorScore,
  VendorSignals,
} from './scoring.types';

const TOL = 0.005;

/** Expected outputs from applying docs/SCORING_ENGINE.md formulas to the three validated input rows (table in the doc uses different numbers). */
const FORMULA_GOLDEN: Array<{
  name: string;
  raw: VendorRaw;
  tqs: number;
  fraud_p: number;
  effective_score: number;
}> = [
  {
    name: 'Vendor A',
    raw: {
      vendor_id: 'REF-A',
      vendor_name: 'Ref A',
      campaign_id: 'REF',
      campaign_name: 'Ref',
      geo_target: 'TX',
      total_clicks: 8000,
      unique_ips: 7100,
      in_geo_clicks: 6900,
      unique_device_fps: 7200,
      click_timing_cov: 1.82,
      bot_flagged_clicks: 120,
      max_clicks_per_60s: 38,
      max_single_ip_clicks: 18,
      device_fp_max_24h: 4,
      scanner_clicks: 95,
      days_active: 30,
      experiment_phase: 'active',
      ab_test_day: null,
      budget_allocation_pct: 10,
    },
    tqs: 0.851375,
    fraud_p: 0.1508833333333333,
    effective_score: 0.7228771041666666,
  },
  {
    name: 'Vendor B',
    raw: {
      vendor_id: 'REF-B',
      vendor_name: 'Ref B',
      campaign_id: 'REF',
      campaign_name: 'Ref',
      geo_target: 'TX',
      total_clicks: 10000,
      unique_ips: 9200,
      in_geo_clicks: 8600,
      unique_device_fps: 9100,
      click_timing_cov: 1.74,
      bot_flagged_clicks: 150,
      max_clicks_per_60s: 780,
      max_single_ip_clicks: 620,
      device_fp_max_24h: 340,
      scanner_clicks: 190,
      days_active: 30,
      experiment_phase: 'active',
      ab_test_day: null,
      budget_allocation_pct: 10,
    },
    tqs: 0.8585,
    fraud_p: 0.818,
    effective_score: 0.156247,
  },
  {
    name: 'Vendor C',
    raw: {
      vendor_id: 'REF-C',
      vendor_name: 'Ref C',
      campaign_id: 'REF',
      campaign_name: 'Ref',
      geo_target: 'TX',
      total_clicks: 3200,
      unique_ips: 2400,
      in_geo_clicks: 2112,
      unique_device_fps: 2592,
      click_timing_cov: 1.24,
      bot_flagged_clicks: 224,
      max_clicks_per_60s: 62,
      max_single_ip_clicks: 29,
      device_fp_max_24h: 6,
      scanner_clicks: 11,
      days_active: 5,
      experiment_phase: 'cold_start',
      ab_test_day: null,
      budget_allocation_pct: 5,
    },
    tqs: 0.707,
    fraud_p: 0.19992916666666666,
    effective_score: 0.5656500791666667,
  },
];

/** Doc-aligned rounded values (logged next to live engine output). */
const SCORING_ENGINE_PUBLISHED: Record<
  string,
  { tqs: number; fraud_p: number; effective: number }
> = {
  'Vendor A': { tqs: 0.851, fraud_p: 0.151, effective: 0.723 },
  'Vendor B': { tqs: 0.859, fraud_p: 0.818, effective: 0.156 },
  'Vendor C': { tqs: 0.707, fraud_p: 0.2, effective: 0.566 },
};

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

@Injectable()
export class ScoringService implements OnModuleInit {
  private readonly logger = new Logger(ScoringService.name);

  onModuleInit(): void {
    this.validateReferenceVendors();
  }

  private validateReferenceVendors(): void {
    this.logger.log('Scoring reference validation (formula golden set)…');
    for (const row of FORMULA_GOLDEN) {
      const s = this.scoreVendor(row.raw);
      const dt = Math.abs(s.tqs - row.tqs);
      const df = Math.abs(s.fraud_p - row.fraud_p);
      const de = Math.abs(s.effective_score - row.effective_score);
      if (dt > TOL || df > TOL || de > TOL) {
        throw new Error(
          `Scoring mismatch for ${row.name}: expected tqs=${row.tqs}, fraud_p=${row.fraud_p}, effective=${row.effective_score}; got tqs=${s.tqs}, fraud_p=${s.fraud_p}, effective=${s.effective_score}`,
        );
      }
      const pub = SCORING_ENGINE_PUBLISHED[row.name];
      this.logger.log(
        `${row.name}: engine tqs=${s.tqs.toFixed(6)} fraud_p=${s.fraud_p.toFixed(6)} effective=${s.effective_score.toFixed(6)} | SCORING_ENGINE.md table tqs=${pub.tqs} fraud_p=${pub.fraud_p} effective=${pub.effective}`,
      );
    }
    this.logger.log('Reference validation passed.');
  }

  extractSignals(raw: VendorRaw): VendorSignals {
    const tc = raw.total_clicks;
    if (tc <= 0) {
      throw new Error('total_clicks must be positive');
    }
    return {
      ip_diversity: clamp(raw.unique_ips / tc, 0, 1),
      geo_relevance: clamp(raw.in_geo_clicks / tc, 0, 1),
      device_fp_uniqueness: clamp(raw.unique_device_fps / tc, 0, 1),
      click_timing_variance: clamp(raw.click_timing_cov / 3.0, 0, 1),
      bot_candidate_rate: clamp(1 - raw.bot_flagged_clicks / tc, 0, 1),
    };
  }

  extractFraudSignals(raw: VendorRaw): FraudSignals {
    const tc = raw.total_clicks;
    if (tc <= 0) {
      throw new Error('total_clicks must be positive');
    }
    const maxSingleIpPct = raw.max_single_ip_clicks / tc;
    return {
      velocity_anomaly: clamp(raw.max_clicks_per_60s / 500, 0, 1),
      ip_concentration: clamp(maxSingleIpPct / 0.05, 0, 1),
      scanner_detection: clamp(raw.scanner_clicks / (tc * 0.05), 0, 1),
      fp_clustering: clamp(raw.device_fp_max_24h / 20, 0, 1),
      behavioral_regularity: clamp(1 - raw.click_timing_cov / 3.0, 0, 1),
    };
  }

  computeTQS(signals: VendorSignals): number {
    return (
      0.3 * signals.ip_diversity +
      0.25 * signals.geo_relevance +
      0.2 * signals.device_fp_uniqueness +
      0.15 * signals.click_timing_variance +
      0.1 * signals.bot_candidate_rate
    );
  }

  computeFraudP(fraudSignals: FraudSignals): number {
    return (
      0.3 * fraudSignals.velocity_anomaly +
      0.25 * fraudSignals.ip_concentration +
      0.2 * fraudSignals.scanner_detection +
      0.15 * fraudSignals.fp_clustering +
      0.1 * fraudSignals.behavioral_regularity
    );
  }

  computeEffectiveScore(tqs: number, fraudP: number): number {
    return tqs * (1 - fraudP);
  }

  classifyQualityTier(tqs: number): QualityTier {
    if (tqs >= 0.75) return 'high';
    if (tqs >= 0.5) return 'medium';
    if (tqs >= 0.3) return 'low';
    return 'poor';
  }

  classifyFraudStatus(fraudP: number): FraudStatus {
    if (fraudP <= 0.39) return 'clean';
    if (fraudP <= 0.59) return 'review';
    if (fraudP <= 0.79) return 'escalation';
    return 'auto_pause';
  }

  computeBudgetDecision(
    effectiveScore: number,
    fraudP: number,
  ): BudgetDecisionResult {
    if (fraudP >= 0.8) {
      return {
        budget_decision: 'emergency_pause',
        budget_decision_label: 'Emergency Pause',
        budget_change_pct: -100,
        decision_reason:
          'Fraud probability is at least 0.80; budget is suspended immediately.',
      };
    }
    if (effectiveScore >= 0.75) {
      return {
        budget_decision: 'scale_20',
        budget_decision_label: 'Scale +20%',
        budget_change_pct: 20,
        decision_reason:
          'Effective score is at least 0.75; increase allocation subject to diversification caps.',
      };
    }
    if (effectiveScore >= 0.5) {
      return {
        budget_decision: 'hold',
        budget_decision_label: 'Hold',
        budget_change_pct: 0,
        decision_reason:
          'Effective score is between 0.50 and 0.74; maintain budget and monitor.',
      };
    }
    if (effectiveScore >= 0.3) {
      return {
        budget_decision: 'reduce_30',
        budget_decision_label: 'Reduce -30%',
        budget_change_pct: -30,
        decision_reason:
          'Effective score is between 0.30 and 0.49; reduce allocation.',
      };
    }
    return {
      budget_decision: 'suspend',
      budget_decision_label: 'Suspend',
      budget_change_pct: -100,
      decision_reason:
        'Effective score is below 0.30; suspend budget pending review.',
    };
  }

  scoreVendor(raw: VendorRaw): VendorScore {
    const signals = this.extractSignals(raw);
    const fraud_signals = this.extractFraudSignals(raw);
    const tqs = this.computeTQS(signals);
    const fraud_p = this.computeFraudP(fraud_signals);
    const effective_score = this.computeEffectiveScore(tqs, fraud_p);
    const quality_tier = this.classifyQualityTier(tqs);
    const fraud_status = this.classifyFraudStatus(fraud_p);
    const bd = this.computeBudgetDecision(effective_score, fraud_p);

    return {
      vendor_id: raw.vendor_id,
      vendor_name: raw.vendor_name,
      campaign_id: raw.campaign_id,
      campaign_name: raw.campaign_name,
      geo_target: raw.geo_target,
      total_clicks: raw.total_clicks,
      days_active: raw.days_active,
      experiment_phase: raw.experiment_phase,
      budget_allocation_pct: raw.budget_allocation_pct,
      signals,
      fraud_signals,
      tqs,
      fraud_p,
      effective_score,
      quality_tier,
      fraud_status,
      budget_decision: bd.budget_decision,
      budget_decision_label: bd.budget_decision_label,
      budget_change_pct: bd.budget_change_pct,
      decision_reason: bd.decision_reason,
      ab_test_day: raw.ab_test_day,
      ab_test_control_vendor: null,
    };
  }

  scoreFromRequest(input: ScoreRequest): VendorScore {
    const raw: VendorRaw = {
      vendor_id: 'SIM-001',
      vendor_name: input.vendor_name,
      campaign_id: 'SIM-CAMPAIGN',
      campaign_name: 'Simulator',
      geo_target: 'US',
      total_clicks: input.total_clicks,
      unique_ips: input.unique_ips,
      in_geo_clicks: input.in_geo_clicks,
      unique_device_fps: input.unique_device_fps,
      click_timing_cov: input.click_timing_cov,
      bot_flagged_clicks: input.bot_flagged_clicks,
      max_clicks_per_60s: input.max_clicks_per_60s,
      max_single_ip_clicks: input.max_single_ip_clicks,
      device_fp_max_24h: input.device_fp_max_24h,
      scanner_clicks: input.scanner_clicks,
      days_active: 30,
      experiment_phase: 'active',
      ab_test_day: null,
      budget_allocation_pct: 0,
    };
    return this.scoreVendor(raw);
  }
}
