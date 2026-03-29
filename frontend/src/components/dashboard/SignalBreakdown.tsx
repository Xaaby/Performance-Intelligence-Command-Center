import type { VendorScore } from '../../types/vendor.types';

const TQS_ROWS: { key: keyof VendorScore['signals']; label: string }[] = [
  { key: 'ip_diversity', label: 'IP diversity' },
  { key: 'geo_relevance', label: 'Geo relevance' },
  { key: 'device_fp_uniqueness', label: 'Device FP uniqueness' },
  { key: 'click_timing_variance', label: 'Click timing variance' },
  { key: 'bot_candidate_rate', label: 'Bot candidate rate' },
];

const FRAUD_ROWS: { key: keyof VendorScore['fraud_signals']; label: string }[] =
  [
    { key: 'velocity_anomaly', label: 'Velocity anomaly' },
    { key: 'ip_concentration', label: 'IP concentration' },
    { key: 'scanner_detection', label: 'Scanner detection' },
    { key: 'fp_clustering', label: 'FP clustering' },
    { key: 'behavioral_regularity', label: 'Behavioral regularity' },
  ];

type Props = {
  vendor: VendorScore;
  onAskAnalyst?: () => void;
};

function getSignalColor(value: number, isQuality: boolean): string {
  if (isQuality) {
    if (value >= 0.75) return '#4ae176';
    if (value >= 0.5) return '#a4c9ff';
    return '#ffb4ab';
  }
  if (value <= 0.2) return '#4ae176';
  if (value <= 0.5) return '#a4c9ff';
  return '#ffb4ab';
}

export function SignalBreakdown({ vendor, onAskAnalyst }: Props) {
  const renderSignalRow = (label: string, rawValue: number, isQuality: boolean) => {
    const signalValue = Math.min(1, Math.max(0, rawValue));
    const signalColor = getSignalColor(signalValue, isQuality);
    return (
      <div key={label} className="mb-3 flex items-center gap-3 last:mb-0">
        <span className="w-36 flex-shrink-0 font-body text-xs text-on-surface-variant">
          {label}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${signalValue * 100}%`,
              backgroundColor: signalColor,
            }}
          />
        </div>
        <span
          className="w-10 flex-shrink-0 text-right font-mono text-xs"
          style={{ color: signalColor }}
        >
          {signalValue.toFixed(2)}
        </span>
      </div>
    );
  };

  return (
    <div className="mx-6 mb-4 overflow-hidden rounded-lg border border-outline-variant/10 bg-surface-container-low">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/10 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-primary">analytics</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
            Signal Breakdown — {vendor.vendor_name}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] text-on-surface-variant">7-day rolling window</span>
          {onAskAnalyst && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAskAnalyst();
              }}
              className="group flex items-center gap-2 rounded border border-primary/20 px-4 py-2 transition-all hover:border-primary/50 hover:bg-primary/5"
              style={{
                background: 'linear-gradient(135deg, rgba(192,193,255,0.05), rgba(128,131,255,0.05))',
              }}
            >
              <span className="material-symbols-outlined text-sm text-primary">smart_toy</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-primary">Ask Analyst</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-outline-variant/10 gap-0">
        <div className="p-6">
          <p className="mb-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            Traffic Quality (TQS Inputs)
          </p>
          <div>
            {TQS_ROWS.map((row) =>
              renderSignalRow(row.label, vendor.signals[row.key], true),
            )}
          </div>
        </div>
        <div className="p-6">
          <p className="mb-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            Fraud Indicators
          </p>
          <div>
            {FRAUD_ROWS.map((row) =>
              renderSignalRow(row.label, vendor.fraud_signals[row.key], false),
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-outline-variant/10 bg-surface-container px-6 py-3">
        <span className="font-mono text-[10px] text-on-surface-variant">
          Effective Score = TQS x (1 - Fraud_P)
        </span>
        <span className="font-mono text-[10px] text-primary">
          {vendor.tqs.toFixed(3)} x (1 - {vendor.fraud_p.toFixed(3)}) ={' '}
          {vendor.effective_score.toFixed(3)}
        </span>
      </div>
    </div>
  );
}
