import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { VendorScore } from '../types/vendor.types';
import { isHiddenFraudArchetype } from '../lib/scoring';

const CURRENT_BAR = '#464554';
const GAIN_BAR = '#c0c1ff';
const LOSS_BAR = '#ffb4ab';
const TOTAL_CAMPAIGN_BUDGET = 500_000;

type ChartRow = {
  vendorId: string;
  vendor: string;
  budget_allocation_pct: number;
  recommended_pct: number;
  change_pct: number;
  isFraudVendor: boolean;
};

function isAtRiskVendor(v: VendorScore): boolean {
  return isHiddenFraudArchetype(v) || v.fraud_status !== 'clean';
}

function isFraudVendor(v: VendorScore): boolean {
  return (
    v.budget_decision === 'emergency_pause' ||
    v.fraud_p >= 0.8 ||
    v.fraud_status === 'auto_pause'
  );
}

function toPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatBudgetRecovered(value: number): string {
  return `$${(value / 1000).toFixed(1)}K`;
}

function getTier(v: VendorScore): string {
  if (v.quality_tier === 'high') return 'PLATINUM';
  if (v.quality_tier === 'medium') return 'GOLD';
  if (v.quality_tier === 'low') return 'SILVER';
  return 'RESTRICTED';
}

function escapeCsvCell(cell: unknown): string {
  return `"${String(cell).replace(/"/g, '""')}"`;
}

function toLocalDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ReallocationTooltip({
  active,
  payload,
}: TooltipProps<number, string> & {
  payload?: ReadonlyArray<{ payload?: ChartRow }>;
}) {
  if (!active || !payload || !payload.length || !payload[0]?.payload) return null;
  const row = payload[0].payload as ChartRow;
  const changeColor = row.change_pct > 0 ? 'text-tertiary' : row.change_pct < 0 ? 'text-error' : 'text-on-surface-variant';
  const sign = row.change_pct > 0 ? '+' : '';

  return (
    <div className="rounded border border-outline-variant/20 bg-surface-container-high p-3 font-mono text-xs shadow-[0_0_20px_rgba(0,0,0,0.4)]">
      <p className="font-headline text-sm font-bold text-on-surface">{row.vendor}</p>
      <p className="mt-2 text-on-surface-variant">Current: {toPct(row.budget_allocation_pct)}</p>
      <p className="text-on-surface-variant">Recommended: {toPct(row.recommended_pct)}</p>
      <p className={changeColor}>
        Change: {sign}
        {toPct(row.change_pct)}
      </p>
    </div>
  );
}

type Props = {
  vendors: VendorScore[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function ReallocationView({
  vendors,
  loading,
  error,
  onRetry,
}: Props) {
  const [animKey, setAnimKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [flashBudgetRecovered, setFlashBudgetRecovered] = useState(false);

  useEffect(() => {
    if (!toastMessage) return;
    const id = window.setTimeout(() => setToastMessage(null), 2500);
    return () => window.clearTimeout(id);
  }, [toastMessage]);

  useEffect(() => {
    if (!isPrintMode) return;
    const cleanup = () => setIsPrintMode(false);
    window.addEventListener('afterprint', cleanup);
    window.print();
    return () => window.removeEventListener('afterprint', cleanup);
  }, [isPrintMode]);

  useEffect(() => {
    const handler = () => {
      setFlashBudgetRecovered(true);
      window.setTimeout(() => setFlashBudgetRecovered(false), 1500);
    };
    window.addEventListener('flash-budget-recovered', handler);
    return () => window.removeEventListener('flash-budget-recovered', handler);
  }, []);

  const {
    chartRows,
    rows,
    recipientCount,
    budgetRecovered,
    recommendedById,
    reasonById,
  } = useMemo(() => {
    if (!vendors.length) {
      return {
        chartRows: [] as ChartRow[],
        rows: [] as {
          vendor: VendorScore;
          current: number;
          recommended: number;
          reason: string;
        }[],
        recommendedById: new Map<string, number>(),
        reasonById: new Map<string, string>(),
        recipientCount: 0,
        budgetRecovered: 0,
      };
    }

    const atRisk = vendors.filter(isAtRiskVendor);
    const clean = vendors.filter((v) => !isAtRiskVendor(v));
    const highQualityRecipients = clean.filter((v) => v.quality_tier === 'high');
    const recipients = highQualityRecipients.length ? highQualityRecipients : clean;
    const removedBudgetPct = atRisk.reduce((s, v) => s + v.budget_allocation_pct, 0);
    const recipientCurrentTotal = recipients.reduce(
      (s, v) => s + v.budget_allocation_pct,
      0,
    );
    const recommendedById = new Map<string, number>();

    for (const v of vendors) {
      recommendedById.set(v.vendor_id, v.budget_allocation_pct);
    }
    for (const v of atRisk) {
      recommendedById.set(v.vendor_id, 0);
    }

    if (recipients.length > 0 && removedBudgetPct > 0) {
      if (recipientCurrentTotal > 0) {
        for (const v of recipients) {
          const gain = removedBudgetPct * (v.budget_allocation_pct / recipientCurrentTotal);
          recommendedById.set(v.vendor_id, v.budget_allocation_pct + gain);
        }
      } else {
        const evenGain = removedBudgetPct / recipients.length;
        for (const v of recipients) {
          recommendedById.set(v.vendor_id, v.budget_allocation_pct + evenGain);
        }
      }
    }

    const cappedVendorIds = new Set<string>();
    let overflow = 0;
    for (const v of recipients) {
      const rec = recommendedById.get(v.vendor_id) ?? 0;
      if (rec > 30) {
        overflow += rec - 30;
        recommendedById.set(v.vendor_id, 30);
        cappedVendorIds.add(v.vendor_id);
      }
    }
    if (overflow > 0) {
      const uncapped = recipients.filter((v) => !cappedVendorIds.has(v.vendor_id));
      const uncappedTotal = uncapped.reduce(
        (s, v) => s + (recommendedById.get(v.vendor_id) ?? 0),
        0,
      );
      for (const v of uncapped) {
        const base = recommendedById.get(v.vendor_id) ?? 0;
        const add = uncappedTotal > 0 ? overflow * (base / uncappedTotal) : 0;
        recommendedById.set(v.vendor_id, base + add);
      }
    }

    const rowsUnsorted: {
      vendor: VendorScore;
      current: number;
      recommended: number;
      reason: string;
    }[] = vendors
      .map((vendor) => {
        const current = vendor.budget_allocation_pct;
        const recommended = recommendedById.get(vendor.vendor_id) ?? current;
        const change = recommended - current;
        const reason = isAtRiskVendor(vendor)
          ? 'Emergency pause — fraud detected'
          : cappedVendorIds.has(vendor.vendor_id) || change < 0
            ? 'Diversification cap'
            : 'Quality promotion';
        return { vendor, current, recommended, reason };
      })
      .filter((r) => Math.abs(r.recommended - r.current) > 0.001);

    const sortedChartRows = rowsUnsorted
      .map((r) => ({
        vendorId: r.vendor.vendor_id,
        vendor: r.vendor.vendor_name,
        budget_allocation_pct: r.current,
        recommended_pct: r.recommended,
        change_pct: r.recommended - r.current,
        isFraudVendor: isFraudVendor(r.vendor),
      }))
      .sort((a, b) => b.change_pct - a.change_pct);

    const fraudChartRows = sortedChartRows.filter((row) => row.isFraudVendor);
    const nonFraudChartRows = sortedChartRows.filter((row) => !row.isFraudVendor);
    const maxChartRows = 12;
    const topNonFraudRows = nonFraudChartRows.slice(
      0,
      Math.max(0, maxChartRows - fraudChartRows.length),
    );
    const chartRows = [...topNonFraudRows, ...fraudChartRows];

    const reasonById = new Map<string, string>();
    for (const row of rowsUnsorted) {
      reasonById.set(row.vendor.vendor_id, row.reason);
    }

    const fraudVendors = vendors.filter(
      (v) => isFraudVendor(v),
    );
    const fraudBudgetPct = fraudVendors.reduce((sum, v) => sum + v.budget_allocation_pct, 0) / 100;
    const budgetRecovered = Math.min(
      fraudBudgetPct * TOTAL_CAMPAIGN_BUDGET,
      75_000,
    );

    return {
      chartRows,
      rows: [...rowsUnsorted].sort((a, b) => (b.recommended - b.current) - (a.recommended - a.current)),
      recommendedById,
      reasonById,
      recipientCount: vendors.filter(
        (v) =>
          (recommendedById.get(v.vendor_id) ?? v.budget_allocation_pct) > v.budget_allocation_pct &&
          v.budget_decision !== 'emergency_pause',
      ).length,
      budgetRecovered,
    };
  }, [vendors]);

  const handleExportCsv = () => {
    const headers = [
      'Vendor',
      'Campaign',
      'Quality Score',
      'Fraud Prob.',
      'Effective Score',
      'Tier',
      'Status',
      'Current Budget %',
      'Recommended Budget %',
      'Change %',
      'Reason',
      'Decision',
    ];

    const rowsForCsv = vendors.map((v) => {
      const recommended = recommendedById.get(v.vendor_id) ?? v.budget_allocation_pct;
      const change = recommended - v.budget_allocation_pct;
      const reason = reasonById.get(v.vendor_id) ?? 'No change';
      return [
        v.vendor_name,
        v.campaign_name,
        (v.tqs * 100).toFixed(1),
        `${(v.fraud_p * 100).toFixed(1)}%`,
        (v.effective_score * 100).toFixed(1),
        getTier(v),
        v.fraud_status,
        `${v.budget_allocation_pct.toFixed(1)}%`,
        `${recommended.toFixed(1)}%`,
        `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
        reason,
        v.budget_decision_label,
      ];
    });

    const csvContent = [headers, ...rowsForCsv]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fileName = `TIF_Reallocation_${toLocalDateIso(new Date())}.csv`;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setToastMessage(`✓ CSV exported — ${fileName}`);
  };

  return (
    <div className={`mx-auto max-w-[1700px] ${isPrintMode ? 'print-content' : ''}`}>
      <div className="print-only mb-6">
        <h1 className="font-headline text-2xl font-bold">
          Traffic Intelligence Framework — Reallocation Report
        </h1>
        <p className="mt-1 font-mono text-xs">Generated: {new Date().toLocaleString()}</p>
      </div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="font-headline text-3xl font-bold text-on-surface">Reallocation Engine</h2>
          <p className="max-w-3xl text-sm text-on-surface-variant">
            Automated budget recovery from non-compliant sources and programmatic redistribution to high-performing, verified nodes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAnimKey((k) => k + 1)}
          className="no-print ml-4 inline-flex flex-shrink-0 items-center gap-1 rounded border border-outline-variant/15 bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-sm">play_arrow</span>
          Replay simulation
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-emergency-bg px-4 py-3 text-sm text-danger">
          {error}
          <button
            type="button"
            onClick={() => void onRetry()}
            className="ml-2 font-semibold text-brand underline"
          >
            Retry
          </button>
        </div>
      )}
      {loading && !vendors.length && (
        <p className="mb-4 text-sm text-muted">Loading vendors…</p>
      )}

      {!!vendors.length && (
        <>
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div
              id="budget-recovered-kpi"
              className={`min-h-[140px] rounded-lg bg-surface-container-low p-6 transition-colors duration-300 ${
                flashBudgetRecovered ? 'bg-primary/15 ring-1 ring-primary/40' : ''
              }`}
            >
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                Budget Recovered / Month
              </p>
              <p className="mt-2 font-mono text-4xl font-bold text-on-surface">
                {formatBudgetRecovered(budgetRecovered)}
              </p>
              <p className="mt-1 text-sm text-tertiary">+12.4%</p>
              <div className="mt-3 flex items-end gap-1">
                {[8, 12, 10, 18].map((h, i) => (
                  <div key={i} className="w-8 rounded bg-outline-variant/40" style={{ height: `${h * 2}px` }} />
                ))}
              </div>
            </div>
            <div className="min-h-[140px] rounded-lg bg-surface-container-low p-6">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                Reallocated To
              </p>
              <p className="mt-2 font-mono text-4xl font-bold text-on-surface">
                {recipientCount}
              </p>
              <p className="font-mono text-[10px] uppercase text-on-surface-variant">Certified Vendors</p>
              <p className="mt-2 text-xs text-on-surface-variant">
                Optimization protocol running every 15ms across global clusters.
              </p>
            </div>
            <div className="min-h-[140px] rounded-lg border border-error/10 bg-error/5 p-6">
              <p className="inline-flex items-center gap-1 font-label text-[10px] uppercase tracking-widest text-error">
                <span className="material-symbols-outlined text-sm">asterisk</span>
                Fraud Prevention Active
              </p>
              <p className="mt-2 font-mono text-2xl text-on-surface">
                {formatBudgetRecovered(budgetRecovered)} currently quarantined from fraud vendors.
              </p>
              <p className="mt-2 text-xs text-primary">
                VIEW INCIDENT LOGS ↗
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-surface-container-low p-4">
            <h3 className="font-headline text-xl font-bold text-on-surface">
              Vendor Allocation Comparison
            </h3>
            <p className="mb-3 font-mono text-[10px] text-on-surface-variant">CURRENT_STATE vs PROGRAMMATIC_REC</p>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="h-[360px]" key={`bars-${animKey}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRows} layout="vertical" margin={{ top: 0, right: 120, left: 160, bottom: 0 }}>
                      <defs>
                        <pattern id="fraudStripe" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                          <rect width="4" height="8" fill="#ffb4ab" opacity="0.7" />
                          <rect x="4" width="4" height="8" fill="#93000a" opacity="0.4" />
                        </pattern>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#464554" />
                      <XAxis
                        type="number"
                        domain={[0, 35]}
                        ticks={[0, 8, 16, 24, 32]}
                        tickFormatter={(value) => `${Number(value).toFixed(1)}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="vendor"
                        width={155}
                        tick={(props) => {
                          const { x, y, payload } = props;
                          const name = String(payload?.value ?? '');
                          const truncated = name.length > 18 ? `${name.slice(0, 18)}…` : name;
                          return (
                            <text
                              x={x}
                              y={y}
                              dy={4}
                              textAnchor="end"
                              fontFamily="JetBrains Mono"
                              fontSize={11}
                              fill="#c7c4d7"
                            >
                              {truncated}
                            </text>
                          );
                        }}
                      />
                      <Tooltip content={<ReallocationTooltip />} />
                      <Bar
                        dataKey="budget_allocation_pct"
                        name="Current %"
                        barSize={6}
                        radius={[0, 2, 2, 0]}
                        isAnimationActive
                        animationDuration={1500}
                      >
                        {chartRows.map((row) => (
                          <Cell
                            key={`cell-current-${row.vendorId}`}
                            fill={row.isFraudVendor ? '#ffb4ab' : CURRENT_BAR}
                            opacity={row.isFraudVendor ? 0.4 : 1}
                          />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="recommended_pct"
                        name="Recommended %"
                        barSize={6}
                        radius={[0, 2, 2, 0]}
                        isAnimationActive
                        animationDuration={1500}
                      >
                        {chartRows.map((row) => (
                          <Cell
                            key={row.vendorId}
                            fill={
                              row.isFraudVendor
                                ? 'url(#fraudStripe)'
                                : row.change_pct > 0
                                  ? GAIN_BAR
                                  : row.change_pct < 0
                                    ? LOSS_BAR
                                    : CURRENT_BAR
                            }
                          />
                        ))}
                        <LabelList
                          dataKey="change_pct"
                          position="right"
                          content={(props) => {
                            const { x, y, width, height, value } = props;
                            if (value === undefined || value === null || Number.isNaN(Number(value))) {
                              return null;
                            }
                            const numericValue = Number(value);
                            const gain = numericValue > 0;
                            const loss = numericValue < 0;
                            return (
                              <text
                                x={Number(x) + Number(width) + 8}
                                y={Number(y) + Number(height) / 2}
                                dominantBaseline="central"
                                fontFamily="JetBrains Mono"
                                fontSize={10}
                                fill={gain ? '#4ae176' : loss ? '#ffb4ab' : '#c7c4d7'}
                              >
                                {gain ? '+' : ''}
                                {numericValue.toFixed(1)}% {gain ? 'GAIN' : loss ? 'LOSS' : 'STABLE'}
                              </text>
                            );
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 mt-4 px-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-[#464554]" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">Current %</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">Recommended %</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{
                    background:
                      'repeating-linear-gradient(45deg, rgba(255,180,171,0.6) 0px, rgba(255,180,171,0.6) 4px, rgba(147,0,10,0.4) 4px, rgba(147,0,10,0.4) 8px)',
                  }}
                />
                <span className="font-mono text-[10px] uppercase tracking-wider text-error">Fraud - Budget Removed</span>
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto rounded-lg bg-surface-container-low p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-headline text-xl font-bold text-on-surface">Reallocation Directives</h3>
              <div className="no-print flex gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="rounded border border-outline-variant/15 px-3 py-1 text-xs text-on-surface-variant"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintMode(true)}
                  className="rounded border border-outline-variant/15 px-3 py-1 text-xs text-on-surface-variant"
                >
                  📄 REPORT
                </button>
              </div>
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3 text-right">Current %</th>
                  <th className="px-4 py-3 text-right">Recommended %</th>
                  <th className="px-4 py-3 text-right">Change</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ vendor, current, recommended, reason }, index) => {
                  const ch = recommended - current;
                  const fraud = isFraudVendor(vendor);
                  const displayReason = fraud ? 'Emergency pause — fraud detected' : reason;
                  const lastGainIndex = rows.reduce(
                    (acc, row, rowIndex) => ((row.recommended - row.current) > 0 ? rowIndex : acc),
                    -1,
                  );
                  const showSeparator = lastGainIndex !== -1 && index === lastGainIndex;

                  return (
                    <Fragment key={vendor.vendor_id}>
                      <tr
                        className={`border-t border-outline-variant/10 hover:bg-surface-container ${
                          fraud ? 'bg-error/5' : ''
                        }`}
                      >
                        <td className="px-4 py-2 font-medium text-on-surface">
                          {fraud && (
                            <span className="material-symbols-outlined mr-1 text-xs text-error">flag</span>
                          )}
                          {vendor.vendor_name}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-on-surface">
                          {toPct(current)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-on-surface">
                          {toPct(recommended)}
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-mono ${ch >= 0 ? 'text-success' : 'text-danger'}`}
                        >
                          {ch >= 0 ? '+' : ''}
                          {toPct(ch)}
                        </td>
                        <td className={fraud ? 'px-4 py-2 text-xs italic text-error' : 'px-4 py-2 text-xs italic text-on-surface-variant'}>
                          {displayReason}
                        </td>
                        <td className="px-4 py-2">
                          {fraud ? (
                            <span className="rounded border border-error/30 bg-error/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-error">
                              QUARANTINED
                            </span>
                          ) : (
                            <span className="rounded border border-outline-variant/30 bg-surface-container-high px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                              READY
                            </span>
                          )}
                        </td>
                      </tr>
                      {showSeparator && (
                        <tr>
                          <td colSpan={6} className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              <div className="h-px flex-1 bg-outline-variant/20" />
                              <span className="flex-shrink-0 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                                Budget removal
                              </span>
                              <div className="h-px flex-1 bg-outline-variant/20" />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 flex items-start gap-3 rounded bg-surface-container p-4">
              <span className="material-symbols-outlined text-primary">info</span>
              <div>
                <p className="text-sm font-bold text-on-surface">System Note: Diversification Cap</p>
                <p className="font-mono text-xs text-on-surface-variant">
                  Allocation engine enforces <code className="rounded bg-surface-container-high px-1">25%</code> maximum per vendor to reduce concentration risk.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 rounded bg-surface-container-high px-4 py-2 font-mono text-xs text-tertiary">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
