import type {
  BanditAllocation,
  ColdStartVendor,
  ExperimentRecord,
} from '../../types/vendor.types';
import { ColdStartCard } from './ColdStartCard';
import { ABTestCard } from './ABTestCard';
import { BanditCard } from './BanditCard';

type Props = {
  coldStart: ColdStartVendor[];
  experiments: ExperimentRecord[];
  bandit: BanditAllocation[];
  pausedExperiments: Set<string>;
  archiveConfirmingId: string | null;
  archivingExperiments: Set<string>;
  onPause: (experiment: ExperimentRecord) => void;
  onResume: (experiment: ExperimentRecord) => void;
  onRequestArchive: (vendorId: string) => void;
  onCancelArchive: () => void;
  onConfirmArchive: (experiment: ExperimentRecord) => void;
  onOpenMabModal: () => void;
};

export function ExperimentBoard({
  coldStart,
  experiments,
  bandit,
  pausedExperiments,
  archiveConfirmingId,
  archivingExperiments,
  onPause,
  onResume,
  onRequestArchive,
  onCancelArchive,
  onConfirmArchive,
  onOpenMabModal,
}: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="rounded-lg border border-outline-variant/10 bg-surface-container-low p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-mono text-xs uppercase tracking-widest text-secondary">
            COLD START QUEUE
          </h3>
          <span className="rounded bg-surface-container px-2 py-1 font-mono text-xs text-on-surface-variant">{coldStart.length} NODES</span>
        </div>
        <div className="mb-3 h-px bg-outline-variant/10" />
        <div className="space-y-3">
          {coldStart.length === 0 && (
            <p className="text-sm text-muted">No cold-start vendors.</p>
          )}
          {coldStart.map((v) => (
            <ColdStartCard key={v.vendor_id} vendor={v} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-outline-variant/10 bg-surface-container-low p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-mono text-xs uppercase tracking-widest text-primary">ACTIVE EXPERIMENTS</h3>
          <span className="rounded bg-surface-container px-2 py-1 font-mono text-xs text-on-surface-variant">{experiments.length} RUNNING</span>
        </div>
        <div className="mb-3 h-px bg-outline-variant/10" />
        <div className="space-y-3 transition-all duration-500">
          {experiments.length === 0 && (
            <div className="py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl text-outline-variant">science</span>
              <p className="mt-2 font-mono text-xs uppercase tracking-wider">No active experiments</p>
              <p className="mt-1 text-[10px]">New vendors enter A/B testing after cold start</p>
            </div>
          )}
          {experiments.map((e) => (
            <div
              key={e.vendor_id}
              className={`transition-all duration-300 ${
                archivingExperiments.has(e.vendor_id) ? 'max-h-0 overflow-hidden opacity-0' : 'max-h-[1000px] opacity-100'
              }`}
            >
              <ABTestCard
                experiment={e}
                isPaused={pausedExperiments.has(e.vendor_id)}
                isArchiveConfirming={archiveConfirmingId === e.vendor_id}
                onPause={() => onPause(e)}
                onResume={() => onResume(e)}
                onRequestArchive={() => onRequestArchive(e.vendor_id)}
                onCancelArchive={onCancelArchive}
                onConfirmArchive={() => onConfirmArchive(e)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-outline-variant/10 bg-surface-container-low p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-mono text-xs uppercase tracking-widest text-tertiary">BANDIT ALLOCATION POOL</h3>
          <span className="rounded bg-surface-container px-2 py-1 font-mono text-xs text-on-surface-variant">{bandit.length} PROMOTED</span>
        </div>
        <div className="mb-3 h-px bg-outline-variant/10" />
        <div className="space-y-3 transition-all duration-500">
          {bandit.length === 0 && (
            <p className="text-sm text-muted">No MAB allocations.</p>
          )}
          {bandit.map((b) => (
            <div key={b.vendor_id} className="transition-all duration-500">
              <BanditCard allocation={b} onConfigure={onOpenMabModal} />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs italic text-on-surface-variant">
          Allocation updated daily via Thompson Sampling
        </p>
      </section>
    </div>
  );
}
