import type { VendorScore } from '../../types/vendor.types';
import { formatScore } from '../../lib/format';
import { buildBreakdownTables, type BreakdownRow } from '../../lib/breakdown';
import type { ScoreRequest } from '../../types/vendor.types';
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Props = {
  request: ScoreRequest;
  score: VendorScore | null;
  loading: boolean;
  error: string | null;
};

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: BreakdownRow[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <p className="border-b border-border bg-surface-raised px-3 py-2 text-xs font-semibold text-primary">
        {title}
      </p>
      <table className="min-w-full text-left text-xs">
        <thead className="text-muted">
          <tr>
            <th className="px-3 py-2">Signal</th>
            <th className="px-3 py-2">Raw</th>
            <th className="px-3 py-2 text-right">Norm</th>
            <th className="px-3 py-2 text-right">Weight</th>
            <th className="px-3 py-2 text-right">Contrib.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.signal} className="border-t border-border">
              <td className="px-3 py-1.5 font-medium text-primary">
                {r.signal}
              </td>
              <td className="max-w-[12rem] px-3 py-1.5 text-muted">
                {r.raw}
              </td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums text-primary">
                {formatScore(r.normalized)}
              </td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums text-primary">
                {r.weight.toFixed(2)}
              </td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums text-primary">
                {formatScore(r.contribution)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function decisionHighlightClass(score: VendorScore): string {
  switch (score.budget_decision) {
    case 'scale_20':
      return 'border border-border bg-[#052E16] text-[#22C55E]';
    case 'hold':
      return 'border border-border bg-[#1C1708] text-[#EAB308]';
    case 'reduce_30':
      return 'border border-border bg-[#1C0A00] text-[#F97316]';
    case 'suspend':
      return 'border border-border bg-[#1C0505] text-[#EF4444]';
    case 'emergency_pause':
      return 'border-l-4 border-danger bg-emergency-bg text-danger';
    default:
      return 'border border-border bg-surface-raised text-primary';
  }
}

export function ScoreResult({ request, score, loading, error }: Props) {
  if (error) {
    return (
      <div className="rounded-lg border border-danger/40 bg-emergency-bg p-4 text-sm text-danger">
        {error}
      </div>
    );
  }

  if (!score && loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        Scoring…
      </div>
    );
  }

  if (!score) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-raised p-6 text-sm text-muted">
        Adjust inputs to score this vendor.
      </div>
    );
  }

  const { tqs, fraud } = buildBreakdownTables(request, score);
  const tqsSum = tqs.reduce((a, r) => a + r.contribution, 0);
  const fraudSum = fraud.reduce((a, r) => a + r.contribution, 0);
  const emerg = score.budget_decision === 'emergency_pause';

  return (
    <div className="space-y-4 rounded-lg bg-surface-container-low p-4">
      <div className="rounded-lg bg-surface-container p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-headline text-xl font-bold text-on-surface">Simulation Impact</h3>
          <p className="inline-flex items-center gap-2 font-mono text-[10px] text-on-surface-variant">
            <span className="h-2 w-2 animate-pulse rounded-full bg-tertiary shadow-[0_0_8px_#4ae176]" />
            CALCULATED_V4.2
          </p>
        </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">QUALITY SCORE</p>
          <p className="font-mono text-5xl font-bold tabular-nums text-tertiary">
            {formatScore(score.tqs)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">FRAUD PROB.</p>
          <p className="font-mono text-5xl font-bold tabular-nums text-error">
            {formatScore(score.fraud_p)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">EFFECTIVE</p>
          <p className="font-mono text-5xl font-bold tabular-nums text-primary">
            {formatScore(score.effective_score)}
          </p>
        </div>
      </div>
      </div>

      <div
        className={`rounded-lg border-l-4 bg-surface-container-high p-4 ${score.budget_decision.includes('pause') || score.budget_decision.includes('suspend') ? 'border-error' : 'border-tertiary'}`}
      >
        <p className="text-[10px] uppercase tracking-widest text-primary">
          RECOMMENDATION
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="font-headline text-2xl font-bold text-on-surface">{score.budget_decision_label}</p>
          <span className="rounded border border-outline-variant/15 px-2 py-1 font-mono text-xs text-on-surface">B+ STABLE</span>
        </div>
        <p className={`mt-2 text-sm ${emerg ? 'text-error' : 'text-on-surface-variant'}`}>
          {score.decision_reason}
        </p>
      </div>

      <BreakdownTable title="TQS breakdown" rows={tqs} />
      <p className="text-xs text-on-surface-variant">
        TQS sum of contributions:{' '}
        <span className="font-mono text-on-surface">{formatScore(tqsSum)}</span>{' '}
        (≈ TQS {formatScore(score.tqs)})
      </p>

      <BreakdownTable title="Fraud_P breakdown" rows={fraud} />
      <p className="text-xs text-on-surface-variant">
        Fraud_P sum of contributions:{' '}
        <span className="font-mono text-on-surface">{formatScore(fraudSum)}</span>{' '}
        (≈ Fraud_P {formatScore(score.fraud_p)})
      </p>

      <div className="rounded-lg bg-surface-container-high p-3 text-sm text-on-surface">
        <span className="font-semibold">Effective Score</span> = TQS × (1 −
        Fraud_P) = {formatScore(score.tqs)} × (1 −{' '}
        {formatScore(score.fraud_p)}) ={' '}
        <span className="font-mono font-semibold">
          {formatScore(score.effective_score)}
        </span>
      </div>

      <div className="rounded-lg bg-surface-container p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">PROJECTED YIELD SHIFT</p>
        <p className="font-mono text-[10px] text-on-surface-variant">6-HOUR FORECAST WINDOW</p>
        <div className="mt-2 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[22, 34, 18, 47, 62, 40].map((v, i) => ({ t: i === 4 ? 'NOW' : `T-${5 - i}`, v }))}>
              <XAxis dataKey="t" stroke="#c7c4d7" fontSize={10} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="v">
                {[22, 34, 18, 47, 62, 40].map((_, i) => (
                  <Cell key={i} fill={i === 4 ? '#c0c1ff' : '#c7c4d750'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {loading && <p className="font-mono text-[10px] uppercase text-on-surface-variant">SIMULATOR_ENGINE: IDLE_STANDBY</p>}
    </div>
  );
}
