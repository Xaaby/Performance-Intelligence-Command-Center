import os

import numpy as np
import pandas as pd

rng = np.random.default_rng(42)

COLUMNS = [
    "vendor_id", "vendor_name", "campaign_id", "campaign_name", "geo_target",
    "total_clicks", "unique_ips", "in_geo_clicks", "unique_device_fps",
    "click_timing_cov", "bot_flagged_clicks", "max_clicks_per_60s",
    "max_single_ip_clicks", "device_fp_max_24h", "scanner_clicks",
    "days_active", "experiment_phase", "ab_test_day", "budget_allocation_pct",
]

rows = []
archetypes = []  # parallel list tracking archetype label per row


# ── ARCHETYPE 1 — High Quality (12 vendors, TX) ────────────────────────────
hq_names = [
    "TrafficLeader Pro", "AutoAudience Network", "PrecisionDrive Media",
    "MotorClick Partners", "DriveReach Digital", "AutoTarget Solutions",
    "VelocityDrive Media", "Pinnacle Auto Reach", "NorthStar Traffic",
    "PrimeLane Partners", "RouteLift Digital", "ApexAuto Collective",
]
for i, name in enumerate(hq_names, start=1):
    tc = int(rng.integers(6000, 14001))
    rows.append({
        "vendor_id": f"VND-{i:03d}",
        "vendor_name": name,
        "campaign_id": f"CAM-AUTO-TX-{i:03d}",
        "campaign_name": f"TX Auto Campaign {i}",
        "geo_target": "TX",
        "total_clicks": tc,
        "unique_ips": int(tc * rng.uniform(0.82, 0.95)),
        "in_geo_clicks": int(tc * rng.uniform(0.80, 0.92)),
        "unique_device_fps": int(tc * rng.uniform(0.85, 0.96)),
        "click_timing_cov": round(float(rng.uniform(1.8, 2.6)), 3),
        "bot_flagged_clicks": int(tc * rng.uniform(0.005, 0.02)),
        "max_clicks_per_60s": int(rng.integers(6, 20)),
        "max_single_ip_clicks": int(rng.integers(2, 8)),
        "device_fp_max_24h": int(rng.integers(1, 4)),
        "scanner_clicks": int(tc * rng.uniform(0.002, 0.007)),
        "days_active": int(rng.integers(30, 181)),
        "experiment_phase": "bandit",
        "ab_test_day": None,
        "budget_allocation_pct": round(float(rng.uniform(2.0, 4.0)), 1),
    })
    archetypes.append("High Quality")


# ── ARCHETYPE 2 — Medium Quality (18 vendors, FL) ──────────────────────────
mq_names = [
    "BroadReach Auto", "ClickStream Media", "AdVenture Auto",
    "DealerConnect", "MotorMedia Group", "AutoFlow Network",
    "DriveClick Solutions", "ReachAuto Partners",
    "CampaignPulse Media", "AutoSpark Digital", "MarketLane Auto",
    "PulseDrive Ads", "NextRoad Media", "TriState Reach",
    "VectorAuto Network", "HorizonClick Partners", "SummitMotor Media", "BlueOrbit Auto",
]
for i, name in enumerate(mq_names, start=1):
    vid = 12 + i  # VND-013 … VND-030
    tc = int(rng.integers(3000, 9001))
    phase = "ab_test" if i % 2 == 1 else "bandit"
    ab_day = int(rng.integers(1, 14)) if phase == "ab_test" else None
    rows.append({
        "vendor_id": f"VND-{vid:03d}",
        "vendor_name": name,
        "campaign_id": f"CAM-AUTO-FL-{i:03d}",
        "campaign_name": f"FL Auto Campaign {i}",
        "geo_target": "FL",
        "total_clicks": tc,
        "unique_ips": int(tc * rng.uniform(0.64, 0.84)),
        "in_geo_clicks": int(tc * rng.uniform(0.62, 0.82)),
        "unique_device_fps": int(tc * rng.uniform(0.66, 0.85)),
        "click_timing_cov": round(float(rng.uniform(1.1, 1.8)), 3),
        "bot_flagged_clicks": int(tc * rng.uniform(0.02, 0.06)),
        "max_clicks_per_60s": int(rng.integers(35, 91)),
        "max_single_ip_clicks": int(rng.integers(6, 20)),
        "device_fp_max_24h": int(rng.integers(2, 7)),
        "scanner_clicks": int(tc * rng.uniform(0.005, 0.013)),
        "days_active": int(rng.integers(14, 91)),
        "experiment_phase": phase,
        "ab_test_day": ab_day,
        "budget_allocation_pct": round(float(rng.uniform(0.9, 1.7)), 1),
    })
    archetypes.append("Medium Quality")


# ── ARCHETYPE 3 — Low Quality (8 vendors, GA) ──────────────────────────────
lq_names = [
    "ClickFarm Direct", "BudgetReach Auto",
    "VolumeClick Network", "TrafficBoost Pro",
    "LeadBurst Digital", "QuickRoute Ads", "WideNet Auto", "DeltaReach Media",
]
for i, name in enumerate(lq_names, start=1):
    vid = 30 + i  # VND-031 … VND-038
    tc = int(rng.integers(2000, 6001))
    rows.append({
        "vendor_id": f"VND-{vid:03d}",
        "vendor_name": name,
        "campaign_id": f"CAM-AUTO-GA-{i:03d}",
        "campaign_name": f"GA Auto Campaign {i}",
        "geo_target": "GA",
        "total_clicks": tc,
        "unique_ips": int(tc * rng.uniform(0.35, 0.58)),
        "in_geo_clicks": int(tc * rng.uniform(0.30, 0.55)),
        "unique_device_fps": int(tc * rng.uniform(0.38, 0.60)),
        "click_timing_cov": round(float(rng.uniform(0.4, 0.9)), 3),
        "bot_flagged_clicks": int(tc * rng.uniform(0.06, 0.15)),
        "max_clicks_per_60s": int(rng.integers(55, 121)),
        "max_single_ip_clicks": int(rng.integers(6, 20)),
        "device_fp_max_24h": int(rng.integers(3, 8)),
        "scanner_clicks": int(tc * rng.uniform(0.005, 0.015)),
        "days_active": int(rng.integers(7, 46)),
        "experiment_phase": "ab_test",
        "ab_test_day": int(rng.integers(1, 9)),
        "budget_allocation_pct": round(float(rng.uniform(0.8, 1.8)), 1),
    })
    archetypes.append("Low Quality")


# ── ARCHETYPE 4 — Suspended Poor Quality (5 vendors, GA) ───────────────────
sp_names = [
    "LowSignal Reach", "SparseIntent Media", "ThinGeo Traffic",
    "NoisyRoute Partners", "QualityDrop Network",
]
for i, name in enumerate(sp_names, start=1):
    vid = 38 + i  # VND-039 … VND-043
    tc = int(rng.integers(1800, 4201))
    rows.append({
        "vendor_id": f"VND-{vid:03d}",
        "vendor_name": name,
        "campaign_id": f"CAM-AUTO-GA-{8 + i:03d}",
        "campaign_name": f"GA Auto Campaign {8 + i}",
        "geo_target": "GA",
        "total_clicks": tc,
        "unique_ips": int(tc * rng.uniform(0.24, 0.38)),
        "in_geo_clicks": int(tc * rng.uniform(0.22, 0.35)),
        "unique_device_fps": int(tc * rng.uniform(0.27, 0.40)),
        "click_timing_cov": round(float(rng.uniform(0.35, 0.75)), 3),
        "bot_flagged_clicks": int(tc * rng.uniform(0.10, 0.22)),
        "max_clicks_per_60s": int(rng.integers(80, 160)),
        "max_single_ip_clicks": int(rng.integers(14, 36)),
        "device_fp_max_24h": int(rng.integers(5, 12)),
        "scanner_clicks": int(tc * rng.uniform(0.01, 0.03)),
        "days_active": int(rng.integers(8, 31)),
        "experiment_phase": "active",
        "ab_test_day": None,
        "budget_allocation_pct": round(float(rng.uniform(1.2, 2.0)), 1),
    })
    archetypes.append("Suspended Poor Quality")


# ── ARCHETYPE 5 — Hidden Fraud (4 vendors, TX) ─────────────────────────────
hf_names = [
    "PhantomReach Media", "ShadowClick Network", "GhostTraffic Pro", "CovertTraffic Pro",
]
for i, name in enumerate(hf_names, start=1):
    vid = 43 + i  # VND-044 … VND-047
    tc = int(rng.integers(7000, 12001))
    rows.append({
        "vendor_id": f"VND-{vid:03d}",
        "vendor_name": name,
        "campaign_id": f"CAM-AUTO-TX-{12 + i:03d}",
        "campaign_name": f"TX Auto Campaign {12 + i}",
        "geo_target": "TX",
        "total_clicks": tc,
        "unique_ips": int(tc * rng.uniform(0.75, 0.88)),       # looks clean
        "in_geo_clicks": int(tc * rng.uniform(0.72, 0.85)),    # looks clean
        "unique_device_fps": int(tc * rng.uniform(0.78, 0.90)),# looks clean
        "click_timing_cov": round(float(rng.uniform(1.4, 1.8)), 3),  # acceptable
        "bot_flagged_clicks": int(tc * rng.uniform(0.01, 0.03)),     # looks clean
        "max_clicks_per_60s": int(rng.integers(820, 951)),    # FRAUD SIGNAL
        "max_single_ip_clicks": int(rng.integers(650, 1101)), # FRAUD SIGNAL
        "device_fp_max_24h": int(rng.integers(340, 501)),     # FRAUD SIGNAL
        "scanner_clicks": int(tc * rng.uniform(0.015, 0.028)),
        "days_active": int(rng.integers(15, 46)),
        "experiment_phase": "active",
        "ab_test_day": None,
        "budget_allocation_pct": round(float(rng.uniform(2.1, 2.9)), 1),
    })
    archetypes.append("Hidden Fraud")


# ── ARCHETYPE 6 — Cold Start (3 vendors, OH) ───────────────────────────────
cs_names = ["NewReach Digital", "FreshClick Auto", "PilotLane Media"]
for i, name in enumerate(cs_names, start=1):
    vid = 47 + i  # VND-048 … VND-050
    tc = int(rng.integers(400, 1801))
    rows.append({
        "vendor_id": f"VND-{vid:03d}",
        "vendor_name": name,
        "campaign_id": f"CAM-AUTO-OH-{i:03d}",
        "campaign_name": f"OH Auto Campaign {i}",
        "geo_target": "OH",
        "total_clicks": tc,
        "unique_ips": int(tc * rng.uniform(0.65, 0.80)),
        "in_geo_clicks": int(tc * rng.uniform(0.60, 0.75)),
        "unique_device_fps": int(tc * rng.uniform(0.68, 0.82)),
        "click_timing_cov": round(float(rng.uniform(1.0, 1.5)), 3),
        "bot_flagged_clicks": int(tc * rng.uniform(0.01, 0.04)),
        "max_clicks_per_60s": int(rng.integers(15, 61)),
        "max_single_ip_clicks": int(rng.integers(5, 21)),
        "device_fp_max_24h": int(rng.integers(1, 6)),
        "scanner_clicks": int(tc * rng.uniform(0.005, 0.02)),
        "days_active": int(rng.integers(1, 7)),
        "experiment_phase": "cold_start",
        "ab_test_day": None,
        "budget_allocation_pct": 5.0,
    })
    archetypes.append("Cold Start")


# ── Build DataFrame ─────────────────────────────────────────────────────────
df = pd.DataFrame(rows, columns=COLUMNS)
archetype_series = pd.Series(archetypes, index=df.index)

# ── Compute metrics ──────────────────────────────────────────────────────────
df["TQS"] = (
    0.30 * df["unique_ips"] / df["total_clicks"]
    + 0.25 * df["in_geo_clicks"] / df["total_clicks"]
    + 0.20 * df["unique_device_fps"] / df["total_clicks"]
    + 0.15 * (df["click_timing_cov"] / 3.0).clip(upper=1.0)
    + 0.10 * (1 - df["bot_flagged_clicks"] / df["total_clicks"])
)

df["Fraud_P"] = (
    0.30 * (df["max_clicks_per_60s"] / 500).clip(upper=1.0)
    + 0.25 * ((df["max_single_ip_clicks"] / df["total_clicks"]) / 0.05).clip(upper=1.0)
    + 0.20 * ((df["scanner_clicks"] / df["total_clicks"]) / 0.05).clip(upper=1.0)
    + 0.15 * (df["device_fp_max_24h"] / 20).clip(upper=1.0)
    + 0.10 * (1 - df["click_timing_cov"] / 3.0).clip(lower=0.0)
)

df["Effective_Score"] = df["TQS"] * (1 - df["Fraud_P"])

conditions = [
    df["Fraud_P"] >= 0.80,
    df["Effective_Score"] >= 0.75,
    df["Effective_Score"] >= 0.50,
    df["Effective_Score"] >= 0.30,
]
choices = ["EMERGENCY PAUSE", "Scale +20%", "Hold", "Reduce -30%"]
df["Decision"] = np.select(conditions, choices, default="Suspend")

# ── Validation warnings ──────────────────────────────────────────────────────
hq_mask = archetype_series == "High Quality"
hf_mask = archetype_series == "Hidden Fraud"

warnings_found = False

if df.loc[hq_mask, "TQS"].lt(0.75).any():
    bad = df.loc[hq_mask & df["TQS"].lt(0.75), "vendor_name"].tolist()
    print(f"WARNING: High Quality vendor(s) with TQS < 0.75: {bad}")
    warnings_found = True

if df.loc[hf_mask, "Fraud_P"].lt(0.65).any():
    bad = df.loc[hf_mask & df["Fraud_P"].lt(0.65), "vendor_name"].tolist()
    print(f"WARNING: Hidden Fraud vendor(s) with Fraud_P < 0.65: {bad}")
    warnings_found = True

if (df["unique_ips"] > df["total_clicks"]).any():
    bad = df.loc[df["unique_ips"] > df["total_clicks"], "vendor_name"].tolist()
    print(f"WARNING: Internal consistency error — unique_ips > total_clicks: {bad}")
    warnings_found = True

if (df["max_single_ip_clicks"] > df["total_clicks"] * 0.5).any():
    bad = df.loc[df["max_single_ip_clicks"] > df["total_clicks"] * 0.5, "vendor_name"].tolist()
    print(f"NOTE: max_single_ip_clicks > 50% of total_clicks (expected for Hidden Fraud): {bad}")

if not warnings_found:
    print("All validation checks passed.")

# ── Print validation table ───────────────────────────────────────────────────
val = df[["vendor_name", "TQS", "Fraud_P", "Effective_Score", "Decision"]].copy()
val.insert(1, "archetype", archetype_series.values)
val["TQS"] = val["TQS"].round(4)
val["Fraud_P"] = val["Fraud_P"].round(4)
val["Effective_Score"] = val["Effective_Score"].round(4)

pd.set_option("display.max_rows", 30)
pd.set_option("display.width", 130)
pd.set_option("display.max_colwidth", 26)
print()
print(val.to_string(index=False))
print()

decision_counts = df["Decision"].value_counts().to_dict()
print("Decision counts:", decision_counts)

# ── Normalize budget % so totals ≈ 100 (cold start vendors stay at 5% each) ─
cold_mask = df["experiment_phase"] == "cold_start"
n_cold = int(cold_mask.sum())
cold_total = 5.0 * n_cold
remainder = 100.0 - cold_total
other_mask = ~cold_mask
other_sum = float(df.loc[other_mask, "budget_allocation_pct"].sum())
if other_sum > 0 and remainder > 0:
    scaled = (df.loc[other_mask, "budget_allocation_pct"] / other_sum * remainder).round(1)
    df.loc[other_mask, "budget_allocation_pct"] = scaled
df.loc[cold_mask, "budget_allocation_pct"] = 5.0
drift = round(100.0 - float(df["budget_allocation_pct"].sum()), 1)
if drift != 0.0:
    adj_idx = df.loc[other_mask].index[-1]
    df.loc[adj_idx, "budget_allocation_pct"] = round(
        float(df.loc[adj_idx, "budget_allocation_pct"]) + drift, 1
    )

# ── Save CSV (without derived metric columns) ────────────────────────────────
_here = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(_here, "vendors.csv")
target_path = csv_path
try:
    df[COLUMNS].to_csv(csv_path, index=False)
except PermissionError:
    target_path = os.path.join(_here, "vendors.generated.csv")
    df[COLUMNS].to_csv(target_path, index=False)
    print("WARNING: vendors.csv is locked; wrote vendors.generated.csv instead.")

print(f"vendors.csv  -> {target_path}")
print("SUCCESS: vendors.csv generated with 50 vendors")
