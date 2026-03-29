import type { VendorScore } from '../../types/vendor.types';
import { formatPct } from '../../lib/format';
import { SignalBreakdown } from './SignalBreakdown';
import type { SystemStatus } from '../../App';

type Props = {
  vendor: VendorScore;
  rank: number;
  expanded: boolean;
  changed: boolean;
  onToggle: () => void;
  systemStatus: SystemStatus;
  highlighted?: boolean;
  overrideStatus?: 'QUARANTINED';
  overrideDecisionLabel?: string;
  forceRowTone?: boolean;
  onOpenVendorChat?: (v: VendorScore) => void;
};

function statusLabel(v: VendorScore): string {
  if (v.fraud_status === 'clean' && v.tqs >= 0.75) return 'SECURE';
  if (v.fraud_status === 'clean' || v.fraud_p < 0.6) return 'INVESTIGATING';
  return 'CRITICAL';
}

function tierLabel(v: VendorScore): 'PLATINUM' | 'GOLD' | 'SILVER' | 'RESTRICTED' {
  if (v.quality_tier === 'high') {
    return v.effective_score >= 0.85 ? 'PLATINUM' : 'GOLD';
  }
  if (v.quality_tier === 'medium') return 'SILVER';
  return 'RESTRICTED';
}

export function VendorRow({
  vendor,
  rank,
  expanded,
  changed,
  onToggle,
  systemStatus,
  highlighted = false,
  overrideStatus,
  overrideDecisionLabel,
  forceRowTone,
  onOpenVendorChat,
}: Props) {
  const suspended = systemStatus === 'SUSPENDED';
  const status = overrideStatus ?? statusLabel(vendor);
  const tier = tierLabel(vendor);
  const qualityColor = vendor.tqs >= 0.75 ? 'text-tertiary' : vendor.tqs >= 0.5 ? 'text-secondary' : 'text-error';
  const fraudColor = vendor.fraud_p > 0.6 ? 'text-error' : vendor.fraud_p >= 0.2 ? 'text-secondary' : 'text-on-surface-variant';
  const statusColor = status === 'SECURE' ? 'text-tertiary' : status === 'INVESTIGATING' ? 'text-secondary' : 'text-error';
  const dotColor = status === 'SECURE' ? 'bg-tertiary' : status === 'INVESTIGATING' ? 'bg-secondary' : 'bg-error';
  const tierClass =
    tier === 'PLATINUM'
      ? 'border-primary/40 bg-primary/10 text-primary'
      : tier === 'GOLD'
        ? 'border-primary/25 bg-primary/5 text-primary'
        : tier === 'SILVER'
          ? 'border-outline-variant/30 bg-surface-variant/30 text-on-surface-variant'
          : 'border-error/40 bg-error/10 text-error';
  const rowStateClass = highlighted
    ? 'bg-primary/10 ring-1 ring-primary/30'
    : forceRowTone
    ? 'bg-error/5'
    : expanded
      ? 'bg-surface-container border-l-2 border-primary'
      : 'bg-surface-container-low hover:bg-surface-container';

  return (
    <>
      <tr
        id={`vendor-row-${vendor.vendor_id}`}
        className={`cursor-pointer transition-colors duration-150 ${rowStateClass} ${changed ? 'row-flash' : ''}`}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
      >
        <td className="w-48 min-w-[12rem] px-4 py-3 align-middle">
          <div className="flex items-center gap-2">
            <span
              className={`material-symbols-outlined text-sm text-on-surface-variant transition-transform duration-200 ${expanded ? 'rotate-90' : 'rotate-0'}`}
            >
              chevron_right
            </span>
            <span className="w-6 flex-shrink-0 text-right font-mono text-[10px] text-on-surface-variant">
              {rank}
            </span>
            <span className={`h-2 w-2 rounded-full ${dotColor} ${status === 'SECURE' ? 'animate-pulse' : ''}`} />
            <span className="max-w-[14rem] truncate text-sm font-bold text-on-surface">
              {vendor.vendor_name}
            </span>
          </div>
        </td>
        <td className={`w-28 px-4 py-3 align-middle text-right font-mono tabular-nums text-sm ${qualityColor}`}>
          {(vendor.tqs * 100).toFixed(1)}
        </td>
        <td className={`w-24 px-4 py-3 align-middle text-right font-mono tabular-nums text-sm ${fraudColor}`}>
          {(vendor.fraud_p * 100).toFixed(1)}%
        </td>
        <td className={`w-28 px-4 py-3 align-middle text-right font-mono tabular-nums text-sm ${qualityColor}`}>
          {(vendor.effective_score * 100).toFixed(1)}
        </td>
        <td className="w-24 px-4 py-3 align-middle text-center">
          <span className={`h-5 rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${tierClass} inline-flex items-center`}>
            {tier}
          </span>
        </td>
        <td className={`w-32 px-4 py-3 align-middle font-mono text-[11px] ${suspended ? 'text-error' : statusColor}`}>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">
              {suspended ? 'block' : status === 'SECURE' ? 'verified' : status === 'INVESTIGATING' ? 'monitoring' : 'block'}
            </span>
            <span className="text-xs">{suspended ? 'SUSPENDED' : status}</span>
          </div>
        </td>
        <td className="w-20 px-4 py-3 align-middle text-right font-mono tabular-nums text-sm text-on-surface">
          {suspended ? '0%' : formatPct(vendor.budget_allocation_pct)}
        </td>
        <td className={`px-4 py-3 align-middle text-xs ${suspended || forceRowTone || vendor.budget_decision.includes('emergency') || vendor.budget_decision.includes('suspend') ? 'font-bold text-error' : 'text-on-surface-variant'}`}>
          {suspended ? 'Awaiting restart' : overrideDecisionLabel ?? vendor.budget_decision_label}
        </td>
        <td className="px-4 py-3 align-middle">
          {onOpenVendorChat && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenVendorChat(vendor);
              }}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              title={`Ask analyst about ${vendor.vendor_name}`}
            >
              <span className="material-symbols-outlined text-sm text-primary/60 transition-colors hover:text-primary">
                smart_toy
              </span>
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td className="border-0 p-0 align-middle" colSpan={9}>
            <SignalBreakdown
              vendor={vendor}
              onAskAnalyst={onOpenVendorChat ? () => onOpenVendorChat(vendor) : undefined}
            />
          </td>
        </tr>
      )}
    </>
  );
}
