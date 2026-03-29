import type { ScoreRequest } from '../../types/vendor.types';
import { VENDOR_PRESETS, type VendorPresetKey } from '../../lib/scoring';

type Props = {
  value: ScoreRequest;
  onChange: (next: ScoreRequest) => void;
};

type NumKey = Exclude<keyof ScoreRequest, 'vendor_name'>;

const NUMERIC_FIELDS: {
  key: NumKey;
  label: string;
  min: number;
  max: number;
  step?: number;
  type: 'int' | 'float';
}[] = [
  {
    key: 'total_clicks',
    label: 'Total clicks',
    min: 1,
    max: 500_000,
    step: 1,
    type: 'int',
  },
  {
    key: 'unique_ips',
    label: 'Unique IPs',
    min: 0,
    max: 500_000,
    step: 1,
    type: 'int',
  },
  {
    key: 'in_geo_clicks',
    label: 'In-geo clicks',
    min: 0,
    max: 500_000,
    step: 1,
    type: 'int',
  },
  {
    key: 'unique_device_fps',
    label: 'Unique device FPs',
    min: 0,
    max: 500_000,
    step: 1,
    type: 'int',
  },
  {
    key: 'click_timing_cov',
    label: 'Click timing CoV',
    min: 0,
    max: 5,
    step: 0.01,
    type: 'float',
  },
  {
    key: 'bot_flagged_clicks',
    label: 'Bot-flagged clicks',
    min: 0,
    max: 500_000,
    step: 1,
    type: 'int',
  },
  {
    key: 'max_clicks_per_60s',
    label: 'Max clicks / 60s',
    min: 0,
    max: 5000,
    step: 1,
    type: 'int',
  },
  {
    key: 'max_single_ip_clicks',
    label: 'Max single-IP clicks',
    min: 0,
    max: 50_000,
    step: 1,
    type: 'int',
  },
  {
    key: 'device_fp_max_24h',
    label: 'Device FP max (24h)',
    min: 0,
    max: 2000,
    step: 1,
    type: 'int',
  },
  {
    key: 'scanner_clicks',
    label: 'Scanner clicks',
    min: 0,
    max: 50_000,
    step: 1,
    type: 'int',
  },
];

function patch<K extends keyof ScoreRequest>(
  prev: ScoreRequest,
  key: K,
  val: ScoreRequest[K],
): ScoreRequest {
  return { ...prev, [key]: val };
}

export function SimulatorForm({ value, onChange }: Props) {
  const loadPreset = (k: VendorPresetKey) => {
    onChange({ ...VENDOR_PRESETS[k] });
  };

  return (
    <div className="space-y-4 rounded-lg bg-surface-container-low p-4">
      <div className="rounded bg-surface-container-high p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-headline text-xl font-bold text-on-surface">Input Configuration</h3>
          <div className="flex items-center gap-2">
            <button className="text-xs text-on-surface-variant hover:text-on-surface">RESET TO PRESET</button>
            <button className="rounded bg-surface-container px-3 py-1.5 text-xs text-on-surface">SAVE SCENARIO</button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => loadPreset('A')}
          className="rounded bg-surface-container-high px-3 py-1.5 text-xs font-medium text-on-surface hover:opacity-90"
        >
          Load Clean Vendor
        </button>
        <button
          type="button"
          onClick={() => loadPreset('B')}
          className="rounded bg-surface-container-high px-3 py-1.5 text-xs font-medium text-on-surface hover:opacity-90"
        >
          Load Fraud Vendor
        </button>
        <button
          type="button"
          onClick={() => loadPreset('C')}
          className="rounded bg-surface-container-high px-3 py-1.5 text-xs font-medium text-on-surface hover:opacity-90"
        >
          Load New Vendor
        </button>
      </div>

      <div>
        <label className="block text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
          Source Archetype Preset
          <input
            className="mt-1 w-full rounded border border-outline-variant/20 bg-surface-container-low px-3 py-2 font-mono text-sm text-on-surface"
            value={value.vendor_name}
            onChange={(e) =>
              onChange(patch(value, 'vendor_name', e.target.value))
            }
          />
        </label>
      </div>

      <div className="space-y-4">
        {NUMERIC_FIELDS.map((f) => {
          const v = value[f.key];
          const isFraud = f.key === 'max_clicks_per_60s' || f.key === 'max_single_ip_clicks' || f.key === 'bot_flagged_clicks';
          return (
            <div key={f.key} className="rounded bg-surface-container p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm text-on-surface">
                  {f.label}
                </label>
                <span className={`rounded bg-surface-container-high px-2 py-0.5 font-mono text-sm ${isFraud && Number(v) > f.max * 0.6 ? 'text-error' : 'text-primary'}`}>
                  {v}
                </span>
              </div>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step ?? 1}
                value={v}
                onChange={(e) => {
                  const n =
                    f.type === 'int'
                      ? parseInt(e.target.value, 10)
                      : parseFloat(e.target.value);
                  onChange(patch(value, f.key, n as ScoreRequest[NumKey]));
                }}
                className="mt-2 h-1 w-full appearance-none rounded-full bg-surface-container-highest accent-primary"
              />
              <div className="mt-1 flex justify-between text-[10px] text-on-surface-variant">
                <span>LOW</span>
                <span>HIGH</span>
              </div>
              <input
                type="number"
                min={f.min}
                max={f.max}
                step={f.step ?? 1}
                value={v}
                onChange={(e) => {
                  const n =
                    f.type === 'int'
                      ? parseInt(e.target.value, 10) || 0
                      : parseFloat(e.target.value) || 0;
                  onChange(patch(value, f.key, n as ScoreRequest[NumKey]));
                }}
                className="mt-1 w-full rounded border border-outline-variant/15 bg-surface-container-low px-2 py-1 font-mono text-xs text-on-surface"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
