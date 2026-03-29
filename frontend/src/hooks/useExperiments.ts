import { useCallback, useEffect, useState } from 'react';
import { getExperiments } from '../api/client';
import type { ExperimentsResponse } from '../types/vendor.types';

export function useExperiments() {
  const [data, setData] = useState<ExperimentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const res = await getExperiments();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load experiments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    experiments: data?.experiments ?? [],
    banditAllocations: data?.bandit_allocations ?? [],
    coldStartVendors: data?.cold_start_vendors ?? [],
    loading,
    error,
    refresh,
  };
}
