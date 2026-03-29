import type { BanditAllocation } from '../../types/vendor.types';
import { formatPct } from '../../lib/format';

type Props = {
  allocation: BanditAllocation;
  onConfigure: () => void;
};

function confidenceClasses(c: BanditAllocation['confidence']) {
  switch (c) {
    case 'high':
      return 'bg-tertiary/10 text-tertiary';
    case 'medium':
      return 'bg-secondary/10 text-secondary';
    default:
      return 'bg-error/10 text-error';
  }
}

function TrendIcon({ trend }: { trend: BanditAllocation['trend'] }) {
  if (trend === 'up') {
    return <span className="text-lg font-bold text-tertiary">↑</span>;
  }
  if (trend === 'down') {
    return <span className="text-lg font-bold text-error">↓</span>;
  }
  return <span className="text-lg text-on-surface-variant">→</span>;
}

export function BanditCard({ allocation, onConfigure }: Props) {
  const pct = Math.min(100, Math.max(0, allocation.allocation_pct));
  return (
    <div className="mb-3 rounded-lg border border-outline-variant/10 bg-surface-container p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-on-surface">
          {allocation.vendor_name}
          {allocation.allocation_pct >= 30 && (
            <span className="ml-2 rounded bg-tertiary/20 px-1.5 py-0.5 font-mono text-[10px] text-tertiary">
              WINNER
            </span>
          )}
        </p>
        <TrendIcon trend={allocation.trend} />
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-on-surface-variant">
          <span>Allocation</span>
          <span className="font-mono font-medium text-on-surface">
            {formatPct(allocation.allocation_pct)}
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="mt-3">
        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${confidenceClasses(allocation.confidence)}`}>
          {allocation.confidence} confidence
        </span>
        <button
          type="button"
          onClick={onConfigure}
          className="mt-2 w-full rounded border border-outline-variant/20 bg-surface-container-high px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant transition-colors hover:border-primary/30"
        >
          Configure MAB Strategy
        </button>
      </div>
    </div>
  );
}
