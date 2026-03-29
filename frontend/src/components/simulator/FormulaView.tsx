import type { VendorScore } from '../../types/vendor.types';
import { formatScore } from '../../lib/format';
import { TQS_WEIGHTS, FRAUD_WEIGHTS } from '../../lib/scoring';

type Props = {
  score: VendorScore | null;
};

export function FormulaView({ score }: Props) {
  if (!score) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-raised p-4 text-sm text-muted">
        Formulas appear after scoring.
      </div>
    );
  }

  const s = score.signals;
  const f = score.fraud_signals;
  const tqsLine = `${TQS_WEIGHTS.ip_diversity}×${formatScore(s.ip_diversity)} + ${TQS_WEIGHTS.geo_relevance}×${formatScore(s.geo_relevance)} + ${TQS_WEIGHTS.device_fp_uniqueness}×${formatScore(s.device_fp_uniqueness)} + ${TQS_WEIGHTS.click_timing_variance}×${formatScore(s.click_timing_variance)} + ${TQS_WEIGHTS.bot_candidate_rate}×${formatScore(s.bot_candidate_rate)}`;

  const fraudLine = `${FRAUD_WEIGHTS.velocity_anomaly}×${formatScore(f.velocity_anomaly)} + ${FRAUD_WEIGHTS.ip_concentration}×${formatScore(f.ip_concentration)} + ${FRAUD_WEIGHTS.scanner_detection}×${formatScore(f.scanner_detection)} + ${FRAUD_WEIGHTS.fp_clustering}×${formatScore(f.fp_clustering)} + ${FRAUD_WEIGHTS.behavioral_regularity}×${formatScore(f.behavioral_regularity)}`;

  return (
    <div className="space-y-3 rounded-lg bg-surface-container p-4 text-xs text-on-surface sm:text-sm">
      <p className="font-label text-[10px] uppercase tracking-widest text-primary">WEIGHTED_FORMULA_VIEW</p>
      <div className="rounded bg-surface-container-high p-3 font-mono leading-relaxed">
        <p className="text-on-surface-variant">TQS =</p>
        <p className="break-all">
          (0.30×IPdiv) + (0.25×Geo) + (0.20×FPuniq) + (0.15×Timing) +
          (0.10×NotBot)
        </p>
        <p className="mt-2 break-all">= {tqsLine}</p>
        <p className="mt-2 font-bold">= {formatScore(score.tqs)}</p>
      </div>
      <div className="rounded bg-surface-container-high p-3 font-mono leading-relaxed">
        <p className="text-on-surface-variant">Fraud_P =</p>
        <p className="break-all">
          (0.30×Vel) + (0.25×IPconc) + (0.20×Scan) + (0.15×FPclust) +
          (0.10×Regularity)
        </p>
        <p className="mt-2 break-all">= {fraudLine}</p>
        <p className="mt-2 font-bold">= {formatScore(score.fraud_p)}</p>
      </div>
      <div className="rounded bg-surface-container-high p-3 font-mono leading-relaxed">
        <p className="text-on-surface-variant">Effective_Score = TQS × (1 − Fraud_P)</p>
        <p className="mt-1 break-all">
          = {formatScore(score.tqs)} × (1 − {formatScore(score.fraud_p)}) ={' '}
          <span className="font-bold">{formatScore(score.effective_score)}</span>
        </p>
      </div>
    </div>
  );
}
