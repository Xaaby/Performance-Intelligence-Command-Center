import { getApiBaseUrl } from '../lib/apiBase';
import type { VendorScore } from '../types/vendor.types';

/** Gemini model id (Google AI Studio). Override with VITE_GEMINI_MODEL if needed. */
/** Stable Flash id for v1beta generateContent; bare gemini-1.5-flash is often no longer listed. */
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

const buildSystemPrompt = (vendor: VendorScore): string => `
You are a Vendor Intelligence Analyst for a 
digital advertising traffic intelligence platform. 
You are analyzing a specific vendor and answering 
questions from a media buyer who is NOT a data 
scientist. Your responses must be:

1. In plain English — no jargon without explanation
2. Specific — always reference actual numbers
3. Decisive — end every response with a clear 
   recommendation
4. Concise — maximum 4-5 sentences plus a 
   recommendation line
5. Data-grounded — every claim must reference 
   a specific signal value

CURRENT VENDOR DATA:
Vendor Name: ${vendor.vendor_name}
Campaign: ${vendor.campaign_name}
Geography Target: ${vendor.geo_target}

TRAFFIC QUALITY SIGNALS (TQS: ${vendor.tqs.toFixed(3)}):
- IP Diversity: ${vendor.signals.ip_diversity.toFixed(3)} 
  (proportion of unique IPs — higher is better)
- Geo Relevance: ${vendor.signals.geo_relevance.toFixed(3)} 
  (clicks from campaign target area — higher is better)
- Device FP Uniqueness: ${vendor.signals.device_fp_uniqueness.toFixed(3)}
  (unique device fingerprints — higher is better)
- Click Timing Variance: ${vendor.signals.click_timing_variance.toFixed(3)}
  (CoV of inter-click intervals — higher = more human)
- Bot Candidate Rate: ${vendor.signals.bot_candidate_rate.toFixed(3)}
  (proportion NOT matching bot signatures — higher is better)

FRAUD PROBABILITY SIGNALS (Fraud_P: ${vendor.fraud_p.toFixed(3)}):
- Velocity Anomaly: ${vendor.fraud_signals.velocity_anomaly.toFixed(3)}
  (0 = normal, 1 = extreme click burst — lower is better)
- IP Concentration: ${vendor.fraud_signals.ip_concentration.toFixed(3)}
  (0 = diverse, 1 = all from one IP — lower is better)
- Scanner Detection: ${vendor.fraud_signals.scanner_detection.toFixed(3)}
  (email security scanner clicks — lower is better)
- FP Clustering: ${vendor.fraud_signals.fp_clustering.toFixed(3)}
  (device reuse rate — lower is better)
- Behavioral Regularity: ${vendor.fraud_signals.behavioral_regularity.toFixed(3)}
  (0 = human irregular, 1 = robotic regular — lower is better)

COMBINED SCORES:
- Effective Score: ${vendor.effective_score.toFixed(3)} 
  (TQS × (1 − Fraud_P) — the decision-driving score)
- Tier: ${vendor.quality_tier.toUpperCase()}
- Current Budget Allocation: ${vendor.budget_allocation_pct.toFixed(1)}%
- Current Decision: ${vendor.budget_decision_label}
- Days Active: ${vendor.days_active}
- Experiment Phase: ${vendor.experiment_phase}

SCORING THRESHOLDS FOR REFERENCE:
- Effective Score ≥ 0.75: Scale +20% (Platinum/Gold)
- Effective Score 0.50-0.74: Hold (Silver)
- Effective Score 0.30-0.49: Reduce -30% (Bronze)
- Effective Score < 0.30: Suspend
- Fraud_P ≥ 0.80: Emergency pause (overrides all)

Respond to the media buyer's question about 
this specific vendor using the data above.
Keep your response focused and actionable.
Always end with a bold "Recommendation:" line.
`;

type GeminiContent = { role: string; parts: { text: string }[] };

function toGeminiRole(role: string): 'user' | 'model' {
  return role === 'assistant' ? 'model' : 'user';
}

function analystApiUrl(): string {
  return `${getApiBaseUrl()}/gemini/generateContent`;
}

function nestErrorMessage(data: { message?: string | string[] }): string {
  const m = data.message;
  if (Array.isArray(m)) return m.join(', ');
  return m ?? 'Analyst request failed';
}

export const askVendorAnalyst = async (
  vendor: VendorScore,
  question: string,
  conversationHistory: Array<{ role: string; content: string }>,
): Promise<string> => {
  const model = import.meta.env.VITE_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  const contents: GeminiContent[] = [
    ...conversationHistory.map((m) => ({
      role: toGeminiRole(m.role),
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: question }] },
  ];

  let response: Response;
  try {
    response = await fetch(analystApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(vendor) }],
        },
        contents,
        generationConfig: {
          maxOutputTokens: 1000,
        },
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    throw new Error(
      `Could not reach the backend (${analystApiUrl()}). ${msg}. Is the API running on port 3001?`,
    );
  }

  let data: { text?: string; message?: string | string[]; statusCode?: number };
  try {
    data = (await response.json()) as typeof data;
  } catch {
    throw new Error(`Analyst returned non-JSON (${response.status}). Is the Vite proxy targeting the backend?`);
  }

  if (!response.ok) {
    throw new Error(nestErrorMessage(data));
  }

  const text = data.text;
  if (!text) {
    throw new Error('Empty response from analyst');
  }
  return text;
};
