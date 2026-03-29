import type { ColdStartVendor } from '../../types/vendor.types';

type Props = {
  vendor: ColdStartVendor;
};

export function ColdStartCard({ vendor }: Props) {
  const ready = vendor.days_active >= 5 && vendor.clicks_so_far > 500;
  const readiness = Math.min(ready ? 100 : 99, (vendor.clicks_so_far / 2000) * 100);
  return (
    <div className={`mb-3 rounded-lg border border-outline-variant/10 bg-surface-container p-4 ${ready ? 'border-l-2 border-l-tertiary' : 'border-l-2 border-l-secondary/40'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-headline text-sm font-bold text-on-surface">{vendor.vendor_name}</p>
          <p className="mt-0.5 font-mono text-[10px] text-on-surface-variant">#{vendor.vendor_id}</p>
        </div>
        <span className={`rounded px-2 py-0.5 font-mono text-[10px] ${ready ? 'bg-tertiary/10 text-tertiary' : 'bg-secondary/10 text-secondary'}`}>
          {ready ? 'READY' : 'SYNCING'}
        </span>
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Readiness Score</p>
      <div className="mt-1 h-1.5 rounded-full bg-surface-container-highest">
        <div className={`h-1.5 rounded-full transition-all duration-500 ${ready ? 'bg-tertiary/80' : 'bg-secondary/40'}`} style={{ width: `${readiness}%` }} />
      </div>
      <p className={`mt-1 text-right font-mono text-[10px] ${ready ? 'text-tertiary' : 'text-secondary'}`}>{readiness.toFixed(0)}%</p>
      <p className="mt-2 inline-flex items-center gap-1 text-xs text-on-surface-variant">
        <span className="material-symbols-outlined text-sm">{ready ? 'check_circle' : 'schedule'}</span>
        {ready ? 'Traffic Eligible' : 'Latency Pending'}
      </p>
    </div>
  );
}
