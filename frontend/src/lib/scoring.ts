import type { ScoreRequest } from '../types/vendor.types';

/** Weights from docs/SCORING_ENGINE.md — used for simulator breakdown tables */
export const TQS_WEIGHTS = {
  ip_diversity: 0.3,
  geo_relevance: 0.25,
  device_fp_uniqueness: 0.2,
  click_timing_variance: 0.15,
  bot_candidate_rate: 0.1,
} as const;

export const FRAUD_WEIGHTS = {
  velocity_anomaly: 0.3,
  ip_concentration: 0.25,
  scanner_detection: 0.2,
  fp_clustering: 0.15,
  behavioral_regularity: 0.1,
} as const;

export type VendorPresetKey = 'A' | 'B' | 'C';

/** Validated examples from SCORING_ENGINE.md */
export const VENDOR_PRESETS: Record<VendorPresetKey, ScoreRequest> = {
  A: {
    vendor_name: 'Vendor A (Clean)',
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
  },
  B: {
    vendor_name: 'Vendor B (Fraud)',
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
  },
  C: {
    vendor_name: 'Vendor C (New)',
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
  },
};

export function isHiddenFraudArchetype(v: {
  tqs: number;
  fraud_p: number;
}): boolean {
  return v.fraud_p >= 0.65 && v.tqs >= 0.55;
}
