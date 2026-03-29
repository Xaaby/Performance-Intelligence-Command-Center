import type { ExperimentRecord } from '../../types/vendor.types';
import { formatScore } from '../../lib/format';

type Props = {
  experiment: ExperimentRecord;
  isPaused: boolean;
  isArchiveConfirming: boolean;
  onPause: () => void;
  onResume: () => void;
  onRequestArchive: () => void;
  onCancelArchive: () => void;
  onConfirmArchive: () => void;
};

export function ABTestCard({
  experiment,
  isPaused,
  isArchiveConfirming,
  onPause,
  onResume,
  onRequestArchive,
  onCancelArchive,
  onConfirmArchive,
}: Props) {
  const pValue = experiment.p_value ?? 1;
  const pColor = pValue < 0.05 ? 'text-tertiary' : pValue < 0.1 ? 'text-secondary' : 'text-on-surface-variant';
  const delta = experiment.current_treatment_score - experiment.current_control_score;
  const treatmentWinning = delta >= 0;
  const isWinning = delta > 0.05;
  const isLosing = delta < -0.05;

  const cardTone = isPaused
    ? 'border-l-2 border-outline-variant bg-surface-container-low opacity-70'
    : isWinning
      ? 'border-l-2 border-tertiary bg-surface-container'
      : isLosing
        ? 'border-l-2 border-error bg-surface-container'
        : 'border-l-2 border-secondary/40 bg-surface-container';

  if (isArchiveConfirming) {
    return (
      <div className={`mb-3 rounded-lg p-4 ${cardTone}`}>
        <p className="font-mono text-xs text-on-surface">Archive this experiment? Results will be logged.</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onCancelArchive}
            className="rounded border border-outline-variant/20 px-3 py-1 font-mono text-[10px] uppercase text-on-surface-variant"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmArchive}
            className="rounded border border-error/30 bg-error/10 px-3 py-1 font-mono text-[10px] uppercase text-error"
          >
            Confirm Archive
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-3 rounded-lg p-4 ${cardTone}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-on-surface">EXP_{experiment.vendor_name.slice(0, 10).toUpperCase()}_V2</p>
          <p className="text-[10px] text-on-surface-variant">CONTROL_V1 vs VARIANT_X</p>
        </div>
        <div className="text-right">
          <p className={`font-mono text-sm ${pColor}`}>P-VALUE {experiment.p_value?.toFixed(3) ?? '—'}</p>
          {isPaused && (
            <span className="mt-1 inline-flex rounded bg-outline-variant/20 px-2 py-0.5 font-mono text-[10px] text-on-surface-variant">PAUSED</span>
          )}
          {!isPaused && isWinning && (
            <span className="mt-1 inline-flex rounded bg-tertiary/10 px-2 py-0.5 font-mono text-[10px] text-tertiary">LEADING</span>
          )}
          {!isPaused && isLosing && (
            <span className="mt-1 inline-flex rounded bg-error/10 px-2 py-0.5 font-mono text-[10px] text-error">UNDERPERFORMING</span>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-on-surface-variant">CONTROL SCORE</p>
          <p className="font-mono text-3xl font-bold text-on-surface">{formatScore(experiment.current_control_score)}</p>
        </div>
        <div>
          <p className="text-[10px] text-on-surface-variant">TREATMENT SCORE</p>
          <p className={`font-mono text-3xl font-bold ${treatmentWinning ? 'text-tertiary' : 'text-error'}`}>
            {formatScore(experiment.current_treatment_score)} {treatmentWinning ? '↑' : '↓'}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between font-mono text-[10px] text-on-surface-variant">
          <p>
            PROGRESS: DAY {experiment.day_current} OF {experiment.day_total} {isPaused ? '(paused)' : ''}
          </p>
          <p>{Math.round((experiment.day_current / experiment.day_total) * 100)}%</p>
        </div>
        <div className="mt-1 h-1 rounded bg-surface-container-highest">
          <div className="h-1 rounded bg-primary/60" style={{ width: `${(experiment.day_current / experiment.day_total) * 100}%` }} />
        </div>
        {isPaused && (
          <p className="mt-2 text-[10px] text-on-surface-variant">
            Paused at Day {experiment.day_current} of {experiment.day_total}
          </p>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            title={isPaused ? 'Resume experiment' : 'Pause experiment'}
            onClick={isPaused ? onResume : onPause}
            className="rounded bg-surface-container px-2 py-1 text-xs text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-sm">{isPaused ? 'play_arrow' : 'pause'}</span>
          </button>
          <button
            type="button"
            title="Archive experiment results"
            onClick={onRequestArchive}
            className="rounded bg-surface-container px-2 py-1 text-xs text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-sm">archive</span>
          </button>
        </div>
        {pValue < 0.1 && <span className="text-xs text-primary">Sig. Confidence</span>}
      </div>
    </div>
  );
}
