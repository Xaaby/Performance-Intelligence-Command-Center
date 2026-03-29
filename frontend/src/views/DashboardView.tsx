import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardFilter, VendorScore, VendorsSummary } from '../types/vendor.types';
import type { SystemStatus } from '../App';
import type { AppTab } from '../components/layout/Navigation';
import { LiveFeedPanel, type FeedRowItem } from '../components/dashboard/LiveFeedPanel';
import { VendorTable } from '../components/dashboard/VendorTable';
import { VendorAnalystPanel } from '../components/chat/VendorAnalystPanel';
import { WithoutFraudPanel } from '../components/dashboard/WithoutFraudPanel';
import { useLiveFeed } from '../hooks/useLiveFeed';

type Props = {
  vendors: VendorScore[];
  summary: VendorsSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  systemStatus: SystemStatus;
  onChangeTab: (t: AppTab) => void;
  onResumeSystem: () => void;
  onLiveClicksChange?: (totalClicks: number) => void;
  externalVendorFocus?: { vendorId: string; vendorName?: string; requestId: number } | null;
};

export function DashboardView({
  vendors,
  summary,
  loading,
  error,
  onRetry,
  systemStatus,
  onChangeTab,
  onResumeSystem,
  onLiveClicksChange,
  externalVendorFocus,
}: Props) {
  const suspended = systemStatus === 'SUSPENDED';
  const { stats, events, updates, stale } = useLiveFeed(suspended);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  const [showExecuteBanner, setShowExecuteBanner] = useState(false);
  const [optimizedModalOpen, setOptimizedModalOpen] = useState(false);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [showFeed, setShowFeed] = useState(true);
  const [riskBudgetDisplay, setRiskBudgetDisplay] = useState(0);
  const [injectedFeedRows, setInjectedFeedRows] = useState<FeedRowItem[]>([]);
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [highlightedVendorId, setHighlightedVendorId] = useState<string | null>(null);
  const [highlightedVendorName, setHighlightedVendorName] = useState<string | null>(null);
  const [forcedFilter, setForcedFilter] = useState<DashboardFilter | null>(null);
  const [forcedFilterKey, setForcedFilterKey] = useState(0);
  const [forcedSort, setForcedSort] = useState<'effective_score' | 'tqs'>('effective_score');
  const [forcedSortKey, setForcedSortKey] = useState(0);
  const [highlightHeaderKey, setHighlightHeaderKey] = useState(0);
  const [pulseAtRiskTabKey, setPulseAtRiskTabKey] = useState(0);
  const [chatVendor, setChatVendor] = useState<VendorScore | null>(null);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [flaggedBadgeBouncing, setFlaggedBadgeBouncing] = useState(false);
  const [flaggedCountPulsing, setFlaggedCountPulsing] = useState(false);
  const previousStatusRef = useRef<SystemStatus>(systemStatus);
  const [simulationVendors, setSimulationVendors] = useState<VendorScore[] | null>(null);
  const [executeSummary, setExecuteSummary] = useState({
    quarantinedCount: 0,
    recoveredAmountK: 0,
    topVendorCount: 0,
    quarantinedIds: new Set<string>(),
  });
  const [optimizeSummary, setOptimizeSummary] = useState({
    upliftPct: 0,
    recipientCount: 0,
    amountK: 0,
  });

  const displayVendors = simulationVendors ?? vendors;
  const changedVendorIds = new Set(
    updates
      .filter((u) => Date.now() - Date.parse(u.changed_at) <= 15_000)
      .map((u) => u.vendor_id),
  );
  const monthlyBudget = 500_000;
  const fraudVendors = displayVendors.filter(
    (v) =>
      v.budget_decision === 'emergency_pause' ||
      v.fraud_status === 'auto_pause' ||
      v.fraud_p >= 0.6,
  );
  const avgTqs = displayVendors.length
    ? (displayVendors.reduce((s, v) => s + v.tqs, 0) / displayVendors.length) * 100
    : 0;
  const atRiskPct =
    fraudVendors.reduce((s, v) => s + v.budget_allocation_pct, 0) / 100;
  const riskBudgetUsd = Math.min(atRiskPct * monthlyBudget, monthlyBudget * 0.3);
  const flaggedCount = displayVendors.filter(
    (v) =>
      v.budget_decision === 'emergency_pause' || v.fraud_status === 'auto_pause',
  ).length;
  const flaggedBadge = filterActive ? 'QUARANTINED' : systemStatus === 'SUSPENDED' ? 'SUSPENDED' : 'HIGHRISK';

  useEffect(() => {
    if (!filterActive) {
      setSimulationVendors(null);
    }
  }, [vendors, filterActive]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    if (previousStatus !== systemStatus) {
      if (systemStatus === 'SUSPENDED') {
        setInjectedFeedRows((prev) => [
          {
            title: 'KILLSWITCH ACTIVATED - All Traffic Halted',
            body: 'Emergency protocol engaged. All vendor traffic routing suspended. Manual restart required.',
            tone: 'error',
            stamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
      }
      if (previousStatus === 'SUSPENDED' && systemStatus === 'ACTIVE') {
        setInjectedFeedRows((prev) => [
          {
            title: 'System Restored - Traffic Routing Active',
            body: 'All vendor allocations restored. Monitoring resumed.',
            tone: 'tertiary',
            stamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
      }
    }
    previousStatusRef.current = systemStatus;
  }, [systemStatus]);

  useEffect(() => {
    if (filterActive) return;
    setRiskBudgetDisplay(riskBudgetUsd / 1000);
  }, [riskBudgetUsd, filterActive]);

  useEffect(() => {
    if (!exportToast) return;
    const id = window.setTimeout(() => setExportToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [exportToast]);

  useEffect(() => {
    onLiveClicksChange?.(stats?.total_clicks_last_60s ?? 0);
  }, [onLiveClicksChange, stats?.total_clicks_last_60s]);

  const handleExecuteNow = () => {
    if (executeLoading || filterActive) return;
    setExecuteLoading(true);
    window.setTimeout(() => {
      const quarantineTargets = displayVendors.filter(
        (v) => v.budget_decision === 'emergency_pause' || v.fraud_p >= 0.8,
      );
      const quarantinedIds = new Set(quarantineTargets.map((v) => v.vendor_id));
      const recoveredPct = quarantineTargets.reduce((sum, v) => sum + v.budget_allocation_pct, 0);
      const topVendors = displayVendors.filter(
        (v) => !quarantinedIds.has(v.vendor_id) && v.effective_score >= 0.75,
      );
      const topCurrentPct = topVendors.reduce((sum, v) => sum + v.budget_allocation_pct, 0);

      const reallocated = displayVendors.map((v) => {
        if (quarantinedIds.has(v.vendor_id)) {
          return {
            ...v,
            budget_allocation_pct: 0,
            budget_decision_label: 'Quarantined - pending review',
          };
        }
        if (topVendors.some((tv) => tv.vendor_id === v.vendor_id) && recoveredPct > 0) {
          const weight = topCurrentPct > 0 ? v.budget_allocation_pct / topCurrentPct : 1 / topVendors.length;
          return {
            ...v,
            budget_allocation_pct: v.budget_allocation_pct + recoveredPct * weight,
          };
        }
        return v;
      });

      setSimulationVendors(reallocated);
      setFilterActive(true);
      setShowExecuteBanner(true);
      setExecuteLoading(false);
      setExecuteSummary({
        quarantinedCount: quarantineTargets.length,
        recoveredAmountK: (recoveredPct / 100) * (monthlyBudget / 1000),
        topVendorCount: topVendors.length,
        quarantinedIds,
      });
      setInjectedFeedRows((prev) => [
        {
          title: 'Global Fraud Filter Activated',
          body: `${quarantineTargets.length} vendors suspended. Budget reallocated.`,
          tone: 'tertiary',
          stamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);

      const start = riskBudgetDisplay;
      const startAt = performance.now();
      const duration = 800;
      const animate = (now: number) => {
        const progress = Math.min(1, (now - startAt) / duration);
        setRiskBudgetDisplay(start + (0 - start) * progress);
        if (progress < 1) {
          window.requestAnimationFrame(animate);
        }
      };
      window.requestAnimationFrame(animate);
    }, 1500);
  };

  const handleOptimizeReach = () => {
    if (optimizeLoading) return;
    setOptimizeLoading(true);
    window.setTimeout(() => {
      const ranked = [...displayVendors].sort((a, b) => b.effective_score - a.effective_score);
      const recipients = ranked.filter((v) => v.effective_score >= 0.75).slice(0, 6);
      const amountK = recipients.reduce((sum, v) => sum + v.budget_allocation_pct, 0) * 0.12;
      setOptimizeSummary({
        upliftPct: Math.max(0.8, Math.min(7.5, recipients.length * 0.9)),
        recipientCount: recipients.length,
        amountK: Number(amountK.toFixed(1)),
      });
      setOptimizeLoading(false);
      setOptimizedModalOpen(true);
    }, 2000);
  };

  const handleFeedEventClick = (vendorId: string, vendorName?: string) => {
    if (!vendorId) return;
    setExpandedVendorId(vendorId);
    const element = document.getElementById(`vendor-row-${vendorId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setHighlightedVendorId(vendorId);
    setHighlightedVendorName(vendorName ?? null);
    window.setTimeout(() => {
      setHighlightedVendorId((cur) => (cur === vendorId ? null : cur));
      setHighlightedVendorName((cur) => (cur === (vendorName ?? null) ? null : cur));
    }, 2000);
  };

  const scrollToVendorTable = () => {
    const section = document.getElementById('vendor-risk-matrix-section');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activateTableFilter = (nextFilter: DashboardFilter) => {
    setForcedFilter(nextFilter);
    setForcedFilterKey(Date.now());
  };

  const handleTotalActiveClick = () => {
    onChangeTab('dashboard');
    activateTableFilter('all');
    setHighlightHeaderKey(Date.now());
    scrollToVendorTable();
  };

  const handleFlaggedClick = () => {
    activateTableFilter('fraud_alert');
    setPulseAtRiskTabKey(Date.now());
    setFlaggedBadgeBouncing(true);
    setFlaggedCountPulsing(true);
    scrollToVendorTable();
    window.setTimeout(() => {
      setFlaggedBadgeBouncing(false);
      setFlaggedCountPulsing(false);
    }, 500);
  };

  const handleAvgQualityClick = () => {
    setForcedSort('tqs');
    setForcedSortKey(Date.now());
    scrollToVendorTable();
  };

  const handleBudgetAtRiskClick = () => {
    onChangeTab('reallocation');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('flash-budget-recovered'));
      const target = document.getElementById('budget-recovered-kpi');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  useEffect(() => {
    if (!externalVendorFocus?.vendorId) return;
    handleFeedEventClick(externalVendorFocus.vendorId, externalVendorFocus.vendorName);
  }, [externalVendorFocus?.requestId]);

  const getTierLabel = (effectiveScore: number) => {
    if (effectiveScore >= 0.85) return 'PLATINUM';
    if (effectiveScore >= 0.7) return 'GOLD';
    if (effectiveScore >= 0.5) return 'SILVER';
    return 'RESTRICTED';
  };

  const csvSnapshot = useMemo(() => {
    const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const lines = [
      'TRAFFIC INTELLIGENCE FRAMEWORK - DASHBOARD SNAPSHOT',
      `Generated,${quote(new Date().toLocaleString())}`,
      'System,SENTINEL_NODE_01 // 99.9% UPTIME',
      '',
      'KPI SUMMARY',
      `Total Active Vendors,${displayVendors.length}`,
      `Flagged Entities,${flaggedCount}`,
      `Avg Quality Score,${avgTqs.toFixed(1)}`,
      `Budget at Risk,$${riskBudgetDisplay.toFixed(1)}K`,
      '',
      'VENDOR RISK MATRIX',
      'Rank,Vendor,Campaign,Quality Score,Fraud Prob,Effective Score,Tier,Status,Budget %,Decision',
      ...displayVendors.map((v, i) =>
        [
          i + 1,
          quote(v.vendor_name),
          quote(v.campaign_name),
          (v.tqs * 100).toFixed(1),
          `${(v.fraud_p * 100).toFixed(1)}%`,
          (v.effective_score * 100).toFixed(1),
          getTierLabel(v.effective_score),
          executeSummary.quarantinedIds.has(v.vendor_id) ? 'QUARANTINED' : v.fraud_status,
          `${v.budget_allocation_pct.toFixed(1)}%`,
          quote(
            executeSummary.quarantinedIds.has(v.vendor_id)
              ? 'Quarantined - pending review'
              : v.budget_decision_label,
          ),
        ].join(','),
      ),
    ];
    return lines.join('\n');
  }, [avgTqs, displayVendors, executeSummary.quarantinedIds, flaggedCount, riskBudgetDisplay]);

  const handleExportSnapshot = () => {
    if (exportLoading) return;
    setExportLoading(true);
    window.setTimeout(() => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const blob = new Blob([csvSnapshot], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TIF_Snapshot_${timestamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportToast(`✓ Snapshot exported - TIF_Snapshot_${timestamp}.csv`);
      setExportLoading(false);
    }, 500);
  };

  return (
    <div
      className={`mx-auto max-w-[1700px] space-y-6 transition-all duration-300 ${chatPanelOpen ? 'mr-[380px]' : 'mr-0'}`}
    >
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface">Performance Intelligence Command Center</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Live vendor scoring, fraud detection, and automated budget optimization — continuously operating across {displayVendors.length} active sources.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group/btn">
            <button
              type="button"
              disabled={exportLoading}
              onClick={handleExportSnapshot}
              className="inline-flex items-center gap-1 rounded border border-outline-variant/15 px-3 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className={`material-symbols-outlined text-sm ${exportLoading ? 'animate-spin' : ''}`}>
                {exportLoading ? 'progress_activity' : 'download'}
              </span>
              EXPORT SNAPSHOT
            </button>
            <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-64 rounded border border-outline-variant/20 bg-surface-container-high p-3 opacity-0 transition-opacity duration-200 group-hover/btn:opacity-100">
              <p className="font-mono text-[10px] leading-relaxed text-on-surface-variant">
                Downloads current vendor risk matrix as CSV with scores, decisions, and budget recommendations. Time-stamped for audit records.
              </p>
            </div>
          </div>
          <div className="relative group/btn">
            <button
              type="button"
              disabled={optimizeLoading}
              onClick={handleOptimizeReach}
              className="rounded px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#0d0096] disabled:cursor-not-allowed disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #c0c1ff, #8083ff)' }}
            >
              <span className="inline-flex items-center gap-1">
                {optimizeLoading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                {optimizeLoading ? 'OPTIMIZING...' : 'OPTIMIZE REACH'}
              </span>
            </button>
            <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-64 rounded border border-outline-variant/20 bg-surface-container-high p-3 opacity-0 transition-opacity duration-200 group-hover/btn:opacity-100">
              <p className="font-mono text-[10px] leading-relaxed text-on-surface-variant">
                Reallocates budget from underperforming vendors to top-tier performers. Does not affect fraud quarantine status. Optimizes distribution across verified sources only.
              </p>
            </div>
          </div>
        </div>
      </section>

      {showExecuteBanner && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-tertiary/20 bg-tertiary/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-tertiary/20">
              <span className="material-symbols-outlined text-sm text-tertiary">verified</span>
            </div>
            <div>
              <p className="font-mono text-xs font-bold text-tertiary">GLOBAL FRAUD FILTER EXECUTED</p>
              <p className="mt-0.5 font-mono text-[10px] text-on-surface-variant">
                {executeSummary.quarantinedCount} vendors quarantined - ${executeSummary.recoveredAmountK.toFixed(1)}K recovered and
                reallocated to {executeSummary.topVendorCount} verified sources
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowExecuteBanner(false)}
            className="ml-4 text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {(error || stale) && (
        <div className="flex items-center justify-between gap-2 rounded border-l-4 border-error bg-[#1C0505] px-4 py-3 text-sm text-error">
          <p className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-base">warning</span>
            {error ?? 'Data synchronization latency detected in region. Vendor scores may be lagging.'}
          </p>
          <button type="button" onClick={() => void onRetry()} className="font-mono text-xs uppercase tracking-wide text-error">
            Retry Sync
          </button>
        </div>
      )}

      <section className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Total Active Vendors"
          value={`${summary?.total_vendors ?? displayVendors.length}`}
          sub="+4.2%"
          subClass="text-tertiary"
          onClick={handleTotalActiveClick}
        />
        <KpiCard
          label="Flagged Entities"
          value={`${flaggedCount}`}
          sub={flaggedBadge}
          subClass={`inline-block rounded bg-error/10 px-2 py-0.5 text-error ${flaggedBadgeBouncing ? 'animate-bounce' : ''}`}
          valueClass={flaggedCountPulsing ? 'animate-pulse' : undefined}
          onClick={handleFlaggedClick}
        />
        <KpiCard
          label="Avg Quality Score"
          value={avgTqs.toFixed(1)}
          sub="/100"
          valueClass={avgTqs > 75 ? 'text-tertiary' : avgTqs >= 50 ? 'text-secondary' : 'text-error'}
          onClick={handleAvgQualityClick}
        />
        <KpiCard
          label="Budget At Risk"
          value={systemStatus === 'SUSPENDED' ? 'ALL PAUSED' : `$${riskBudgetDisplay.toFixed(1)}K`}
          sub="USD"
          valueClass={riskBudgetUsd / monthlyBudget > 0.2 ? 'text-error' : 'text-on-surface'}
          onClick={handleBudgetAtRiskClick}
        />
      </section>

      {loading && !vendors.length && !error && (
        <section className="grid gap-3 md:grid-cols-4">
          {[...Array.from({ length: 4 })].map((_, i) => (
            <div key={i} className="shimmer h-28 rounded-lg bg-surface-container-low" />
          ))}
        </section>
      )}

      {!!vendors.length &&
        (showFeed ? (
          <section className="grid grid-cols-[5fr_7fr] items-stretch gap-6">
            <div className="h-full">
              <LiveFeedPanel
                stats={stats}
                events={events}
                vendors={displayVendors}
                stale={stale}
                systemStatus={systemStatus}
                injectedRows={injectedFeedRows}
                onResume={onResumeSystem}
                onFeedEventClick={handleFeedEventClick}
                onRequestHide={() => setShowFeed(false)}
              />
              {highlightedVendorId && highlightedVendorName && (
                <div className="mt-3 flex items-center justify-between rounded bg-surface-container-high px-4 py-2">
                  <span className="font-mono text-[10px] text-on-surface-variant">
                    Viewing: {highlightedVendorName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHighlightedVendorId(null);
                      setHighlightedVendorName(null);
                    }}
                    className="font-mono text-[10px] text-primary hover:text-primary/80"
                  >
                    Clear →
                  </button>
                </div>
              )}
            </div>
            <div className="h-full">
              <WithoutFraudPanel
                vendors={displayVendors}
                systemStatus={systemStatus}
                onExecute={handleExecuteNow}
                executeLoading={executeLoading}
                filterActive={filterActive}
                feedVisible
              />
            </div>
          </section>
        ) : (
          <section>
            <div className="mb-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowFeed(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowFeed(true);
                  }
                }}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-outline-variant/10 bg-surface-container-low px-4 py-3 transition-colors hover:bg-surface-container"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-tertiary" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                    Live Threat Feed — STREAMING
                  </span>
                </div>
                <span className="font-mono text-[10px] text-primary">SHOW →</span>
              </div>
            </div>
            {highlightedVendorId && highlightedVendorName && (
              <div className="mb-3 flex items-center justify-between rounded bg-surface-container-high px-4 py-2">
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Viewing: {highlightedVendorName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setHighlightedVendorId(null);
                    setHighlightedVendorName(null);
                  }}
                  className="font-mono text-[10px] text-primary hover:text-primary/80"
                >
                  Clear →
                </button>
              </div>
            )}
            <div className="w-full">
              <WithoutFraudPanel
                vendors={displayVendors}
                systemStatus={systemStatus}
                onExecute={handleExecuteNow}
                executeLoading={executeLoading}
                filterActive={filterActive}
                feedVisible={false}
              />
            </div>
          </section>
        ))}

      {!!vendors.length && (
        <section id="vendor-risk-matrix-section" className="mt-6">
          <VendorTable
            vendors={displayVendors}
            changedVendorIds={changedVendorIds}
            systemStatus={systemStatus}
            quarantinedIds={executeSummary.quarantinedIds}
            expandedVendorId={expandedVendorId}
            onExpandedVendorChange={setExpandedVendorId}
            highlightedVendorId={highlightedVendorId}
            forcedFilter={forcedFilter}
            forcedFilterKey={forcedFilterKey}
            forcedSort={forcedSort}
            forcedSortKey={forcedSortKey}
            highlightHeaderKey={highlightHeaderKey}
            pulseAtRiskTabKey={pulseAtRiskTabKey}
            onOpenVendorChat={(v) => {
              setChatVendor(v);
              setChatPanelOpen(true);
            }}
          />
        </section>
      )}

      {optimizedModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-primary/20 bg-surface-container-high p-6 shadow-[0_0_40px_rgba(192,193,255,0.1)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-headline text-xl font-bold text-on-surface">Reach Optimization Complete</h3>
                <p className="font-mono text-[10px] text-on-surface-variant">PROGRAMMATIC_REALLOCATION_v2 // EXECUTED</p>
              </div>
              <button
                type="button"
                onClick={() => setOptimizedModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <p className="flex items-center justify-between rounded border border-tertiary/20 bg-tertiary/5 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-sm text-tertiary">trending_up</span>
                  Budget efficiency gain
                </span>
                <span className="font-mono font-bold text-tertiary">+{optimizeSummary.upliftPct.toFixed(1)}%</span>
              </p>
              <p className="flex items-center justify-between rounded border border-primary/20 bg-primary/5 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-sm text-primary">trending_flat</span>
                  Vendors receiving increased allocation
                </span>
                <span className="font-mono font-bold text-primary">{optimizeSummary.recipientCount} vendors</span>
              </p>
              <p className="flex items-center justify-between rounded border border-tertiary/20 bg-tertiary/5 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-sm text-tertiary">attach_money</span>
                  Monthly reach improvement
                </span>
                <span className="font-mono font-bold text-tertiary">+${optimizeSummary.amountK.toFixed(1)}K estimated</span>
              </p>
            </div>

            <div className="mt-5 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">Before optimization</p>
              <div className="h-3 w-full rounded bg-surface-container">
                <div className="h-3 w-1/2 rounded bg-primary/40" />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">After optimization</p>
              <div className="h-3 w-full rounded bg-surface-container">
                <div className="h-3 w-4/5 rounded bg-tertiary/70" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setOptimizedModalOpen(false);
                onChangeTab('reallocation');
              }}
              className="mt-6 w-full rounded bg-primary-container px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[#0d0096]"
            >
              VIEW REALLOCATION DETAILS
            </button>
          </div>
        </div>
      )}

      <VendorAnalystPanel
        vendor={chatVendor}
        isOpen={chatPanelOpen && chatVendor !== null}
        onClose={() => {
          setChatPanelOpen(false);
          setChatVendor(null);
        }}
      />

      {exportToast && (
        <div className="fixed bottom-4 right-4 rounded-lg border border-outline-variant/20 bg-surface-container-high px-4 py-3 font-mono text-xs text-on-surface">
          {exportToast}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  subClass,
  valueClass,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  subClass?: string;
  valueClass?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative min-w-[200px] cursor-pointer rounded-lg bg-surface-container-low p-5 text-left transition-colors duration-150 hover:bg-surface-container-high"
    >
      <div className="mb-3 h-0.5 w-20 bg-primary/40" />
      <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className={`mt-2 font-mono text-4xl font-bold text-on-surface ${valueClass ?? ''}`}>{value}</p>
      <p className={`mt-1 text-xs text-on-surface-variant ${subClass ?? ''}`}>{sub}</p>
      <span className="material-symbols-outlined absolute bottom-3 right-3 text-sm text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100">
        arrow_forward
      </span>
    </button>
  );
}
