# Traffic Intelligence Framework — Project Context

## What This Is

A demo application built to showcase a Traffic Intelligence Framework for a martech company that runs digital marketing campaigns for automotive dealerships. The company buys traffic from third-party vendors and routes it to Vehicle Detail Pages (VDPs). They cannot see what happens after traffic lands on the VDP — no landing page access, no conversion data.

This app demonstrates how the framework scores vendor traffic quality, detects fraud, runs experiments, and recommends budget allocation — all from signals captured before the visitor reaches the dealership page.

## The Core Problem

- Company is evaluated on lead quality they cannot directly observe
- Traffic vendors vary widely in quality and can change behavior without notice
- Manual assessment is inconsistent, unscalable, and reactive
- No standard criteria for what "quality" means without conversion data

## What The App Demonstrates

1. A vendor dashboard showing all vendors scored and ranked in real time
2. An interactive simulator where any vendor's click data can be input and scored live
3. An experiment status board showing A/B testing and multi-armed bandit allocation state
4. A fraud detection view showing vendors flagged with high fraud probability

## Tech Stack

- Backend: NestJS + TypeScript, runs on port 3001
- Frontend: React + Vite + TypeScript + Tailwind CSS, runs on port 5173
- Data: Synthetic CSV dataset loaded by backend at startup, served via REST API
- Infrastructure: Docker + docker-compose
- No database required — all data is in-memory from CSV at startup

## Data Flow

1. Backend loads vendors.csv from /data folder at startup
2. Backend computes TQS, Fraud_P, Effective_Score for every vendor using the scoring engine (see SCORING_ENGINE.md)
3. Backend exposes REST endpoints (see API_CONTRACT.md)
4. Frontend fetches from backend and renders three main views
5. Simulator view sends user input to backend scoring endpoint in real time

## Personas Using This App

- Media Buyer: sees vendor dashboard every morning, approves/rejects budget change recommendations
- Operations Manager: monitors fraud alerts, reviews paused vendors
- Campaign Manager: tracks experiment status, sees A/B test results

## Important Constraints

- The app must run entirely via docker-compose up — zero manual setup
- All vendor data is synthetic but realistic (see DATA_SCHEMA.md)
- The scoring formulas must match the proposal exactly (see SCORING_ENGINE.md)
- The UI must look professional enough for a CEO-level demo
- No authentication required for demo purposes
