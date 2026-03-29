import { useCallback, useEffect, useState } from 'react';
import { getVendors } from '../api/client';
import type { VendorScore, VendorsResponse } from '../types/vendor.types';

const POLL_MS = 30_000;

export function useVendors() {
  const [data, setData] = useState<VendorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const res = await getVendors();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return {
    vendors: data?.vendors ?? ([] as VendorScore[]),
    summary: data?.summary ?? null,
    computedAt: data?.computed_at ?? null,
    loading,
    error,
    refresh,
  };
}
