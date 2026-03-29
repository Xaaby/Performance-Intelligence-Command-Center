import type { VendorScore } from '../types/vendor.types';
import { isHiddenFraudArchetype } from './scoring';

/** Deterministic pseudo-random in [0, 1) from string seed. */
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) / 2147483647;
}

/** Seven daily effective-score points for sparkline (rolling window narrative). */
export function getEffectiveScoreDrift(vendor: VendorScore): number[] {
  const base = vendor.effective_score;
  const fraudLike =
    isHiddenFraudArchetype(vendor) ||
    vendor.budget_decision === 'suspend' ||
    vendor.budget_decision === 'emergency_pause';
  const seed = hashSeed(vendor.vendor_id);
  const noise = (i: number) => (hashSeed(`${vendor.vendor_id}-d${i}`) - 0.5) * 0.04;

  if (!fraudLike) {
    return Array.from({ length: 7 }, (_, i) =>
      Math.min(1, Math.max(0, base + noise(i) + (seed - 0.5) * 0.02)),
    );
  }

  const normal = Array.from({ length: 4 }, (_, i) =>
    0.6 + hashSeed(`${vendor.vendor_id}-normal-${i}`) * 0.1,
  );
  const day5Spike = 0.75 + noise(4) * 0.25;
  const day6Collapse = 0.2 + noise(5) * 0.2;
  const day7Low = 0.22 + noise(6) * 0.2;
  return [...normal, day5Spike, day6Collapse, day7Low].map((x) =>
    Math.min(1, Math.max(0, x)),
  );
}
