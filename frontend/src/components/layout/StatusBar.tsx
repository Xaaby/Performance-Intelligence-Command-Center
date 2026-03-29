import type { VendorsSummary } from '../../types/vendor.types';
import { formatPct } from '../../lib/format';

type Props = {
  summary: VendorsSummary | null;
};

export function StatusBar({ summary }: Props) {
  if (!summary) {
    return (
      <div className="border-b border-border bg-surface px-4 py-3 text-sm text-muted sm:px-6">
        Loading campaign summary…
      </div>
    );
  }

  const items: { label: string; value: string; valueClass?: string }[] = [
    { label: 'Vendors', value: String(summary.total_vendors) },
    {
      label: 'High Q',
      value: String(summary.high_quality_count),
      valueClass: 'text-success',
    },
    {
      label: 'Medium Q',
      value: String(summary.medium_quality_count),
      valueClass: 'text-warning',
    },
    {
      label: 'Low Q',
      value: String(summary.low_quality_count),
      valueClass: 'text-orange-tier',
    },
    {
      label: 'Suspended',
      value: String(summary.suspended_count),
      valueClass: 'text-danger',
    },
    {
      label: 'Fraud review',
      value: String(summary.fraud_review_count),
      valueClass: 'text-danger',
    },
    {
      label: 'Budget at risk',
      value: formatPct(summary.total_budget_at_risk),
      valueClass: 'font-semibold text-danger',
    },
  ];

  return (
    <div className="border-b border-border bg-surface px-4 py-2 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline gap-1.5">
            <span className="text-muted">{item.label}</span>
            <span
              className={`font-mono font-medium text-primary ${item.valueClass ?? ''}`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
