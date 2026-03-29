/** How to color a 0–1 score: higher is better (TQS, effective) vs higher is worse (Fraud_P). */
export type ScoreTone = 'quality' | 'risk';

/** TQS / effective: indigo bar. Fraud_P: red bar. */
export function scoreBarFillClasses(
  _value: number,
  tone: ScoreTone = 'quality',
): string {
  return tone === 'risk' ? 'bg-danger' : 'bg-brand';
}

/** Numeric text + chip background tiers (dark theme). */
export function scoreTextClasses(
  value: number,
  tone: ScoreTone = 'quality',
): string {
  if (tone === 'risk') {
    if (value >= 0.75) return 'text-[#EF4444]';
    if (value >= 0.5) return 'text-[#F97316]';
    if (value >= 0.3) return 'text-[#EAB308]';
    return 'text-[#22C55E]';
  }
  if (value >= 0.75) return 'text-[#22C55E]';
  if (value >= 0.5) return 'text-[#EAB308]';
  if (value >= 0.3) return 'text-[#F97316]';
  return 'text-[#EF4444]';
}

/** Badge-style wraps for compact score chips */
export function scoreBadgeWrapClasses(
  value: number,
  tone: ScoreTone = 'quality',
): string {
  if (tone === 'risk') {
    if (value >= 0.75) {
      return 'border border-border bg-[#1C0505] text-[#EF4444]';
    }
    if (value >= 0.5) {
      return 'border border-border bg-[#1C0A00] text-[#F97316]';
    }
    if (value >= 0.3) {
      return 'border border-border bg-[#1C1708] text-[#EAB308]';
    }
    return 'border border-border bg-[#052E16] text-[#22C55E]';
  }
  if (value >= 0.75) {
    return 'border border-border bg-[#052E16] text-[#22C55E]';
  }
  if (value >= 0.5) {
    return 'border border-border bg-[#1C1708] text-[#EAB308]';
  }
  if (value >= 0.3) {
    return 'border border-border bg-[#1C0A00] text-[#F97316]';
  }
  return 'border border-border bg-[#1C0505] text-[#EF4444]';
}

export function coldStartBadgeClasses(): string {
  return 'border border-border bg-[#051C2E] text-[#60A5FA]';
}
