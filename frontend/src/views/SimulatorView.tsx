import { useEffect, useState } from 'react';
import { postScore } from '../api/client';
import type { ScoreRequest, VendorScore } from '../types/vendor.types';
import { VENDOR_PRESETS } from '../lib/scoring';
import { SimulatorForm } from '../components/simulator/SimulatorForm';
import { ScoreResult } from '../components/simulator/ScoreResult';
import { FormulaView } from '../components/simulator/FormulaView';

const DEBOUNCE_MS = 300;

export function SimulatorView() {
  const [request, setRequest] = useState<ScoreRequest>(VENDOR_PRESETS.B);
  const [score, setScore] = useState<VendorScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await postScore(request);
          if (!cancelled) {
            setScore(res);
          }
        } catch (e) {
          if (!cancelled) {
            setError(
              e instanceof Error ? e.message : 'Scoring request failed',
            );
            setScore(null);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [request]);

  return (
    <div className="mx-auto max-w-[1700px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-headline text-3xl font-bold text-on-surface">Scenario Simulator</h2>
          <p className="mt-1 max-w-3xl text-sm text-on-surface-variant">
            Adjust synthetic signal vectors to forecast scoring shifts and evaluate reallocation risks in a sandboxed environment.
          </p>
        </div>
        <div className="rounded bg-surface-container-high p-1">
          <button className="rounded bg-surface-container px-3 py-2 text-xs text-on-surface">Live Input</button>
          <button className="px-3 py-2 text-xs text-on-surface-variant">Comparison Mode</button>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <SimulatorForm value={request} onChange={setRequest} />
        <div className="space-y-4">
          <ScoreResult
            request={request}
            score={score}
            loading={loading}
            error={error}
          />
          <FormulaView score={score} />
        </div>
      </div>
    </div>
  );
}
