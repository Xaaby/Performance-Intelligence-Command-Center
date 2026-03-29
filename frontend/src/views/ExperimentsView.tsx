import { useEffect, useMemo, useState } from 'react';
import { useExperiments } from '../hooks/useExperiments';
import { ExperimentBoard } from '../components/experiments/ExperimentBoard';
import type { BanditAllocation, ExperimentRecord } from '../types/vendor.types';

function simulateExperiment(
  e: ExperimentRecord,
  extraDays: number,
): ExperimentRecord {
  const day_eff = Math.min(e.day_total, e.day_current + extraDays);
  const finished = day_eff >= e.day_total;
  const score_delta = e.score_delta + extraDays * 0.004;
  const treatmentScore = Math.min(
    0.99,
    e.current_treatment_score + extraDays * 0.002,
  );
  const controlScore = e.current_control_score;
  const baseP = e.p_value ?? 0.12;
  let p_value: number | null = baseP;
  if (finished) {
    p_value = 0.031;
  } else {
    p_value = Math.max(0.031, baseP - extraDays * 0.008);
  }
  const status: ExperimentRecord['status'] = finished
    ? 'significant'
    : 'running';

  return {
    ...e,
    day_current: day_eff,
    score_delta,
    current_treatment_score: treatmentScore,
    current_control_score: controlScore,
    p_value,
    status,
  };
}

export function ExperimentsView() {
  const {
    coldStartVendors,
    experiments,
    banditAllocations,
    loading,
    error,
    refresh,
  } = useExperiments();
  const [dayOffsets, setDayOffsets] = useState<Record<string, number>>({});
  const [pausedExperiments, setPausedExperiments] = useState<Set<string>>(new Set());
  const [archivedExperiments, setArchivedExperiments] = useState<Set<string>>(new Set());
  const [archivingExperiments, setArchivingExperiments] = useState<Set<string>>(new Set());
  const [archiveConfirmingId, setArchiveConfirmingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMabModalOpen, setIsMabModalOpen] = useState(false);

  useEffect(() => {
    if (!toastMessage) return;
    const id = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(id);
  }, [toastMessage]);

  useEffect(() => {
    if (!isMabModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMabModalOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMabModalOpen]);

  const archivedIds = useMemo(() => archivedExperiments, [archivedExperiments]);

  const { activeExperiments, promotedBandits, showCompleteBanner } =
    useMemo(() => {
      const active: ExperimentRecord[] = [];
      const promoted: BanditAllocation[] = [];

      for (const e of experiments) {
        if (archivedIds.has(e.vendor_id)) continue;
        const offset = dayOffsets[e.vendor_id] ?? 0;
        const sim = simulateExperiment(e, offset);
        const finished = sim.day_current >= e.day_total;
        if (finished) {
          promoted.push({
            vendor_id: `${e.vendor_id}-mab`,
            vendor_name: e.vendor_name,
            allocation_pct: Math.max(e.traffic_split.treatment, 12),
            confidence: 'high',
            trend: 'up',
          });
        } else {
          active.push(sim);
        }
      }

      const banner =
        Object.values(dayOffsets).some((d) => d > 0) &&
        experiments.some((e) => {
          if (archivedIds.has(e.vendor_id)) return false;
          const day_eff = Math.min(e.day_total, e.day_current + (dayOffsets[e.vendor_id] ?? 0));
          return day_eff >= e.day_total;
        });

      return {
        activeExperiments: active,
        promotedBandits: promoted,
        showCompleteBanner: banner,
      };
    }, [experiments, archivedIds, dayOffsets]);

  const displayBandit = useMemo(
    () => [...banditAllocations, ...promotedBandits],
    [banditAllocations, promotedBandits],
  );

  const winners = useMemo(() => {
    return experiments.filter((e) => {
      if (archivedIds.has(e.vendor_id)) return false;
      const day_eff = Math.min(e.day_total, e.day_current + (dayOffsets[e.vendor_id] ?? 0));
      return day_eff >= e.day_total;
    });
  }, [experiments, archivedIds, dayOffsets]);

  const advanceOneDay = () => {
    setDayOffsets((prev) => {
      const next = { ...prev };
      for (const exp of experiments) {
        if (archivedExperiments.has(exp.vendor_id)) continue;
        if (pausedExperiments.has(exp.vendor_id)) continue;
        const currentOffset = next[exp.vendor_id] ?? 0;
        const maxOffset = Math.max(0, exp.day_total - exp.day_current);
        next[exp.vendor_id] = Math.min(maxOffset, currentOffset + 1);
      }
      return next;
    });
  };

  const handlePause = (exp: ExperimentRecord) => {
    setPausedExperiments((prev) => new Set(prev).add(exp.vendor_id));
    setToastMessage(`⏸ EXP_${exp.vendor_name} paused — traffic routing suspended`);
  };

  const handleResume = (exp: ExperimentRecord) => {
    setPausedExperiments((prev) => {
      const next = new Set(prev);
      next.delete(exp.vendor_id);
      return next;
    });
    setToastMessage(`▶ EXP_${exp.vendor_name} resumed — traffic routing active`);
  };

  const handleConfirmArchive = (exp: ExperimentRecord) => {
    setArchiveConfirmingId(null);
    setArchivingExperiments((prev) => new Set(prev).add(exp.vendor_id));
    window.setTimeout(() => {
      setArchivedExperiments((prev) => new Set(prev).add(exp.vendor_id));
      setArchivingExperiments((prev) => {
        const next = new Set(prev);
        next.delete(exp.vendor_id);
        return next;
      });
      setPausedExperiments((prev) => {
        const next = new Set(prev);
        next.delete(exp.vendor_id);
        return next;
      });
      setToastMessage(`⬇ EXP_${exp.vendor_name} archived — results logged to System Logs`);
    }, 300);
  };

  return (
    <div className="mx-auto max-w-[1700px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-headline text-3xl font-bold text-on-surface">Experiment_Lab</h2>
          <p className="font-mono text-sm text-on-surface-variant">
            ACTIVE SIMULATION CYCLES: {experiments.length} // SYSTEM STABLE
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={advanceOneDay}
            className="rounded border border-primary px-3 py-1 text-xs font-medium text-primary"
          >
            Advance 1 day
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded border border-secondary px-3 py-1 text-xs font-medium text-secondary"
          >
            Force Refresh
          </button>
        </div>
      </div>

      {showCompleteBanner && winners.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded border border-tertiary/20 bg-tertiary/10 px-4 py-3 text-sm text-tertiary">
          <div>
            <p className="font-semibold">
              Experiment_{winners[0]?.vendor_id ?? 'VENDOR'} Successful
            </p>
            <p className="mt-1 text-on-surface">
              Vendor {winners.map((w) => w.vendor_name).join(', ')} has reached significance (p=0.04) and promoted to Bandit Pool.
            </p>
          </div>
          <button className="material-symbols-outlined text-on-surface-variant">close</button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-emergency-bg px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {loading && (
        <p className="mb-4 text-sm text-muted">Loading experiments…</p>
      )}

      <ExperimentBoard
        coldStart={coldStartVendors}
        experiments={activeExperiments}
        bandit={displayBandit}
        pausedExperiments={pausedExperiments}
        archiveConfirmingId={archiveConfirmingId}
        archivingExperiments={archivingExperiments}
        onPause={handlePause}
        onResume={handleResume}
        onRequestArchive={(vendorId) => setArchiveConfirmingId(vendorId)}
        onCancelArchive={() => setArchiveConfirmingId(null)}
        onConfirmArchive={handleConfirmArchive}
        onOpenMabModal={() => setIsMabModalOpen(true)}
      />
      {isMabModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setIsMabModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-outline-variant/20 bg-surface-container-high p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-headline text-xl font-bold text-on-surface">MAB Strategy Configuration</h3>
            <p className="mt-1 font-mono text-[10px] uppercase text-on-surface-variant">
              Thompson Sampling parameters for this vendor node
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm text-on-surface">Exploration Rate</p>
                <p className="font-mono text-sm text-primary">5% minimum allocation floor</p>
                <p className="text-[10px] text-on-surface-variant">Prevents permanent vendor starvation. Every active vendor receives at least 5% of bandit traffic regardless of score confidence.</p>
              </div>
              <div>
                <p className="text-sm text-on-surface">Confidence Threshold</p>
                <p className="font-mono text-sm text-primary">10,000 clicks required</p>
                <p className="text-[10px] text-on-surface-variant">Minimum click volume before Thompson Sampling draws replace equal allocation. Below this threshold, traffic splits equally.</p>
              </div>
              <div>
                <p className="text-sm text-on-surface">Score Decay Window</p>
                <p className="font-mono text-sm text-primary">7-day rolling average</p>
                <p className="text-[10px] text-on-surface-variant">Older click data is down-weighted. A vendor who performed well 30 days ago does not benefit from that historical performance today.</p>
              </div>
              <div>
                <p className="text-sm text-on-surface">Reallocation Frequency</p>
                <p className="font-mono text-sm text-primary">Every 24 hours at 06:30</p>
                <p className="text-[10px] text-on-surface-variant">MAB allocation percentages recompute once daily after the scoring engine completes.</p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsMabModalOpen(false)}
                className="font-mono text-[10px] uppercase tracking-wider text-error"
              >
                RESET TO DEFAULTS
              </button>
              <button
                type="button"
                onClick={() => setIsMabModalOpen(false)}
                className="rounded bg-primary px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-on-primary"
              >
                SAVE CONFIGURATION
              </button>
            </div>
          </div>
        </div>
      )}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 rounded-lg border border-outline-variant/20 bg-surface-container-high px-4 py-2 font-mono text-xs text-on-surface">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
