import { getEffectiveScoreDrift } from '../../lib/scoreDrift';
import type { VendorScore } from '../../types/vendor.types';
import { isHiddenFraudArchetype } from '../../lib/scoring';

type Props = {
  vendor: VendorScore;
};

const W = 88;
const H = 32;
const PAD = 2;

export function ScoreSparkline({ vendor }: Props) {
  const points = getEffectiveScoreDrift(vendor);
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 1);
  const span = max - min || 1;
  const coords = points.map((y, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const yn = H - PAD - ((y - min) / span) * (H - PAD * 2);
    return `${x},${yn}`;
  });
  const pathD = `M ${coords.join(' L ')}`;
  const isFraudOrSuspended =
    isHiddenFraudArchetype(vendor) ||
    vendor.budget_decision === 'suspend' ||
    vendor.budget_decision === 'emergency_pause';
  const stroke = isFraudOrSuspended
    ? '#EF4444'
    : vendor.quality_tier === 'high'
      ? '#22C55E'
      : '#EAB308';

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="shrink-0"
      aria-hidden
    >
      <path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((y, i) => {
        const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
        const yn = H - PAD - ((y - min) / span) * (H - PAD * 2);
        const isLast = i === points.length - 1;
        return (
          <circle key={i} cx={x} cy={yn} r={isLast ? 3 : 1.75} fill={stroke}>
            <title>{`Day ${i + 1}: score ${y.toFixed(2)}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}
