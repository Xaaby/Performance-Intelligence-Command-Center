import { useEffect, useRef, useState } from 'react';
import type { SystemStatus } from '../../App';
import type { AppTab } from './Navigation';

type Props = {
  activeTab: AppTab;
  onChangeTab: (t: AppTab) => void;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  systemStatus: SystemStatus;
};

const topTabs: { id: AppTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'experiments', label: 'Experiments' },
  { id: 'reallocation', label: 'Reallocation' },
];

export function Header({
  activeTab,
  onChangeTab,
  onRefresh,
  isRefreshing,
  systemStatus,
}: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  return (
    <header className="header fixed left-0 right-0 top-0 z-50 h-16 border-b border-primary/10 bg-[#191B22] shadow-[0_0_20px_rgba(192,193,255,0.06)]">
      <div className="mx-auto flex h-full max-w-[1900px] items-center justify-between gap-6 px-6">
        <div className="font-headline text-xl font-bold tracking-tighter text-primary">
          TRAFFIC_INTEL_v4.0
        </div>
        <nav className="flex flex-1 items-center gap-7">
          {topTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChangeTab(t.id)}
              className={
                activeTab === t.id
                  ? 'border-b-2 border-[#6366F1] pb-1 text-sm font-bold text-primary'
                  : 'pb-1 text-sm text-slate-400 transition-colors hover:text-slate-200'
              }
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="rounded p-1.5 hover:bg-surface-container"
          >
            <span className={`material-symbols-outlined text-lg ${isRefreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
          {systemStatus === 'SUSPENDED' && (
            <span className="animate-pulse rounded border border-error/30 px-2 py-1 font-mono text-[10px] text-error">
              ⬛ SYSTEM SUSPENDED
            </span>
          )}
          {systemStatus === 'RESUMING' && (
            <span className="rounded border border-secondary/30 px-2 py-1 font-mono text-[10px] text-secondary">
              ◈ RESTARTING
            </span>
          )}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded-full border border-primary/30 bg-primary/20 font-mono text-xs text-primary"
            >
              AY
            </button>
            {open && (
              <div className="absolute right-0 top-10 w-56 rounded bg-surface-container-high p-3 text-xs shadow-[0_0_20px_rgba(192,193,255,0.06)]">
                <p className="text-on-surface">Analyst: Abhi Yadav</p>
                <p className="mt-1 text-on-surface-variant">Session: SENTINEL_NODE_01</p>
                <p className="mt-1 text-on-surface-variant">Last login: Today 12:49 AM</p>
                <div className="my-2 h-px bg-outline-variant/25" />
                <button type="button" className="text-error">Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
