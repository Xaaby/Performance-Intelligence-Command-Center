import { formatScore } from '../../lib/format';
import {
  coldStartBadgeClasses,
  scoreBarFillClasses,
  scoreBadgeWrapClasses,
  scoreTextClasses,
  type ScoreTone,
} from '../../lib/scoreStyles';

type Props = {
  value: number;
  className?: string;
  /** quality: higher is better (TQS, effective). risk: higher is worse (Fraud_P). */
  tone?: ScoreTone;
  /** Cold-start vendors use blue tier styling. */
  coldStart?: boolean;
};

export function ScoreBadge({
  value,
  className = '',
  tone = 'quality',
  coldStart = false,
}: Props) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const wrapClass = coldStart
    ? coldStartBadgeClasses()
    : scoreBadgeWrapClasses(value, tone);
  const textClass = coldStart ? 'text-[#60A5FA]' : scoreTextClasses(value, tone);
  const barClass = scoreBarFillClasses(value, tone);

  return (
    <div
      className={`relative inline-flex min-w-[4rem] items-center justify-end rounded px-2 py-0.5 ${wrapClass} ${className}`}
    >
      <div
        className={`absolute inset-y-0 left-0 rounded-l ${barClass} opacity-90`}
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <span
        className={`relative z-10 font-mono text-sm font-medium tabular-nums ${textClass}`}
      >
        {formatScore(value)}
      </span>
    </div>
  );
}
