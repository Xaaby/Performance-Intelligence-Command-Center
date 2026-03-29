# Demo Script — Traffic Intelligence Framework

## Setup (before the call)

- Run: docker-compose up
- Open: http://localhost:5173
- Have the proposal document open in a second tab for reference

## Opening (30 seconds)

"This is the Traffic Intelligence Framework running as a working system. The dashboard you're seeing right now is scoring 25 simulated vendors in real time using the same formulas from the proposal. Let me walk you through what it's showing."

---

## Dashboard Walkthrough (90 seconds)

Point to the top of the vendor table:

"These six vendors at the top — green, effective scores above 0.75 — these are your budget scalers. The system recommends increasing their allocation by 20% automatically."

Point to the red vendors:

"Now look at these three. PhantomReach Media, ShadowClick Network, GhostTraffic Pro. Their traffic quality scores look fine — above 0.70. A manual review would probably pass them."

Click to expand one fraud vendor:

"But look at the fraud signals. Velocity anomaly: 820 clicks in 60 seconds. Single IP concentration: 6.8% of all traffic from one address. Device fingerprint clustering: one device appearing 340 times in 24 hours. Effective score drops to 0.24. System flags for emergency pause. That's budget that was going to a fraud vendor being caught before the next billing cycle."

---

## Simulator Walkthrough (90 seconds)

Click Simulator tab:

"This is where you can score any vendor in real time. I've pre-loaded the fraud scenario. Watch what happens when I change the velocity from 820 clicks per minute down to 40..."

Adjust the slider:

"Fraud probability drops from 0.71 to 0.04. Effective score goes from 0.25 to 0.86. Scale decision. The system shows exactly which signal caused the problem and exactly what fixing it would do to the score."

"This is how I'd sit with your media buying team and validate scoring thresholds in the first 30 days — interactive, traceable, explainable."

---

## Experiments Walkthrough (60 seconds)

Click Experiments tab:

"This is the experiment engine status. Cold start on the left — two new vendors, day 4, still building evidence before committing real budget. A/B testing in the middle — day 9 of 14, treatment vendor at 0.71 vs control at 0.64, not yet statistically significant. Multi-armed bandit on the right — six vendors with proven scores, Thompson Sampling allocating traffic toward the best performers daily."

---

## Closing (30 seconds)

"Everything you're seeing is the scoring brain from the proposal running on synthetic data structured to match what your redirect layer would produce. In a real engagement, wiring this to live data is a sprint-one deliverable — the intelligence layer is already built."
