import type { SystemStatus } from '../../App';
import { asArray } from '../../lib/asArray';
import type { VendorScore } from '../../types/vendor.types';

export type AppTab = 'dashboard' | 'simulator' | 'experiments' | 'reallocation';

type Props = {
  systemStatus: SystemStatus;
  elapsedTime: string;
  lastScoredDisplay: string;
  onEmergencyClick: () => void;
  vendors: VendorScore[];
  totalClicksFromRedirectStats: number;
  onAlertVendorClick: (vendorId: string, vendorName?: string) => void;
};

export function Navigation({
  systemStatus,
  elapsedTime,
  lastScoredDisplay,
  onEmergencyClick,
  vendors: vendorsProp,
  totalClicksFromRedirectStats,
  onAlertVendorClick,
}: Props) {
  const vendors = asArray<VendorScore>(vendorsProp);
  const suspended = systemStatus === 'SUSPENDED';
  const componentStatuses = [
    'Scoring Engine',
    'Fraud Detection',
    'Experiment Engine',
    'Decision Engine',
  ];
  const highRiskAlerts = vendors.filter(
    (vendor) =>
      vendor.fraud_status === 'auto_pause' || vendor.budget_decision === 'emergency_pause',
  );
  const reviewAlerts = vendors.filter(
    (vendor) =>
      vendor.fraud_status === 'review' &&
      !highRiskAlerts.some((highRiskVendor) => highRiskVendor.vendor_id === vendor.vendor_id),
  );
  const activeAlerts = [...highRiskAlerts, ...reviewAlerts];
  const visibleAlerts = activeAlerts.slice(0, 4);
  const overflowCount = Math.max(0, activeAlerts.length - visibleAlerts.length);
  const formattedClickEvents = formatCompactClicks(totalClicksFromRedirectStats);

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-[#111319] border-r border-[#c0c1ff]/5 flex flex-col z-40 overflow-hidden">
      <div className="px-6 py-8 flex-shrink-0">
        <p className="font-headline text-xl font-black text-indigo-400">SENTINEL_NODE_01</p>
        {systemStatus === 'ACTIVE' && (
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-tertiary shadow-[0_0_8px_#4ae176]" />
            <span className="font-mono text-[10px] text-tertiary">LIVE: 99.9% UPTIME</span>
          </div>
        )}
        {systemStatus === 'SUSPENDED' && (
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-error shadow-[0_0_8px_#ffb4ab]" />
            <span className="font-mono text-[10px] text-error">SUSPENDED: {elapsedTime}</span>
          </div>
        )}
        {systemStatus === 'RESUMING' && (
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 w-2 animate-ping rounded-full bg-secondary" />
            <span className="font-mono text-[10px] text-secondary">RESTARTING...</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6">
        <div className="h-px bg-outline-variant/10 my-4" />

        <section>
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">
            SYSTEM STATUS
          </p>
          {componentStatuses.map((componentName) => (
            <div key={componentName} className="flex items-center justify-between py-1.5">
              <span className="font-mono text-[10px] text-slate-400">
                {componentName}
              </span>
              <span
                className={`flex items-center gap-1.5 font-mono text-[10px] ${
                  suspended ? 'text-error' : 'text-tertiary'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    suspended ? 'bg-error' : 'bg-tertiary'
                  }`}
                />
                {suspended ? 'HALTED' : 'ACTIVE'}
              </span>
            </div>
          ))}
        </section>

        <div className="h-px bg-outline-variant/10 my-4" />

        <section>
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">
            DATA PIPELINE
          </p>
          <div className="flex items-center justify-between py-1">
            <span className="font-mono text-[10px] text-slate-500">Last scored</span>
            <span className={`font-mono text-[10px] ${systemStatus === 'SUSPENDED' ? 'text-error' : 'text-on-surface-variant'}`}>
              {lastScoredDisplay}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="font-mono text-[10px] text-slate-500">Next cycle</span>
            <span className="font-mono text-[10px] text-on-surface-variant">06:30 AM</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="font-mono text-[10px] text-slate-500">Vendors</span>
            <span className="font-mono text-[10px] text-on-surface-variant">{vendors.length}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="font-mono text-[10px] text-slate-500">Click events</span>
            <span className="font-mono text-[10px] text-on-surface-variant">{formattedClickEvents}</span>
          </div>
        </section>

        <div className="h-px bg-outline-variant/10 my-4" />

        <section>
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">
            ACTIVE ALERTS
          </p>
          {visibleAlerts.length > 0 ? (
            <>
              {visibleAlerts.map((vendor) => {
                const isHighRisk =
                  vendor.fraud_status === 'auto_pause' || vendor.budget_decision === 'emergency_pause';
                return (
                  <div
                    key={vendor.vendor_id}
                    onClick={() => onAlertVendorClick(vendor.vendor_id, vendor.vendor_name)}
                    className="flex items-center gap-2 py-1.5 cursor-pointer hover:text-on-surface transition-colors group"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isHighRisk ? 'bg-error' : 'bg-secondary'
                      }`}
                    />
                    <span className="font-mono text-[10px] text-slate-400 group-hover:text-error transition-colors truncate">
                      {vendor.vendor_name}
                    </span>
                  </div>
                );
              })}
              {overflowCount > 0 && (
                <p className="pt-1 font-mono text-[10px] text-slate-500">+{overflowCount} more</p>
              )}
            </>
          ) : (
            <p className="font-mono text-[10px] text-slate-600">No active alerts</p>
          )}
        </section>

        <div className="h-px bg-outline-variant/10 my-4" />
      </div>

      <div className="flex-shrink-0 px-6 pb-6 pt-4 border-t border-outline-variant/10 mt-auto">
        <button
          type="button"
          onClick={onEmergencyClick}
          className="w-full py-2 mb-4 bg-error/10 text-error border border-error/20 font-mono text-[10px] uppercase tracking-tighter hover:bg-error/20 transition-colors rounded-sm"
        >
          {systemStatus === 'ACTIVE' ? 'EMERGENCY KILLSWITCH' : '▶ RESTART SYSTEM'}
        </button>
        <a
          href="#"
          className="flex items-center gap-3 py-2 w-full text-on-surface-variant hover:text-on-surface font-mono text-[10px] uppercase tracking-wider transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
            help_outline
          </span>
          Support
        </a>
        <button
          type="button"
          className="flex items-center gap-3 py-2 w-full text-on-surface-variant hover:text-error font-mono text-[10px] uppercase tracking-wider transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
            logout
          </span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function formatCompactClicks(clicks: number): string {
  if (!Number.isFinite(clicks) || clicks <= 0) {
    return '0';
  }
  if (clicks >= 1000) {
    return `${(clicks / 1000).toFixed(1)}K`;
  }
  return `${clicks}`;
}
