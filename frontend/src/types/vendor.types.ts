export interface VendorSignals {
  ip_diversity: number;
  geo_relevance: number;
  device_fp_uniqueness: number;
  click_timing_variance: number;
  bot_candidate_rate: number;
}

export interface FraudSignals {
  velocity_anomaly: number;
  ip_concentration: number;
  scanner_detection: number;
  fp_clustering: number;
  behavioral_regularity: number;
}

export type QualityTier = 'high' | 'medium' | 'low' | 'poor';
export type FraudStatus = 'clean' | 'review' | 'escalation' | 'auto_pause';
export type BudgetDecision =
  | 'scale_20'
  | 'hold'
  | 'reduce_30'
  | 'suspend'
  | 'emergency_pause';

export interface VendorScore {
  vendor_id: string;
  vendor_name: string;
  campaign_id: string;
  campaign_name: string;
  geo_target: string;
  total_clicks: number;
  days_active: number;
  experiment_phase: string;
  budget_allocation_pct: number;
  signals: VendorSignals;
  fraud_signals: FraudSignals;
  tqs: number;
  fraud_p: number;
  effective_score: number;
  quality_tier: QualityTier;
  fraud_status: FraudStatus;
  budget_decision: BudgetDecision;
  budget_decision_label: string;
  budget_change_pct: number;
  decision_reason: string;
  score_change_reason?: string;
  ab_test_day: number | null;
  ab_test_control_vendor: string | null;
}

export interface VendorsSummary {
  total_vendors: number;
  high_quality_count: number;
  medium_quality_count: number;
  low_quality_count: number;
  suspended_count: number;
  fraud_review_count: number;
  total_budget_at_risk: number;
}

export interface VendorsResponse {
  vendors: VendorScore[];
  summary: VendorsSummary;
  computed_at: string;
}

export interface ScoreRequest {
  vendor_name: string;
  total_clicks: number;
  unique_ips: number;
  in_geo_clicks: number;
  unique_device_fps: number;
  click_timing_cov: number;
  bot_flagged_clicks: number;
  max_clicks_per_60s: number;
  max_single_ip_clicks: number;
  device_fp_max_24h: number;
  scanner_clicks: number;
}

export interface ExperimentRecord {
  vendor_id: string;
  vendor_name: string;
  campaign_id: string;
  phase: 'ab_test';
  control_vendor_id: string;
  control_vendor_name: string;
  traffic_split: { control: 80; treatment: 20 };
  day_current: number;
  day_total: 14;
  primary_metric: 'effective_score_delta';
  current_treatment_score: number;
  current_control_score: number;
  score_delta: number;
  p_value: number | null;
  status: 'running' | 'significant' | 'inconclusive';
}

export interface BanditAllocation {
  vendor_id: string;
  vendor_name: string;
  allocation_pct: number;
  confidence: 'high' | 'medium' | 'low';
  trend: 'up' | 'stable' | 'down';
}

export interface ColdStartVendor {
  vendor_id: string;
  vendor_name: string;
  days_active: number;
  clicks_so_far: number;
  current_score: number;
  prior_score: 0.5;
  day7_review_status: 'pending' | 'passed' | 'failed';
}

export interface ExperimentsResponse {
  experiments: ExperimentRecord[];
  bandit_allocations: BanditAllocation[];
  cold_start_vendors: ColdStartVendor[];
}

export type ClickType = 'real' | 'bot' | 'scanner';

export interface RedirectVendorStats {
  vendor_id: string;
  vendor_name: string;
  clicks_last_60s: number;
  real_clicks: number;
  bot_clicks: number;
  bot_percentage: number;
}

export interface RedirectStatsResponse {
  vendors: RedirectVendorStats[];
  total_clicks_last_60s: number;
  last_updated: string;
}

export interface RedirectEvent {
  id: string;
  vendor_id: string;
  vendor_name: string;
  campaign_id: string;
  ip_address: string;
  user_agent: string;
  geo_region: string;
  timestamp: number;
  click_type: ClickType;
  created_at: string;
}

export interface LiveVendorScoreUpdate {
  vendor_id: string;
  previous_effective_score: number;
  current_effective_score: number;
  score_delta: number;
  change_reason: string;
  changed_at: string;
}

export type DashboardFilter = 'all' | 'high_quality' | 'fraud_alert' | 'cold_start';
