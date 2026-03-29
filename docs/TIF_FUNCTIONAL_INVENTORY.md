# Traffic Intelligence Framework — What Is Built

**As of 2026-03-29, the Traffic Intelligence Framework has 9 working backend endpoints, 26 interactive frontend features (3 cosmetic), and 50 vendors scored in real time.**

---

## SECTION A: BACKEND — WHAT THE API ACTUALLY DOES

### Endpoint 1 — GET /api/health

- **Receives:** Nothing
- **Returns:** `{ status: "ok", data_loaded: boolean, vendor_count: number }`
- **Business logic:** Reads vendor count from DataLoaderService in-memory store
- **Data source:** In-memory (loaded from vendors.csv at startup)
- **Called by:** Startup health checks; not polled by frontend

---

### Endpoint 2 — GET /api/vendors

- **Receives:** Nothing
- **Returns:** `{ vendors: VendorScore[], summary: VendorsSummary, computed_at: string }`
- **Business logic:** Returns all 50 scored vendors. The `summary` object contains: `total_vendors`, `high_quality_count`, `medium_quality_count`, `low_quality_count`, `suspended_count`, `fraud_review_count`, and `total_budget_at_risk` (sum of `budget_allocation_pct` for vendors with `auto_pause`, `emergency_pause`, or `suspend` decisions, capped at 100). The `computed_at` timestamp updates any time a live score mutation occurs.
- **Data source:** In-memory scored vendor array; initially loaded from vendors.csv at startup
- **Called by:** Frontend `useVendors` hook (polls every 30 seconds); `ReallocationView` uses the same data passed via props

---

### Endpoint 3 — GET /api/vendors/live-updates

- **Receives:** Nothing
- **Returns:** Array of `LiveVendorScoreUpdate` objects from the last 60 seconds: `{ vendor_id, previous_effective_score, current_effective_score, score_delta, change_reason, changed_at }`
- **Business logic:** Returns the pruned `recentUpdates` buffer in VendorsService. Entries older than 60 seconds are discarded on each read. Only populated when `applyLiveFraudSignals` is called (triggered by redirect layer).
- **Data source:** In-memory circular buffer (last 60 seconds)
- **Called by:** Frontend `useLiveFeed` hook (polls every 5 seconds)

---

### Endpoint 4 — POST /api/score

- **Receives:** `ScoreRequest` body with 11 fields: `vendor_name`, `total_clicks`, `unique_ips`, `in_geo_clicks`, `unique_device_fps`, `click_timing_cov`, `bot_flagged_clicks`, `max_clicks_per_60s`, `max_single_ip_clicks`, `device_fp_max_24h`, `scanner_clicks`
- **Returns:** Full `VendorScore` object with `vendor_id = "SIM-001"` and `experiment_phase = "active"`
- **Business logic:** Wraps input into a `VendorRaw` struct, runs `scoreVendor()` through the full two-layer pipeline, returns the scored result. Does not mutate in-memory vendor state.
- **Data source:** Stateless — operates only on the provided input values
- **Called by:** Frontend `SimulatorView` with 300ms debounce on every slider change

---

### Endpoint 5 — GET /api/experiments

- **Receives:** Nothing
- **Returns:** `{ experiments: ExperimentRecord[], bandit_allocations: BanditAllocation[], cold_start_vendors: ColdStartVendor[] }`
- **Business logic:**
  - `experiments`: filters vendors with `experiment_phase === "ab_test"`. For each, looks up the control partner (same geo, lexicographically smallest vendor_id). Computes `score_delta`. Sets `p_value = 0.03` if `ab_test_day >= 10 AND score_delta > 0.1`, else `0.12`. Status is `significant` if `p_value === 0.03`, `inconclusive` if day >= 14, else `running`. Traffic split is hardcoded `{ control: 80, treatment: 20 }`.
  - `bandit_allocations`: filters vendors with `experiment_phase === "bandit"`. Confidence is `high` if `effective_score >= 0.72`, `medium` if `>= 0.52`, else `low`. Trend is `up` if `>= 0.62`, `down` if `< 0.42`, else `stable`.
  - `cold_start_vendors`: filters vendors with `experiment_phase === "cold_start"`. `day7_review_status` is `passed` if `days_active >= 7 AND effective_score >= 0.45`, `failed` if `days_active >= 7` but score is lower, else `pending`. `prior_score` is hardcoded `0.5`.
- **Data source:** In-memory scored vendor array
- **Called by:** Frontend `useExperiments` hook (fetches once on mount)

---

### Endpoint 6 — POST /api/redirect/click

- **Receives:** `RedirectClickRequest` body: `vendor_id`, `campaign_id`, `ip_address`, `user_agent`, `geo_region`, `timestamp`, `click_type` (`"real" | "bot" | "scanner"`)
- **Returns:** `{ received: true, click_id: string, vendor_id: string }`
- **Business logic:**
  1. Inserts click event into SQLite `click_events` table with a new UUID
  2. Increments an in-memory click counter for the vendor
  3. If counter modulo 50 === 0 OR if the 60-second window for that vendor exceeds 200 total clicks: calls `recomputeVendorFromLiveWindow(vendor_id)`
  4. `recomputeVendorFromLiveWindow` queries SQLite for the last 60 seconds of clicks; computes velocity (total/500), ip_concentration (top_ip_clicks/total / 0.05), and bot_percentage. If any of these exceeds threshold (velocity > 0.8, ip_concentration > 1, or bot_pct > 0.4), calls `applyLiveFraudSignals` on VendorsService to mutate the in-memory vendor score.
- **Data source:** Writes to SQLite `clicks.db`; reads from in-memory vendor index for score mutations
- **Called by:** `simulate_clicks.js` script (not by frontend)

---

### Endpoint 7 — GET /api/redirect/stats

- **Receives:** Nothing
- **Returns:** `RedirectStatsResponse`: `{ vendors: RedirectVendorStats[], total_clicks_last_60s, last_updated }`. Each `RedirectVendorStats` has: `vendor_id`, `vendor_name`, `clicks_last_60s`, `real_clicks`, `bot_clicks`, `bot_percentage`.
- **Business logic:** Queries SQLite for all click events in the last 60 seconds, groups by `vendor_id`, counts total/real/bot. Merges with vendor name index.
- **Data source:** SQLite `clicks.db`
- **Called by:** Frontend `useLiveFeed` hook (polls every 3 seconds)

---

### Endpoint 8 — GET /api/redirect/events

- **Receives:** Optional query params `vendor_id` (string) and `limit` (number, default 20, max 200)
- **Returns:** Array of `RedirectEvent` objects ordered by timestamp DESC: `{ id, vendor_id, vendor_name, campaign_id, ip_address, user_agent, geo_region, timestamp, click_type, created_at }`
- **Business logic:** If `vendor_id` is provided, filters to that vendor. Merges vendor name from in-memory index.
- **Data source:** SQLite `clicks.db`
- **Called by:** Frontend `useLiveFeed` hook (polls every 2 seconds, fetches last 10 events)

---

### Endpoint 9 — GET /api/redirect/health

- **Receives:** Nothing
- **Returns:** `{ status: "ok", total_clicks_stored: number }`
- **Business logic:** `SELECT COUNT(*) FROM click_events`
- **Data source:** SQLite `clicks.db`
- **Called by:** Not called by frontend; available for diagnostic use

---

### The Scoring Engine

#### TQS Formula (as implemented in `scoring.service.ts:177`)

```
TQS = 0.30 × ip_diversity
    + 0.25 × geo_relevance
    + 0.20 × device_fp_uniqueness
    + 0.15 × click_timing_variance
    + 0.10 × bot_candidate_rate
```

Signal derivations (all clamped to [0, 1]):
- `ip_diversity` = `unique_ips / total_clicks`
- `geo_relevance` = `in_geo_clicks / total_clicks`
- `device_fp_uniqueness` = `unique_device_fps / total_clicks`
- `click_timing_variance` = `click_timing_cov / 3.0`
- `bot_candidate_rate` = `1 - bot_flagged_clicks / total_clicks`

#### Fraud_P Formula (as implemented in `scoring.service.ts:187`)

```
Fraud_P = 0.30 × velocity_anomaly
         + 0.25 × ip_concentration
         + 0.20 × scanner_detection
         + 0.15 × fp_clustering
         + 0.10 × behavioral_regularity
```

Signal derivations (all clamped to [0, 1]):
- `velocity_anomaly` = `max_clicks_per_60s / 500`
- `ip_concentration` = `(max_single_ip_clicks / total_clicks) / 0.05`
- `scanner_detection` = `scanner_clicks / (total_clicks × 0.05)`
- `fp_clustering` = `device_fp_max_24h / 20`
- `behavioral_regularity` = `1 - click_timing_cov / 3.0`

#### Effective_Score (as implemented in `scoring.service.ts:197`)

```
Effective_Score = TQS × (1 − Fraud_P)
```

#### Decision Engine Thresholds (as implemented in `scoring.service.ts:215`)

Priority order — first match wins:

| Priority | Condition | Decision | Budget Change |
|---|---|---|---|
| 1 | `fraud_p >= 0.80` | `emergency_pause` | −100% (overrides all) |
| 2 | `effective_score >= 0.75` | `scale_20` | +20% |
| 3 | `effective_score >= 0.50` | `hold` | 0% |
| 4 | `effective_score >= 0.30` | `reduce_30` | −30% |
| 5 | `effective_score < 0.30` | `suspend` | −100% |

#### Startup Validation (`scoring.service.ts:124`)

On `OnModuleInit`, `ScoringService.validateReferenceVendors()` runs the full scoring pipeline against three hardcoded reference inputs (Vendor A, B, C) and compares against golden expected values with tolerance `TOL = 0.005`. If any of TQS, Fraud_P, or Effective_Score deviates beyond tolerance, the service **throws** and the backend fails to start.

---

### The Data Layer

#### How vendors.csv is loaded

`DataLoaderService.onModuleInit()` reads `data/vendors.csv` using `readFileSync` with `csv-parse/sync`. Falls back to `vendors.generated.csv` if locked or missing. Rows are mapped via dual-key cell lookup handling both snake_case and Excel-style headers.

#### Vendor Count and Archetypes — 50 total vendors

| Archetype | Count | Geo | Exp. Phase | Description |
|---|---|---|---|---|
| High Quality | 12 | TX | bandit | TQS ≥ 0.75, Fraud_P < 0.20; VND-001–VND-012 |
| Medium Quality | 18 | FL | ab_test + bandit mix | TQS 0.50–0.74; VND-013–VND-030 |
| Low Quality | 8 | GA | ab_test | TQS 0.30–0.49; VND-031–VND-038 |
| Suspended / Poor | 5 | GA | active | TQS < 0.30; VND-039–VND-043 |
| **Hidden Fraud** | **4** | **TX** | **active** | **TQS ~0.80 (looks clean), Fraud_P ~0.90+ → Emergency Pause; VND-044–VND-047** |
| Cold Start | 3 | OH | cold_start | Low volume, 1–7 days active; VND-048–VND-050 |

**Hidden Fraud vendor names:** PhantomReach Media, ShadowClick Network, GhostTraffic Pro, CovertTraffic Pro.
- These vendors have diverse IPs, good geo match, low bot-flagged rates (TQS looks clean at ~0.80)
- But `max_clicks_per_60s = 820–950` → velocity_anomaly = 1.0 (clamped)
- `max_single_ip_clicks = 650–1100` → ip_concentration = 1.0 (clamped)
- `device_fp_max_24h = 340–500` → fp_clustering = 1.0 (clamped)
- Fraud_P ≥ 0.90 → `emergency_pause` on every boot

#### SQLite

**Fully implemented.** `RedirectService` initializes `better-sqlite3` at `data/clicks.db` on startup (WAL mode). Schema:

```sql
CREATE TABLE click_events (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  geo_region TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  click_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_click_events_vendor_ts ON click_events(vendor_id, timestamp);
CREATE INDEX idx_click_events_ts ON click_events(timestamp);
```

#### Live score updates from click data

**Yes, conditionally.** After every 50 clicks for a vendor (or when a 60s window exceeds 200 clicks), `recomputeVendorFromLiveWindow` queries SQLite and computes velocity, IP concentration, and bot percentage. If thresholds are breached (velocity > 0.8, ip_concentration > 1, or bot_pct > 0.4), `applyLiveFraudSignals` mutates the in-memory `VendorScore` immediately. The change surfaces in the next `/api/vendors` poll and instantly in `/api/vendors/live-updates`.

---

## SECTION B: FRONTEND — EVERY SCREEN AND EVERY BUTTON

---

### DASHBOARD TAB

**Data fetched:**
- `/api/vendors` — polls every 30 seconds (`useVendors`)
- `/api/redirect/stats` — polls every 3 seconds (`useLiveFeed`)
- `/api/redirect/events` — polls every 2 seconds (`useLiveFeed`)
- `/api/vendors/live-updates` — polls every 5 seconds (`useLiveFeed`)

**Displays when loaded:** 4 KPI cards (Total Vendors, Flagged Entities, Avg Quality Score, Budget At Risk) · LiveFeedPanel (click stats + event feed) · WithoutFraudPanel (fraud mitigation projection) · VendorTable (sortable, filterable, expandable)

**Loading state:** 4 shimmer skeleton cards

**Interactive elements:**

| Element | What it does | Backend? | Status |
|---|---|---|---|
| EXPORT SNAPSHOT | Downloads `TIF_Snapshot_{ts}.csv` with full vendor risk matrix | No | Fully implemented |
| OPTIMIZE REACH | Computes top-6 vendor efficiency gain; shows modal with metrics; routes to Reallocation tab | No | Fully implemented |
| EXECUTE NOW | Quarantines fraud vendors in-memory; redistributes budget to top performers; animates Budget At Risk to 0 | No | Fully implemented |
| VendorTable filter tabs | Filters by fraud status or experiment phase (ALL / HIGH-RISK / AB TEST / BANDIT / COLD START) | No | Fully implemented |
| VendorTable search | Case-insensitive substring filter on vendor name | No | Fully implemented |
| VendorTable column sort | Ascending/descending sort by column header | No | Fully implemented |
| VendorRow expand | Opens signal breakdown: TQS bars + Fraud signal bars + sparkline + decision reason | No | Fully implemented |

---

### SIMULATOR TAB

**Data fetched:** `POST /api/score` — 300ms debounce on every input change

**Displays when loaded:** 10 range sliders (left) · ScoreResult with TQS/Fraud_P/Effective scores (right) · FormulaView with weighted breakdown (right, below)

**Loading state:** Spinner in score area; error message on API failure

**Interactive elements:**

| Element | What it does | Backend? | Status |
|---|---|---|---|
| 10 signal sliders | Each change triggers debounced POST /api/score; updates all score displays live | Yes | Fully implemented |
| Preset A (Clean) | Loads: total=8000, uniq_ips=7100, in_geo=6900, fps=7200, cov=1.82, bot=120, max60s=38, maxIP=18, fpMax24=4, scanner=95 → TQS≈0.851, Fraud_P≈0.151, Effective≈0.723, Hold | Yes | Fully implemented |
| Preset B (Fraud) | Loads: total=10000, max60s=780, maxIP=620, fpMax24=340 → TQS≈0.859, Fraud_P≈0.818, Effective≈0.156, Emergency Pause | Yes | Fully implemented |
| Preset C (New) | Loads cold-start reference inputs → TQS≈0.707, Fraud_P≈0.200, Effective≈0.566, Hold | Yes | Fully implemented |
| Live Input / Comparison Mode toggle | Visual styling change only. Comparison Mode does not load a second vendor panel. | No | **Cosmetic only** |

---

### EXPERIMENTS TAB

**Data fetched:** `GET /api/experiments` — once on mount

**Displays when loaded:** Three-column board: Cold Start Queue · Active A/B Tests · Bandit Allocation Pool

**Interactive elements:**

| Element | What it does | Backend? | Status |
|---|---|---|---|
| Advance 1 Day | Increments dayOffsets for all non-paused experiments; recalculates p-value (drops 0.008/day); at day 14 → significant (p=0.031), moves to bandit pool | No | Fully implemented |
| Force Refresh | Re-fetches GET /api/experiments; resets day offsets | Yes | Fully implemented |
| Pause (per experiment) | Stops that experiment from advancing on "Advance 1 Day" | No | Fully implemented |
| Resume (per experiment) | Re-enables advancement | No | Fully implemented |
| Archive (per experiment) | Confirm dialog → 300ms animation → removes from board | No | Fully implemented |
| MAB Strategy Config | Opens modal with 4 static Thompson Sampling parameters (Exploration Rate, Confidence Threshold, Score Decay, Reallocation Frequency). SAVE and RESET buttons close modal only — no values saved. | No | Modal: implemented. SAVE/RESET: **cosmetic only** |

---

### REALLOCATION TAB

**Data fetched:** None — uses vendor data already loaded from Dashboard

**Displays when loaded:** 3 KPI cards (Budget Recovered, Reallocated To, Fraud Prevention) · Recharts bar chart (current vs recommended allocation) · Reallocation Directives table

**Reallocation algorithm (client-side `useMemo`):**
1. At-risk vendors = `isHiddenFraudArchetype` (fraud_p ≥ 0.65 AND tqs ≥ 0.55) OR `fraud_status !== "clean"` → allocation → 0
2. Recovered budget distributed to high-quality clean vendors proportionally by current allocation weight
3. 30% per-vendor cap enforced; overflow redistributed to uncapped recipients

**Interactive elements:**

| Element | What it does | Backend? | Status |
|---|---|---|---|
| Replay simulation | Increments animKey → remounts Recharts BarChart → re-triggers 1500ms animation | No | Fully implemented |
| Export CSV | Downloads `TIF_Reallocation_{YYYY-MM-DD}.csv` with all vendor reallocation rows | No | Fully implemented |
| REPORT (Print) | Calls `window.print()` with CSS print styles (hides sidebar/header, reveals print title) | No | Fully implemented |

---

### APP-LEVEL ELEMENTS

| Element | What it does | Backend? | Status |
|---|---|---|---|
| Navigation sidebar tabs | Switches between dashboard / simulator / experiments / reallocation views | No | Fully implemented |
| Header tab buttons | Same tab switching via header bar | No | Fully implemented |
| Refresh button | GET /api/vendors; shows spinner + toast with timestamp | Yes | Fully implemented |
| Emergency Killswitch (3-state) | ACTIVE → SUSPENDED → RESUMING → ACTIVE (see state machine below) | No | Fully implemented |

**Emergency Killswitch state machine:**

| State | Trigger | UI Effect |
|---|---|---|
| `ACTIVE` | Default / restart complete | Normal UI. Killswitch button shows red pulsing dot. |
| `SUSPENDED` | User confirms killswitch dialog | Red banner below header: "SYSTEM SUSPENDED" + pulsing dot + elapsed timer (HH:MM:SS). Budget At Risk → "ALL PAUSED". |
| `RESUMING` | User confirms restart | Full-screen overlay: "SYSTEM RESTART IN PROGRESS" + progress bar + 3-second countdown → returns to ACTIVE. Toast: "✓ System restored" |

> Note: The killswitch is **client-side only** — it does not pause API calls or backend processes.

---

## SECTION C: THE LIVE SIMULATION SYSTEM

**File:** `simulate_clicks.js` (project root)

**Usage:** `node simulate_clicks.js [real|bot|contrast]`

| Mode | What it fires | Target vendor | Interval |
|---|---|---|---|
| `real` | Human-like clicks, 15 diverse user agents, 71 IPs, 88% TX geo | VND-002 / AutoAudience Network | Random 2–5 seconds |
| `bot` | Bot clicks, 4 rotating IPs, MSIE 9.0 UA, random non-TX geo, auto-stops at 120s | VND-021 (labeled "PhantomReach Media" — note: this is a script ID mismatch; actual PhantomReach Media is VND-044) | 120ms (≈500/min) |
| `contrast` | Both real and bot simultaneously | Both vendors | Per above |

**HTTP call:** `POST http://localhost:3001/api/redirect/click` with full payload.

**Live score update chain:**
1. Bot clicks fire at 120ms → ~500/min
2. After 24s, 60-second window exceeds 200 clicks → `recomputeVendorFromLiveWindow` triggers
3. velocity_anomaly = 500/500 = 1.0 > 0.8 threshold → `applyLiveFraudSignals` called
4. VendorsService mutates in-memory fraud_p, effective_score, budget_decision for that vendor
5. Next `/api/vendors/live-updates` poll (every 5s on frontend) returns the `LiveVendorScoreUpdate`
6. Dashboard VendorRow flashes green for 15 seconds; scores update in table

**Console output:** Every 15 seconds, terminal prints a summary box with real/bot click counts, unique IPs, and geo match percentages.

---

## SECTION D: THE DESIGN SYSTEM

### Color Palette

| Token | Hex | Role |
|---|---|---|
| background | `#111319` | Page background |
| surface-container-low | `#191B22` | KPI cards, chart panels |
| surface-container | `#1E1F26` | Sidebar, expanded rows |
| surface-container-high | `#282A30` | Modals, formula breakdown |
| surface-container-highest | `#33343B` | Input backgrounds |
| primary (lavender) | `#C0C1FF` | Score bars, tab underlines |
| primary-container | `#8083FF` | Action buttons (EXECUTE NOW) |
| secondary (blue) | `#A4C9FF` | Status indicators |
| tertiary (green) | `#4AE176` | Positive: Scale +20%, Significant, uplift |
| error (salmon-pink) | `#FFB4AB` | Fraud, Emergency Pause, risk text |
| error-container | `#93000A` | Fraud stripe pattern fill |
| on-surface | `#E2E2EB` | Primary text |
| on-surface-variant | `#C7C4D7` | Labels, captions |
| outline-variant | `#464554` | Dividers, subtle separators |

### Font Families

| Font | Token | Usage |
|---|---|---|
| Inter | default | Body text, descriptions, table cells |
| JetBrains Mono | `.font-mono` | All numeric values, scores, IDs, system strings |
| Space Grotesk | `.font-headline` | Page titles (h1/h2), modal headings |
| Material Symbols Outlined | icon font | All icons (download, warning, trending_up, star, etc.) |

### Design Rules Implemented

- **No visible card borders** — surface color elevation creates hierarchy (no border lines)
- **Dark-first, no light mode** — body background hardcoded; no `prefers-color-scheme: light` rule
- **Print mode** — Reallocation tab hides sidebar/header via CSS print rules; shows print-only title block
- **Shimmer loading** — `animation: shimmer 2s infinite` on skeleton elements
- **Row flash** — `color-mix(in srgb, #4AE176 12%, transparent)` + `transition: 0.8s ease-out` on live-updated vendor rows
- **Thin scrollbar** — 4px, dark track `#111319`, thumb `#33343B`
- **Glass card** — `backdrop-filter: blur(20px)` on overlay panels
- **Min-width** — `min-w-[1280px]` on root; horizontal scroll on smaller viewports

### Four Screens and Visual Hierarchy

| Screen | Label in Nav | Layout |
|---|---|---|
| Dashboard | Command Center | Header → 4 KPI cards → 2-col row (Live Feed + Fraud Panel) → VendorTable |
| Simulator | Asset Library | Header → 2-col grid (Sliders | Results + Formula) |
| Experiments | Threat Matrix | Header → 3-col board (Cold Start | A/B Tests | Bandit) |
| Reallocation | System Logs | Header → 3 KPI cards → Chart → Directives Table |

---

## SECTION E: WHAT MAKES THIS DIFFERENT FROM A SPREADSHEET

**The two-layer independent scoring model.** A spreadsheet can display fraud flags, but it cannot score traffic quality and fraud probability as two independent dimensions and combine them into a single decision-driving score. The Traffic Intelligence Framework computes TQS and Fraud_P separately, then multiplies via `Effective_Score = TQS × (1 − Fraud_P)`. A vendor with TQS = 0.859 (looks high quality) and Fraud_P = 0.818 (running coordinated bots) arrives at Effective_Score = 0.156 and receives `emergency_pause`. A spreadsheet with the same numbers would show two green cells and one red cell — it cannot synthesize them into a decision. The scoring engine in `scoring.service.ts` enforces this formula at startup with tolerance-checked golden reference tests, so the formula cannot drift.

**Live score mutation from real click traffic.** The system connects a redirect layer (SQLite-backed, `POST /api/redirect/click`) to the scoring engine (in-memory vendor state). When the click simulator fires bot traffic at 120ms intervals, `recomputeVendorFromLiveWindow()` detects velocity anomaly in the 60-second rolling window and calls `applyLiveFraudSignals()` to overwrite the vendor's `fraud_p`, `effective_score`, and `budget_decision` in memory. The frontend polls `/api/vendors/live-updates` every 5 seconds and highlights the changed row with a flash animation. A spreadsheet cannot autonomously detect a fraud spike in incoming traffic, recompute a composite score, and surface the change in a live UI.

**The experiment engine with statistical promotion logic.** The `ExperimentsService` maintains three distinct experiment states — A/B test, multi-armed bandit, and cold start — each with different scoring logic, promotion criteria, and traffic split rules. A/B test vendors move to the bandit pool when they reach statistical significance (p ≤ 0.031 after ≥10 days and score_delta > 0.1). Cold start vendors are evaluated at day 7 with a prior score of 0.5. The `Advance 1 Day` button simulates this progression in real time, showing p-value convergence and vendor promotion. A spreadsheet contains no concept of experiment state machines, significance thresholds, or traffic routing strategy — those are manual decisions.

**Automated budget decision logic with override hierarchy.** Every vendor produces a `budget_decision` code computed deterministically from Effective_Score and Fraud_P with an explicit priority chain: `Fraud_P ≥ 0.80` triggers `emergency_pause` regardless of quality score. The `EXECUTE NOW` button applies this decision set to a local vendor clone — quarantining fraud vendors, recovering their budget_allocation_pct, and redistributing it proportionally to top-performing vendors with a 30% diversification cap (enforced with overflow redistribution). A spreadsheet can display a recommendation column, but it cannot enforce a decision hierarchy, apply a diversification constraint, and redistribute budget in a single interaction.

**Validated reference architecture.** The scoring engine is a tested, startup-validated computation layer. `ScoringService.validateReferenceVendors()` runs three golden-set test cases on every application boot with tolerance `TOL = 0.005`. If the formula deviates — due to a code change, library update, or configuration drift — the backend throws and refuses to start. The `generate_vendors.py` script independently validates the same formula against archetype constraints and prints warnings if violations are found. A spreadsheet formula has no test harness and no startup validation.
