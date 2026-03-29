import { useEffect, useMemo, useState } from 'react';
import { useVendors } from './hooks/useVendors';
import { Header } from './components/layout/Header';
import { Navigation, type AppTab } from './components/layout/Navigation';
import { DashboardView } from './views/DashboardView';
import { SimulatorView } from './views/SimulatorView';
import { ExperimentsView } from './views/ExperimentsView';
import { ReallocationView } from './views/ReallocationView';

export type SystemStatus = 'ACTIVE' | 'SUSPENDED' | 'RESUMING';

function formatClockFromMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(total / 3600)).padStart(2, '0');
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function getElapsed(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function App() {
  const [tab, setTab] = useState<AppTab>('dashboard');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('ACTIVE');
  const [showKillSwitchConfirm, setShowKillSwitchConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showRestartOverlay, setShowRestartOverlay] = useState(false);
  const [restartCountdown, setRestartCountdown] = useState(3);
  const [suspendedAt, setSuspendedAt] = useState<number | null>(null);
  const [suspendedElapsedMs, setSuspendedElapsedMs] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [liveClickEvents, setLiveClickEvents] = useState(0);
  const [lastScoredTime, setLastScoredTime] = useState<number>(Date.now());
  const [elapsedDisplay, setElapsedDisplay] = useState<string>('just now');
  const [vendorFocusRequest, setVendorFocusRequest] = useState<{
    vendorId: string;
    vendorName?: string;
    requestId: number;
  } | null>(null);
  const {
    vendors,
    summary,
    loading: vendorsLoading,
    error: vendorsError,
    refresh: refreshVendors,
  } = useVendors();

  useEffect(() => {
    if (systemStatus !== 'SUSPENDED' || !suspendedAt) {
      return;
    }
    const id = window.setInterval(() => {
      setSuspendedElapsedMs(Date.now() - suspendedAt);
    }, 1000);
    return () => window.clearInterval(id);
  }, [systemStatus, suspendedAt]);

  useEffect(() => {
    if (!toastMessage) return;
    const id = window.setTimeout(() => setToastMessage(null), 2000);
    return () => window.clearTimeout(id);
  }, [toastMessage]);

  useEffect(() => {
    if (!vendors.length) return;
    setLastScoredTime(Date.now());
  }, [vendors]);

  useEffect(() => {
    if (systemStatus === 'SUSPENDED') {
      setElapsedDisplay('HALTED');
      return;
    }
    const updateElapsed = () => setElapsedDisplay(getElapsed(lastScoredTime));
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 30000);
    return () => window.clearInterval(interval);
  }, [lastScoredTime, systemStatus]);

  const elapsedLabel = useMemo(
    () => formatClockFromMs(suspendedElapsedMs),
    [suspendedElapsedMs],
  );

  const refreshNow = async () => {
    setIsRefreshing(true);
    const started = Date.now();
    await refreshVendors();
    setLastScoredTime(Date.now());
    const stamp = new Date().toLocaleString();
    setToastMessage(`✓ Data refreshed — ${stamp}`);
    window.setTimeout(() => {
      const elapsed = Date.now() - started;
      if (elapsed >= 1000) {
        setIsRefreshing(false);
      } else {
        window.setTimeout(() => setIsRefreshing(false), 1000 - elapsed);
      }
    }, 0);
  };

  const confirmKillSwitch = () => {
    setSystemStatus('SUSPENDED');
    setSuspendedAt(Date.now());
    setSuspendedElapsedMs(0);
    setShowKillSwitchConfirm(false);
  };

  const beginRestart = () => {
    setShowRestartConfirm(false);
    setShowRestartOverlay(true);
    setSystemStatus('RESUMING');
    setRestartCountdown(3);
    let tick = 3;
    const id = window.setInterval(() => {
      tick -= 1;
      setRestartCountdown(Math.max(0, tick));
    }, 1000);
    window.setTimeout(() => {
      window.clearInterval(id);
      setShowRestartOverlay(false);
      setSystemStatus('ACTIVE');
      setLastScoredTime(Date.now());
      setElapsedDisplay('just now');
      setSuspendedAt(null);
      setSuspendedElapsedMs(0);
      setToastMessage('✓ System restored — All vendors re-activated');
    }, 3000);
  };

  return (
    <div className="min-w-[1280px] overflow-x-auto bg-background text-on-surface">
      <Header
        activeTab={tab}
        onChangeTab={setTab}
        onRefresh={refreshNow}
        isRefreshing={isRefreshing}
        systemStatus={systemStatus}
      />
      <Navigation
        systemStatus={systemStatus}
        elapsedTime={elapsedLabel}
        lastScoredDisplay={elapsedDisplay}
        vendors={vendors}
        totalClicksFromRedirectStats={liveClickEvents}
        onAlertVendorClick={(vendorId, vendorName) => {
          setTab('dashboard');
          setVendorFocusRequest({
            vendorId,
            vendorName,
            requestId: Date.now(),
          });
        }}
        onEmergencyClick={() =>
          systemStatus === 'ACTIVE'
            ? setShowKillSwitchConfirm(true)
            : setShowRestartConfirm(true)
        }
      />
      <main className="ml-64 min-h-screen min-w-0 flex-1 bg-background pt-16">
        {systemStatus === 'SUSPENDED' && (
          <div className="w-full border-b-2 border-error bg-error/10 px-6 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase text-error">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-error shadow-[0_0_8px_#ffb4ab]" />
                  SYSTEM SUSPENDED
                </p>
                <p className="text-xs text-error">
                  Emergency killswitch activated at {new Date(suspendedAt ?? Date.now()).toLocaleString()}. All vendor allocations paused. Manual restart required.
                </p>
              </div>
              <p className="font-mono text-lg text-error">TIME SUSPENDED: {elapsedLabel}</p>
            </div>
          </div>
        )}
        <div className="px-8 py-6">
        {tab === 'dashboard' && (
          <DashboardView
            vendors={vendors}
            summary={summary}
            loading={vendorsLoading}
            error={vendorsError}
            onRetry={refreshVendors}
            systemStatus={systemStatus}
            onChangeTab={setTab}
            onResumeSystem={() => setShowRestartConfirm(true)}
            onLiveClicksChange={setLiveClickEvents}
            externalVendorFocus={vendorFocusRequest}
          />
        )}
        {tab === 'simulator' && <SimulatorView />}
        {tab === 'experiments' && <ExperimentsView />}
        {tab === 'reallocation' && (
          <ReallocationView
            vendors={vendors}
            loading={vendorsLoading}
            error={vendorsError}
            onRetry={() => void refreshVendors()}
          />
        )}
        </div>
      </main>
      {showKillSwitchConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-md rounded-lg border border-error/30 bg-surface-container-high p-6">
            <h2 className="font-headline text-lg font-bold text-error">⚠ EMERGENCY PROTOCOL</h2>
            <p className="mt-2 text-sm text-on-surface">
              This will immediately suspend ALL active vendor budget allocations and halt traffic routing.
            </p>
            <div className="mt-3 space-y-1 font-mono text-xs text-on-surface-variant">
              <p>→ 50 active vendors will be paused</p>
              <p>→ $500,000 in campaigns affected</p>
              <p>→ Action logged with timestamp</p>
            </div>
            <p className="mt-3 text-sm text-on-surface-variant">This action requires manual restart to reverse.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowKillSwitchConfirm(false)}
                className="rounded bg-surface-container px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmKillSwitch}
                className="rounded bg-error px-3 py-1.5 text-xs font-bold text-on-error"
              >
                Confirm Killswitch
              </button>
            </div>
          </div>
        </div>
      )}
      {showRestartConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-md rounded-lg border border-tertiary/30 bg-surface-container-high p-6">
            <h2 className="font-headline text-lg font-bold text-on-surface">Confirm System Restart</h2>
            <p className="mt-2 text-sm text-on-surface-variant">Resume all vendor allocations and traffic routing?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRestartConfirm(false)}
                className="rounded bg-surface-container px-3 py-1.5 text-xs text-on-surface-variant"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={beginRestart}
                className="rounded bg-tertiary px-3 py-1.5 text-xs font-bold text-on-tertiary"
              >
                Confirm Restart
              </button>
            </div>
          </div>
        </div>
      )}
      {showRestartOverlay && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg bg-surface-container-high p-6 text-center">
            <p className="font-mono text-sm uppercase tracking-wide text-secondary">SYSTEM RESTART IN PROGRESS</p>
            <div className="mt-4 h-2 w-full rounded bg-surface-container">
              <div className="h-2 rounded bg-secondary transition-all duration-300" style={{ width: `${((3 - restartCountdown) / 3) * 100}%` }} />
            </div>
            <p className="mt-4 font-mono text-2xl text-on-surface">
              {restartCountdown > 0 ? `${restartCountdown}...` : 'ONLINE'}
            </p>
          </div>
        </div>
      )}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 rounded bg-surface-container-high px-4 py-2 font-mono text-xs text-tertiary">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
