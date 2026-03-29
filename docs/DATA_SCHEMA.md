# Data Schema Reference

## vendors.csv — Column Definitions

This file lives at `backend/data/vendors.csv` and is loaded at startup. Each row represents one vendor's aggregated performance over a 7-day rolling window.

| Column                 | Type    | Description                                              |
| ---------------------- | ------- | -------------------------------------------------------- |
| vendor_id              | string  | Unique ID e.g. V001–V025                                 |
| vendor_name            | string  | Realistic ad network name                                |
| campaign_id            | string  | e.g. CAM-AUTO-TX-001                                     |
| campaign_name          | string  | e.g. Honda Dallas Q1 2026                                |
| geo_target             | string  | US state code e.g. TX, FL, GA                            |
| total_clicks           | integer | Total clicks in 7-day window                             |
| unique_ips             | integer | Unique hashed IP count                                   |
| in_geo_clicks          | integer | Clicks from target geography                             |
| unique_device_fps      | integer | Unique device fingerprint count                          |
| click_timing_cov       | float   | Coefficient of variation of inter-click intervals        |
| bot_flagged_clicks     | integer | Clicks matching known bot signatures                     |
| max_clicks_per_60s     | integer | Maximum clicks from vendor in any 60-second window      |
| max_single_ip_clicks   | integer | Highest click count from a single IP                     |
| device_fp_max_24h      | integer | Most appearances of one device FP in 24 hours            |
| scanner_clicks         | integer | Clicks identified as email scanner traffic             |
| days_active            | integer | How long vendor has been in system (for cold start logic) |
| experiment_phase       | string  | cold_start \| ab_test \| bandit \| paused \| active      |
| ab_test_day            | integer | Current day in A/B test (null if not in ab_test phase)   |
| budget_allocation_pct  | float   | Current % of campaign budget allocated to this vendor    |

## Vendor Archetypes (for data generation)

Generate 25 vendors distributed as follows:

### ARCHETYPE 1 — High Quality (6 vendors)

- total_clicks: 6000–14000
- unique_ips / total_clicks: 0.82–0.95
- in_geo_clicks / total_clicks: 0.80–0.92
- unique_device_fps / total_clicks: 0.85–0.96
- click_timing_cov: 1.6–2.4
- bot_flagged / total_clicks: 0.005–0.02
- max_clicks_per_60s: 20–80
- max_single_ip_clicks: 8–25
- device_fp_max_24h: 2–6
- scanner_clicks / total_clicks: 0.008–0.015
- days_active: 30–180
- experiment_phase: bandit or active
- budget_allocation_pct: 8–18

### ARCHETYPE 2 — Medium Quality (10 vendors)

- total_clicks: 3000–9000
- unique_ips / total_clicks: 0.60–0.81
- in_geo_clicks / total_clicks: 0.58–0.78
- unique_device_fps / total_clicks: 0.62–0.82
- click_timing_cov: 0.9–1.6
- bot_flagged / total_clicks: 0.02–0.06
- max_clicks_per_60s: 80–250
- max_single_ip_clicks: 30–90
- device_fp_max_24h: 7–18
- scanner_clicks / total_clicks: 0.015–0.035
- days_active: 14–90
- experiment_phase: ab_test or bandit
- budget_allocation_pct: 3–8

### ARCHETYPE 3 — Low Quality (4 vendors)

- total_clicks: 2000–6000
- unique_ips / total_clicks: 0.35–0.58
- in_geo_clicks / total_clicks: 0.30–0.55
- unique_device_fps / total_clicks: 0.38–0.60
- click_timing_cov: 0.4–0.9
- bot_flagged / total_clicks: 0.06–0.15
- max_clicks_per_60s: 200–400
- max_single_ip_clicks: 100–250
- device_fp_max_24h: 20–60
- days_active: 7–45
- experiment_phase: ab_test or active
- budget_allocation_pct: 1–4

### ARCHETYPE 4 — Hidden Fraud (3 vendors — THE KEY DEMO SCENARIO)

- TQS signals look decent (0.60–0.80) but Fraud_P is high (0.70–0.90)
- total_clicks: 7000–12000
- unique_ips / total_clicks: 0.75–0.88 (looks good)
- in_geo_clicks / total_clicks: 0.72–0.85 (looks good)
- unique_device_fps / total_clicks: 0.78–0.90 (looks good)
- click_timing_cov: 1.4–1.8 (looks acceptable)
- bot_flagged / total_clicks: 0.01–0.03 (looks clean)
- BUT: max_clicks_per_60s: 600–900 (triggers velocity anomaly)
- BUT: max_single_ip_clicks: 500–900 (triggers IP concentration)
- BUT: device_fp_max_24h: 250–450 (triggers FP clustering)
- days_active: 15–45
- experiment_phase: active (was never caught before)
- budget_allocation_pct: 6–14 (was getting real budget — the danger)

### ARCHETYPE 5 — Cold Start (2 vendors)

- total_clicks: 400–1800
- All signals neutral to slightly positive
- click_timing_cov: 1.0–1.5
- days_active: 1–6
- experiment_phase: cold_start
- budget_allocation_pct: 5 (fixed cold start carve-out)
