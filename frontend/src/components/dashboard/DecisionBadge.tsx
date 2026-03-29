import type { BudgetDecision } from '../../types/vendor.types';

type Props = {
  decision: BudgetDecision;
  label: string;
};

function classesForDecision(d: BudgetDecision): string {
  switch (d) {
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
      return 'border border-border bg-surface-raised text-muted';
  }
}

export function DecisionBadge({ decision, label }: Props) {
  return (
    <span
      className={`inline-flex max-w-full truncate rounded px-2 py-0.5 text-xs font-medium ${classesForDecision(decision)}`}
      title={label}
    >
      {label}
    </span>
  );
}
