# API Contract — Backend to Frontend

Base URL: `http://localhost:3001/api`

## Endpoints

### GET /api/vendors

Returns all vendors with computed scores.

**Response shape:**

```typescript
{
  vendors: VendorScore[]
  summary: {
    total_vendors: number
    high_quality_count: number
    medium_quality_count: number
    low_quality_count: number
    suspended_count: number
    fraud_review_count: number
    total_budget_at_risk: number  // sum of budget_allocation_pct for auto-paused / suspended / emergency-pause vendors, capped at 100
  }
  computed_at: string  // ISO timestamp
}
```

**VendorScore** shape:

```typescript
{
  vendor_id: string
  vendor_name: string
  campaign_id: string
  campaign_name: string
  geo_target: string
  total_clicks: number
  days_active: number
  experiment_phase: string
  budget_allocation_pct: number

  // Raw signal values
  signals: {
    ip_diversity: number        // unique_ips / total_clicks
    geo_relevance: number       // in_geo_clicks / total_clicks
    device_fp_uniqueness: number
    click_timing_variance: number
    bot_candidate_rate: number
  }

  // Fraud signals
  fraud_signals: {
    velocity_anomaly: number
    ip_concentration: number
    scanner_detection: number
    fp_clustering: number
    behavioral_regularity: number
  }

  // Computed scores
  tqs: number              // 0.0–1.0
  fraud_p: number          // 0.0–1.0
  effective_score: number  // TQS × (1 − Fraud_P)

  // Classifications
  quality_tier: "high" | "medium" | "low" | "poor"
  fraud_status: "clean" | "review" | "escalation" | "auto_pause"

  // Decision
  budget_decision: "scale_20" | "hold" | "reduce_30" | "suspend" | "emergency_pause"
  budget_decision_label: string  // Human-readable e.g. "Scale +20%"
  budget_change_pct: number      // +20, 0, -30, -100
  decision_reason: string        // One sentence explanation

  // Experiment
  ab_test_day: number | null
  ab_test_control_vendor: string | null
}
```

---

### POST /api/score

Scores a single vendor from raw input. Used by the simulator.

**Request body:**

```typescript
{
  vendor_name: string
  total_clicks: number
  unique_ips: number
  in_geo_clicks: number
  unique_device_fps: number
  click_timing_cov: number
  bot_flagged_clicks: number
  max_clicks_per_60s: number
  max_single_ip_clicks: number
  device_fp_max_24h: number
  scanner_clicks: number
}
```

**Response:** `VendorScore` (same shape as above). For simulator responses, `vendor_id` = `"SIM-001"`.

---

### GET /api/experiments

Returns experiment engine state.

**Response:**

```typescript
{
  experiments: ExperimentRecord[]
  bandit_allocations: BanditAllocation[]
  cold_start_vendors: ColdStartVendor[]
}
```

**ExperimentRecord:**

```typescript
{
  vendor_id: string
  vendor_name: string
  campaign_id: string
  phase: "ab_test"
  control_vendor_id: string
  control_vendor_name: string
  traffic_split: { control: 80, treatment: 20 }
  day_current: number
  day_total: 14
  primary_metric: "effective_score_delta"
  current_treatment_score: number
  current_control_score: number
  score_delta: number
  p_value: number | null
  status: "running" | "significant" | "inconclusive"
}
```

**BanditAllocation:**

```typescript
{
  vendor_id: string
  vendor_name: string
  allocation_pct: number
  confidence: "high" | "medium" | "low"
  trend: "up" | "stable" | "down"
}
```

**ColdStartVendor:**

```typescript
{
  vendor_id: string
  vendor_name: string
  days_active: number
  clicks_so_far: number
  current_score: number
  prior_score: 0.50
  day7_review_status: "pending" | "passed" | "failed"
}
```

---

### GET /api/health

Returns `{ status: "ok", data_loaded: boolean, vendor_count: number }`.

## CORS

Backend must allow requests from `http://localhost:5173`.
