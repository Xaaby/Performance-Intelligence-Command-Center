import type { ReactNode } from 'react';
import type { VendorScore } from '../../types/vendor.types';
import type { SystemStatus } from '../../App';

const ESTIMATED_MONTHLY_CAMPAIGN_BUDGET = 500_000;

type Props = {
  vendors: VendorScore[];
  systemStatus: SystemStatus;
  onExecute: () => void;
  executeLoading: boolean;
  filterActive: boolean;
  feedVisible: boolean;
};

export function WithoutFraudPanel({
  vendors,
  systemStatus,
  onExecute,
  executeLoading,
  filterActive,
  feedVisible,
}: Props) {
  const fraudVendors = vendors.filter((v) => v.fraud_status !== 'clean');
  const cleanVendors = vendors.filter((v) => !fraudVendors.some((f) => f.vendor_id === v.vendor_id));
  const fraudVendorsBase = vendors.filter(
    (v) => v.budget_decision === 'emergency_pause' || v.fraud_p >= 0.8,
  );
  if (vendors.length === 0) {
    return null;
  }
  const atRiskPct = fraudVendorsBase.reduce((s, v) => s + v.budget_allocation_pct, 0) / 100;
  const fraudBudgetAmount = atRiskPct * ESTIMATED_MONTHLY_CAMPAIGN_BUDGET;
  const impactDelta = Math.min(fraudBudgetAmount * 0.2, 25_000);
  const cleanVendorAvgScore = cleanVendors.length ? cleanVendors.reduce((s, v) => s + v.tqs, 0) / cleanVendors.length : 0;
  const portfolioAvgScore = vendors.length ? vendors.reduce((s, v) => s + v.tqs, 0) / vendors.length : 0.01;
  const projectedUplift = Math.min(
    portfolioAvgScore > 0 ? ((cleanVendorAvgScore - portfolioAvgScore) / portfolioAvgScore) * 100 : 0,
    35.0,
  );
  const yieldPct = vendors.length ? (cleanVendors.filter((v) => v.effective_score >= 0.75).length / vendors.length) * 100 : 0;
  const projectedUpliftDisplay = filterActive ? 0 : projectedUplift;
  const fraudPct = vendors.length ? (fraudVendors.length / vendors.length) * 100 : 0;
  const impactDeltaDisplay = `$${(impactDelta / 1000).toFixed(1)}k`;
  const actionText = filterActive
    ? '✓ Global Fraud Filter active - portfolio optimized'
    : 'Execute "Global Fraud Filter" to automatically purge bottom 5% of traffic.';
  const fraudDrag = Math.max(0, (cleanVendorAvgScore - portfolioAvgScore) * 100);
  const portfolioAvgEffective = Math.max(0, Math.min(100, portfolioAvgScore * 100));
  const impactNote = filterActive
    ? '✓ Savings realized'
    : systemStatus === 'SUSPENDED'
      ? 'Pending filter execution'
      : 'Monthly Potential Savings';
  const cleanYieldNum = (Math.max(0, cleanVendorAvgScore) * 100).toFixed(1);
  const netYieldNum = portfolioAvgEffective.toFixed(1);
  const metricGridClass = feedVisible ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className="flex h-full flex-col rounded-lg bg-surface-container p-6">
      <div className="mb-6">
        <h2 className="font-headline text-2xl font-bold text-on-surface">"Without Fraud" Insight</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Synthetic projection of portfolio health if identified fraudulent traffic is mitigated immediately.
        </p>
      </div>

      <div className={`mb-3 grid flex-1 ${metricGridClass} items-stretch gap-4`}>
        <MetricCell compact={feedVisible} label="EFFECTIVE YIELD">
          <div className="mt-2 h-8 w-full overflow-hidden rounded bg-surface-container-highest">
            <div className="h-full rounded bg-primary/60 transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, yieldPct))}%` }} />
          </div>
          <span className="mt-1 font-mono text-[10px] text-on-surface-variant">{yieldPct.toFixed(0)}% of portfolio</span>
        </MetricCell>
        <MetricCell compact={feedVisible} label="PROJECTED UPLIFT">
          <p className={`font-mono font-bold text-tertiary ${feedVisible ? 'text-3xl' : 'text-4xl'}`}>
            +{projectedUpliftDisplay.toFixed(1)}%
          </p>
          <p className="text-xs text-on-surface-variant">Efficiency Gain</p>
        </MetricCell>
        <MetricCell compact={feedVisible} label="FRAUD WASTE">
          <div className="mt-2 h-14 rounded bg-surface-container-high p-2">
            <div className="h-full rounded transition-all duration-700" style={{ width: `${filterActive ? 0 : Math.min(100, fraudPct)}%`, background: 'repeating-linear-gradient(45deg, #ffb4ab50, #ffb4ab50 4px, transparent 4px, transparent 8px)' }} />
          </div>
        </MetricCell>
        <MetricCell compact={feedVisible} label="IMPACT DELTA">
          <p className={`font-mono font-bold ${filterActive ? 'text-tertiary' : 'text-error'} ${feedVisible ? 'text-3xl' : 'text-4xl'}`}>
            {filterActive ? impactDeltaDisplay : `-${impactDeltaDisplay}`}
          </p>
          <p className={`mt-1 font-mono text-[10px] ${filterActive ? 'text-tertiary' : 'text-on-surface-variant'}`}>{impactNote}</p>
        </MetricCell>
      </div>

      <div className="mb-4 mt-0 rounded bg-surface-container-high p-4 pt-0">
        <p className="mb-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
          PORTFOLIO IMPACT BREAKDOWN
        </p>
        <MiniImpactBar
          feedVisible={feedVisible}
          label="Clean vendor yield"
          value={feedVisible ? cleanYieldNum : `${cleanYieldNum} / 100`}
          pct={Math.max(0, cleanVendorAvgScore) * 100}
          color="#4ae176"
        />
        <MiniImpactBar
          feedVisible={feedVisible}
          label="Fraud drag on portfolio"
          value={`-${fraudDrag.toFixed(1)} pts`}
          pct={fraudDrag}
          color="#ffb4ab"
          striped
        />
        <MiniImpactBar
          feedVisible={feedVisible}
          label="Net effective yield"
          value={feedVisible ? netYieldNum : `${netYieldNum} / 100`}
          pct={portfolioAvgEffective}
          color="#c0c1ff"
        />
      </div>

      <div className="mt-auto flex items-center justify-between gap-4 rounded border border-primary/10 bg-primary/5 p-3">
        <div>
          <p className="inline-flex items-center gap-2 font-semibold text-primary">
            <span className="material-symbols-outlined text-sm">star</span>
            Recommended Action
          </p>
          <p className="text-sm text-on-surface-variant">
            {actionText}
          </p>
        </div>
        <div className="relative group/btn">
          <button
            type="button"
            onClick={onExecute}
            disabled={executeLoading || filterActive}
            className={`rounded px-3 py-2 text-xs font-bold uppercase tracking-wide disabled:cursor-not-allowed ${
              filterActive
                ? 'bg-tertiary/20 text-tertiary'
                : 'bg-primary-container text-[#0d0096] disabled:opacity-70'
            }`}
          >
            <span className="inline-flex items-center gap-1">
              {executeLoading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              {filterActive ? 'FILTER ACTIVE' : executeLoading ? 'EXECUTING...' : 'EXECUTE NOW'}
            </span>
          </button>
          <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-64 rounded border border-outline-variant/20 bg-surface-container-high p-3 opacity-0 transition-opacity duration-200 group-hover/btn:opacity-100">
            <p className="font-mono text-[10px] leading-relaxed text-on-surface-variant">
              Quarantines all vendors with Fraud_P ≥ 0.80. Sets their budget allocation to 0% and redistributes recovered budget to verified top-tier vendors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniImpactBar({
  label,
  value,
  pct,
  color,
  striped = false,
  feedVisible,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
  striped?: boolean;
  feedVisible: boolean;
}) {
  const labelWidth = feedVisible ? 'w-28' : 'w-28 md:w-44';
  return (
    <div className="mb-2 flex items-center gap-3">
      <span className={`${labelWidth} flex-shrink-0 text-xs text-on-surface-variant`}>{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: striped
              ? 'repeating-linear-gradient(45deg, #ffb4ab, #ffb4ab 4px, rgba(255,180,171,0.4) 4px, rgba(255,180,171,0.4) 8px)'
              : color,
          }}
        />
      </div>
      <span className="w-16 flex-shrink-0 text-right font-mono text-xs" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function MetricCell({
  label,
  children,
  compact,
}: {
  label: string;
  children: ReactNode;
  compact: boolean;
}) {
  return (
    <div className="flex h-full flex-col justify-between">
      <p
        className={`font-label mb-2 truncate text-[10px] uppercase text-on-surface-variant ${compact ? 'tracking-normal' : 'tracking-widest'}`}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
