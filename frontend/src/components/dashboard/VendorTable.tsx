import { useEffect, useMemo, useState } from 'react';
import { asArray } from '../../lib/asArray';
import type { DashboardFilter, VendorScore } from '../../types/vendor.types';
import { VendorRow } from './VendorRow';
import type { SystemStatus } from '../../App';

type Props = {
  vendors: VendorScore[];
  changedVendorIds?: Set<string>;
  systemStatus: SystemStatus;
  quarantinedIds?: Set<string>;
  expandedVendorId?: string | null;
  onExpandedVendorChange?: (vendorId: string | null) => void;
  highlightedVendorId?: string | null;
  forcedFilter?: DashboardFilter | null;
  forcedFilterKey?: number;
  forcedSort?: 'effective_score' | 'tqs';
  forcedSortKey?: number;
  highlightHeaderKey?: number;
  pulseAtRiskTabKey?: number;
  onOpenVendorChat?: (v: VendorScore) => void;
};

function filterVendors(
  list: VendorScore[],
  f: DashboardFilter,
): VendorScore[] {
  switch (f) {
    case 'high_quality':
      return list.filter((v) => v.quality_tier === 'high');
    case 'fraud_alert':
      return list.filter(
        (v) => v.fraud_status !== 'clean' || v.fraud_p >= 0.4,
      );
    case 'cold_start':
      return list.filter((v) => v.experiment_phase === 'cold_start');
    default:
      return list;
  }
}

const FILTER_TABS: { id: DashboardFilter; label: string }[] = [{ id: 'all', label: 'All' }, { id: 'fraud_alert', label: 'At Risk' }];

export function VendorTable({
  vendors: vendorsProp,
  changedVendorIds,
  systemStatus,
  quarantinedIds,
  expandedVendorId,
  onExpandedVendorChange,
  highlightedVendorId,
  forcedFilter,
  forcedFilterKey,
  forcedSort,
  forcedSortKey,
  highlightHeaderKey,
  pulseAtRiskTabKey,
  onOpenVendorChat,
}: Props) {
  const vendors = asArray<VendorScore>(vendorsProp);
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'effective_score' | 'tqs'>('effective_score');
  const [headerHighlighted, setHeaderHighlighted] = useState(false);
  const [atRiskPulsing, setAtRiskPulsing] = useState(false);
  const [internalExpandedId, setInternalExpandedId] = useState<string | null>(null);
  const expandedId = expandedVendorId ?? internalExpandedId;
  const atRiskVendors = useMemo(() => filterVendors(vendors, 'fraud_alert'), [vendors]);

  useEffect(() => {
    if (forcedFilter) {
      setFilter(forcedFilter);
    }
  }, [forcedFilter, forcedFilterKey]);

  useEffect(() => {
    if (forcedSort) {
      setSortBy(forcedSort);
    }
  }, [forcedSort, forcedSortKey]);

  useEffect(() => {
    if (!highlightHeaderKey) return;
    setHeaderHighlighted(true);
    const id = window.setTimeout(() => setHeaderHighlighted(false), 1500);
    return () => window.clearTimeout(id);
  }, [highlightHeaderKey]);

  useEffect(() => {
    if (!pulseAtRiskTabKey) return;
    setAtRiskPulsing(true);
    const id = window.setTimeout(() => setAtRiskPulsing(false), 500);
    return () => window.clearTimeout(id);
  }, [pulseAtRiskTabKey]);

  const sorted = useMemo(() => {
    const filtered = filterVendors(vendors, filter).filter((v) =>
      v.vendor_name.toLowerCase().includes(query.toLowerCase()),
    );
    return [...filtered].sort((a, b) =>
      sortBy === 'tqs' ? b.tqs - a.tqs : b.effective_score - a.effective_score,
    );
  }, [vendors, filter, query, sortBy]);

  const toggle = (id: string) => {
    const next = expandedId === id ? null : id;
    if (onExpandedVendorChange) {
      onExpandedVendorChange(next);
      return;
    }
    setInternalExpandedId(next);
  };

  return (
    <div className="rounded-lg bg-surface-container-low p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-headline text-xl font-bold text-on-surface">Vendor Risk Matrix</h2>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter vendors..."
            className="rounded bg-surface-container px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />
          <div className="rounded bg-surface-container-high p-1">
            {FILTER_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`px-2 py-1 font-mono text-[10px] uppercase ${
                  filter === t.id ? 'text-on-surface' : 'text-on-surface-variant'
                } ${t.id === 'fraud_alert' && atRiskPulsing ? 'animate-pulse text-primary' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {filter === 'fraud_alert' && (
        <div className="mb-3 flex items-center gap-2 text-[10px] font-mono text-on-surface-variant">
          <span className="material-symbols-outlined text-xs text-primary">filter_alt</span>
          Showing {atRiskVendors.length} flagged vendors
          <button type="button" onClick={() => setFilter('all')} className="ml-1 text-primary hover:text-primary/80">
            Clear filter ×
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-left text-sm">
          <thead
            className={`text-[10px] uppercase tracking-widest text-on-surface-variant transition-colors ${
              headerHighlighted ? 'bg-primary/10' : ''
            }`}
          >
            <tr>
              <th className="w-48 min-w-[12rem] px-4 py-3">Vendor</th>
              <th className="w-28 px-4 py-3 text-right">
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => setSortBy('tqs')}
                >
                  Quality Score
                  {sortBy === 'tqs' && <span className="material-symbols-outlined text-xs">south</span>}
                </button>
              </th>
              <th className="w-24 px-4 py-3 text-right">Fraud Prob.</th>
              <th className="w-28 px-4 py-3 text-right">Effective Score</th>
              <th className="w-24 px-4 py-3 text-center">Tier</th>
              <th className="w-32 px-4 py-3">Status</th>
              <th className="w-20 px-4 py-3 text-right">Budget %</th>
              <th className="px-4 py-3">Recommended Action</th>
              <th className="w-12 px-2 py-3" aria-label="Analyst" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {sorted.map((v, i) => (
              <VendorRow
                key={v.vendor_id}
                vendor={v}
                rank={i + 1}
                expanded={expandedId === v.vendor_id}
                changed={changedVendorIds?.has(v.vendor_id) ?? false}
                onToggle={() => toggle(v.vendor_id)}
                systemStatus={systemStatus}
                highlighted={highlightedVendorId === v.vendor_id}
                overrideStatus={quarantinedIds?.has(v.vendor_id) ? 'QUARANTINED' : undefined}
                overrideDecisionLabel={quarantinedIds?.has(v.vendor_id) ? 'Quarantined - pending review' : undefined}
                forceRowTone={quarantinedIds?.has(v.vendor_id)}
                onOpenVendorChat={onOpenVendorChat}
              />
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-on-surface-variant">
            No vendors match this filter.
          </p>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase text-on-surface-variant">
        <p>Showing {sorted.length} of {vendors.length} vendors</p>
        <p>Prev | Page 01 of {Math.max(1, Math.ceil(vendors.length / 5))} | Next</p>
      </div>
    </div>
  );
}
