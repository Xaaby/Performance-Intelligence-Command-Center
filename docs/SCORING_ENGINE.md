# Scoring Engine — Formula Reference

## Overview

Two independent scoring layers. Both output continuous probability scores between 0.0 and 1.0. They are combined into a single Effective Score that drives all budget decisions.

## Layer 1: Traffic Quality Score (TQS)

### Formula

TQS = (0.30 × IP_diversity_score)
    + (0.25 × geo_relevance_score)
    + (0.20 × device_fp_uniqueness_score)
    + (0.15 × click_timing_variance_score)
    + (0.10 × bot_candidate_rate_score)

### Signal Definitions and Normalization

IP_diversity_score = unique_ips / total_clicks

- Clamped to 0.0–1.0
- Measures: what proportion of clicks came from distinct IP addresses
- High score = diverse IPs = human-like population behavior

geo_relevance_score = in_geo_clicks / total_clicks

- Clamped to 0.0–1.0
- Measures: what proportion of clicks originated from campaign target geography
- High score = traffic matches where the campaign is supposed to run

device_fp_uniqueness_score = unique_device_fps / total_clicks

- Clamped to 0.0–1.0
- Measures: device fingerprint diversity across the click pool
- High score = unique devices = real individual users

click_timing_variance_score = normalize(click_timing_cov)

- click_timing_cov is Coefficient of Variation of inter-click intervals
- Normalization: cov / 3.0, clamped to 0.0–1.0
- High CoV = irregular timing = human behavior
- Low CoV = metronomic regularity = automation

bot_candidate_rate_score = 1 - (bot_flagged_clicks / total_clicks)

- Clamped to 0.0–1.0
- Measures: proportion of clicks NOT matching known bot signatures
- High score = low bot rate = clean traffic

### TQS Thresholds

0.75 – 1.00  = High Quality    → Scale budget  
0.50 – 0.74  = Medium Quality  → Hold, continue monitoring  
0.30 – 0.49  = Low Quality     → Reduce budget -30%  
0.00 – 0.29  = Poor            → Suspend budget

## Layer 2: Fraud Probability Score (Fraud_P)

### Formula

Fraud_P = (0.30 × velocity_anomaly_score)
         + (0.25 × ip_concentration_score)
         + (0.20 × scanner_detection_score)
         + (0.15 × fp_clustering_score)
         + (0.10 × behavioral_regularity_score)

### Signal Definitions and Normalization

velocity_anomaly_score = clamp(max_clicks_per_60s / 500, 0.0, 1.0)

- Threshold: 500 clicks/minute = fully anomalous
- High score = burst clicking pattern = automated traffic

ip_concentration_score = clamp(max_single_ip_pct / 0.05, 0.0, 1.0)

- max_single_ip_pct = max_single_ip_clicks / total_clicks
- Threshold: any single IP above 5% of total = concentration risk

scanner_detection_score = clamp(scanner_clicks / (total_clicks * 0.05), 0.0, 1.0)

- Apple Mail Privacy Protection and inbox security scanners
- Above 5% scanner clicks = abnormal
- Note: scanner clicks are EXCLUDED from vendor fraud penalty in full system but included here to demonstrate detection capability

fp_clustering_score = clamp(device_fp_max_24h / 20, 0.0, 1.0)

- device_fp_max_24h = max times any single device FP appeared in 24 hours
- Threshold: 20 appearances from one device = clustering risk

behavioral_regularity_score = clamp(1 - (click_timing_cov / 3.0), 0.0, 1.0)

- Inverse of timing variance — metronomic regularity scores high here
- Low CoV = high regularity = fraud signal

### Fraud_P Thresholds and Actions

0.00 – 0.39  = No action          → Normal operation  
0.40 – 0.59  = Flag for review    → Human reviewer notification  
0.60 – 0.79  = Escalation         → Senior review, 24hr SLA  
0.80 – 1.00  = Auto-pause         → Budget suspended immediately

## Combined Score

Effective_Score = TQS × (1 − Fraud_P)

This is the final decision-driving score. A vendor with excellent TQS but high Fraud_P will be correctly demoted.

## Budget Decision Rules (Decision Engine)

Effective_Score ≥ 0.75  → Increase allocation +20%  
Effective_Score 0.50–0.74 → Hold  
Effective_Score 0.30–0.49 → Reduce allocation -30%  
Effective_Score < 0.30   → Suspend  
Fraud_P ≥ 0.80           → Emergency Pause (overrides score)

## Diversification Constraint

No single vendor may receive more than 30% of total campaign budget. If an increase would breach this ceiling, cap and redistribute to other top-tier vendors proportionally.

## Validated Examples (formula output — `backend` golden tests)

Vendor A: total_clicks=8000, unique_ips=7100, in_geo=6900, unique_fps=7200, cov=1.82, bot_flagged=120, max_clicks_60s=38, max_single_ip=18, fp_max_24h=4, scanner=95

→ TQS≈0.851, Fraud_P≈0.151, Effective≈0.723, Decision=Hold

Vendor B: total_clicks=10000, unique_ips=9200, in_geo=8600, unique_fps=9100, cov=1.74, bot_flagged=150, max_clicks_60s=780, max_single_ip=620, fp_max_24h=340, scanner=190

→ TQS≈0.859, Fraud_P≈0.818, Effective≈0.156, Decision=Emergency Pause

Vendor C (cold start preset; low scanner so Fraud_P stays exploratory): total_clicks=3200, unique_ips=2400, in_geo=2112, unique_fps=2592, cov=1.24, bot_flagged=224, max_clicks_60s=62, max_single_ip=29, fp_max_24h=6, scanner=11

→ TQS≈0.707, Fraud_P≈0.200, Effective≈0.566, Decision=Hold
