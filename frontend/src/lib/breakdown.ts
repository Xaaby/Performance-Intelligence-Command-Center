import type { ScoreRequest, VendorScore } from '../types/vendor.types';
import { FRAUD_WEIGHTS, TQS_WEIGHTS } from './scoring';

export type BreakdownRow = {
  signal: string;
  raw: string;
  normalized: number;
  weight: number;
  contribution: number;
};

function tqsRows(req: ScoreRequest, score: VendorScore): BreakdownRow[] {
  const t = Math.max(1, req.total_clicks);
  const ipDiv = req.unique_ips / t;
  const geo = req.in_geo_clicks / t;
  const fpU = req.unique_device_fps / t;
  const botRate = req.bot_flagged_clicks / t;
  return [
    {
      signal: 'IP diversity',
      raw: `${req.unique_ips.toLocaleString()} ÷ ${t.toLocaleString()} = ${ipDiv.toFixed(4)}`,
      normalized: score.signals.ip_diversity,
      weight: TQS_WEIGHTS.ip_diversity,
      contribution:
        TQS_WEIGHTS.ip_diversity * score.signals.ip_diversity,
    },
    {
      signal: 'Geo relevance',
      raw: `${req.in_geo_clicks.toLocaleString()} ÷ ${t.toLocaleString()} = ${geo.toFixed(4)}`,
      normalized: score.signals.geo_relevance,
      weight: TQS_WEIGHTS.geo_relevance,
      contribution:
        TQS_WEIGHTS.geo_relevance * score.signals.geo_relevance,
    },
    {
      signal: 'Device FP uniqueness',
      raw: `${req.unique_device_fps.toLocaleString()} ÷ ${t.toLocaleString()} = ${fpU.toFixed(4)}`,
      normalized: score.signals.device_fp_uniqueness,
      weight: TQS_WEIGHTS.device_fp_uniqueness,
      contribution:
        TQS_WEIGHTS.device_fp_uniqueness *
        score.signals.device_fp_uniqueness,
    },
    {
      signal: 'Click timing variance',
      raw: `CoV = ${req.click_timing_cov.toFixed(4)} → norm(cov÷3)`,
      normalized: score.signals.click_timing_variance,
      weight: TQS_WEIGHTS.click_timing_variance,
      contribution:
        TQS_WEIGHTS.click_timing_variance *
        score.signals.click_timing_variance,
    },
    {
      signal: 'Bot candidate rate',
      raw: `1 − ${req.bot_flagged_clicks}÷${t} = ${(1 - botRate).toFixed(4)}`,
      normalized: score.signals.bot_candidate_rate,
      weight: TQS_WEIGHTS.bot_candidate_rate,
      contribution:
        TQS_WEIGHTS.bot_candidate_rate * score.signals.bot_candidate_rate,
    },
  ];
}

function fraudRows(req: ScoreRequest, score: VendorScore): BreakdownRow[] {
  const t = Math.max(1, req.total_clicks);
  const maxIpPct = req.max_single_ip_clicks / t;
  return [
    {
      signal: 'Velocity anomaly',
      raw: `max/60s ${req.max_clicks_per_60s} ÷ 500`,
      normalized: score.fraud_signals.velocity_anomaly,
      weight: FRAUD_WEIGHTS.velocity_anomaly,
      contribution:
        FRAUD_WEIGHTS.velocity_anomaly *
        score.fraud_signals.velocity_anomaly,
    },
    {
      signal: 'IP concentration',
      raw: `max IP % ${maxIpPct.toFixed(4)} ÷ 0.05`,
      normalized: score.fraud_signals.ip_concentration,
      weight: FRAUD_WEIGHTS.ip_concentration,
      contribution:
        FRAUD_WEIGHTS.ip_concentration * score.fraud_signals.ip_concentration,
    },
    {
      signal: 'Scanner detection',
      raw: `${req.scanner_clicks} ÷ (5%·clicks)`,
      normalized: score.fraud_signals.scanner_detection,
      weight: FRAUD_WEIGHTS.scanner_detection,
      contribution:
        FRAUD_WEIGHTS.scanner_detection *
        score.fraud_signals.scanner_detection,
    },
    {
      signal: 'FP clustering',
      raw: `device_fp_max_24h ${req.device_fp_max_24h} ÷ 20`,
      normalized: score.fraud_signals.fp_clustering,
      weight: FRAUD_WEIGHTS.fp_clustering,
      contribution:
        FRAUD_WEIGHTS.fp_clustering * score.fraud_signals.fp_clustering,
    },
    {
      signal: 'Behavioral regularity',
      raw: `1 − CoV÷3 = 1 − ${req.click_timing_cov.toFixed(4)}÷3`,
      normalized: score.fraud_signals.behavioral_regularity,
      weight: FRAUD_WEIGHTS.behavioral_regularity,
      contribution:
        FRAUD_WEIGHTS.behavioral_regularity *
        score.fraud_signals.behavioral_regularity,
    },
  ];
}

export function buildBreakdownTables(
  req: ScoreRequest,
  score: VendorScore,
): { tqs: BreakdownRow[]; fraud: BreakdownRow[] } {
  return { tqs: tqsRows(req, score), fraud: fraudRows(req, score) };
}
