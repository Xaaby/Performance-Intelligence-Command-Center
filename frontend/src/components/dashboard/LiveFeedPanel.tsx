import { useMemo } from 'react';
import type {
  RedirectEvent,
  RedirectStatsResponse,
  VendorScore,
} from '../../types/vendor.types';
import type { SystemStatus } from '../../App';

export type FeedRowTone = 'error' | 'secondary' | 'tertiary';
export type FeedRowItem = {
  title: string;
  body: string;
  tone: FeedRowTone;
  stamp: string;
  vendorId?: string;
  vendorName?: string;
};

type Props = {
  stats: RedirectStatsResponse | null;
  events: RedirectEvent[];
  vendors: VendorScore[];
  stale: boolean;
  systemStatus: SystemStatus;
  injectedRows?: FeedRowItem[];
  onResume: () => void;
  onFeedEventClick: (vendorId: string, vendorName?: string) => void;
  onRequestHide?: () => void;
};

function formatPct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

export function LiveFeedPanel({
  stats,
  events,
  vendors,
  stale,
  systemStatus,
  injectedRows = [],
  onResume,
  onFeedEventClick,
  onRequestHide,
}: Props) {
  const suspended = systemStatus === 'SUSPENDED';

  const totals = useMemo(() => {
    const list = stats?.vendors ?? [];
    const total = stats?.total_clicks_last_60s ?? 0;
    const real = list.reduce((sum, v) => sum + v.real_clicks, 0);
    const bot = list.reduce((sum, v) => sum + v.bot_clicks, 0);
    return {
      total,
      realPct: total > 0 ? real / total : 0,
      botPct: total > 0 ? bot / total : 0,
      activeVendors: list.length,
    };
  }, [stats]);

  const fallbackFraud = vendors
    .filter((v) => v.fraud_status !== 'clean' || v.budget_decision === 'emergency_pause')
    .slice(0, 3);
  const topBotVendor = [...(stats?.vendors ?? [])].sort((a, b) => b.bot_clicks - a.bot_clicks)[0];
  const recentEvent = events[0];
  const improvVendor = [...vendors].sort((a, b) => b.effective_score - a.effective_score)[0];
  const reallocation = fallbackFraud[0];

  const feedRows: FeedRowItem[] = [
    {
      title: recentEvent ? 'Anomaly: Click Injection' : 'Budget Shift Log',
      body: recentEvent
        ? `${recentEvent.vendor_name} requires immediate risk review`
        : topBotVendor
          ? `${topBotVendor.vendor_name} bot activity spike requires immediate risk review`
          : reallocation
          ? `Reallocated $${Math.round((reallocation.budget_allocation_pct / 100) * 500_000).toLocaleString()} from ${reallocation.vendor_name}`
          : 'No live anomalies detected',
      tone: 'error',
      stamp: recentEvent ? new Date(recentEvent.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
      vendorId: recentEvent?.vendor_id ?? topBotVendor?.vendor_id ?? reallocation?.vendor_id,
      vendorName: recentEvent?.vendor_name ?? topBotVendor?.vendor_name ?? reallocation?.vendor_name,
    },
    {
      title: 'Optimization Ready',
      body: improvVendor ? `Quality uplift detected for ${improvVendor.vendor_name}` : 'Monitoring score movement',
      tone: 'secondary',
      stamp: new Date(Date.now() - 120000).toLocaleTimeString(),
      vendorId: improvVendor?.vendor_id,
      vendorName: improvVendor?.vendor_name,
    },
    {
      title: 'Budget Shift Log',
      body: reallocation ? `Recovered allocation from ${reallocation.vendor_name}` : 'No shifts applied yet',
      tone: 'tertiary',
      stamp: new Date(Date.now() - 300000).toLocaleTimeString(),
      vendorId: reallocation?.vendor_id,
      vendorName: reallocation?.vendor_name,
    },
  ];
  const combinedRows = [...injectedRows, ...feedRows].slice(0, 5);

  return (
    <section className="flex h-full flex-col rounded-lg bg-surface-container p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-headline text-lg font-bold text-on-surface">Live Threat Feed</h3>
          {suspended ? (
            <span className="animate-pulse rounded bg-error/10 px-2 py-0.5 font-mono text-[10px] text-error">SUSPENDED</span>
          ) : (
            <span className="rounded bg-tertiary/10 px-2 py-0.5 font-mono text-[10px] text-tertiary">STREAMING</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => (suspended ? onResume() : onRequestHide?.())}
          className="font-mono text-[10px] uppercase text-on-surface-variant"
        >
          {suspended ? 'RESUME' : 'HIDE'}
        </button>
      </div>

      <div className="space-y-4">
        <div className="relative">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <StatItem label="Clicks/min" value={String(totals.total)} />
              <StatItem label="Real clicks %" value={formatPct(totals.realPct)} />
              <StatItem label="Bot clicks %" value={formatPct(totals.botPct)} />
              <StatItem label="Active vendors" value={String(totals.activeVendors)} />
            </div>
          {suspended && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm">
              <span className="font-mono text-[10px] uppercase tracking-widest text-error">FEED SUSPENDED</span>
            </div>
          )}
        </div>

        {stale && !suspended && (
          <p className="rounded bg-error/10 px-3 py-2 text-xs text-error">
            Awaiting click data - run simulate_clicks.js to begin
          </p>
        )}

        <div className="space-y-2">
          {combinedRows.map((item, idx) => {
              const clickable = !!item.vendorId;
              return (
                <article
                  key={`${item.title}-${idx}`}
                  onClick={() => clickable && onFeedEventClick(item.vendorId as string, item.vendorName)}
                  className={`group relative rounded bg-surface-container-high p-4 transition-colors ${
                    clickable ? 'cursor-pointer hover:bg-surface-container' : 'cursor-default'
                  } ${
                    item.tone === 'error'
                      ? 'border-l-2 border-error'
                      : item.tone === 'secondary'
                        ? 'border-l-2 border-secondary'
                        : 'border-l-2 border-tertiary'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] text-on-surface-variant">{item.stamp}</p>
                      <p className="mt-1 text-sm font-bold text-on-surface">{item.title}</p>
                      <p className="text-xs text-on-surface-variant">{item.body}</p>
                      {clickable && (
                        <span className="mt-2 block font-mono text-[10px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          View in risk matrix →
                        </span>
                      )}
                    </div>
                    {clickable && (
                      <span className="material-symbols-outlined flex-shrink-0 text-sm text-on-surface-variant transition-colors group-hover:text-primary">
                        arrow_forward
                      </span>
                    )}
                  </div>
                </article>
              );
          })}
        </div>
      </div>
    </section>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-surface-container-high px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}
