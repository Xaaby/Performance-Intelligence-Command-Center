import axios from 'axios';
import { asArray } from '../lib/asArray';
import { getApiBaseUrl } from '../lib/apiBase';
import type {
  ExperimentsResponse,
  LiveVendorScoreUpdate,
  RedirectEvent,
  RedirectStatsResponse,
  RedirectVendorStats,
  ScoreRequest,
  VendorScore,
  VendorsResponse,
  VendorsSummary,
} from '../types/vendor.types';

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

const EMPTY_VENDORS_SUMMARY: VendorsSummary = {
  total_vendors: 0,
  high_quality_count: 0,
  medium_quality_count: 0,
  low_quality_count: 0,
  suspended_count: 0,
  fraud_review_count: 0,
  total_budget_at_risk: 0,
};

export async function getVendors(): Promise<VendorsResponse> {
  const { data } = await api.get<unknown>('/vendors');
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid vendors response: expected a JSON object');
  }
  const d = data as Record<string, unknown>;
  if (!('vendors' in d)) {
    const msg = d.message;
    throw new Error(
      typeof msg === 'string'
        ? msg
        : 'Invalid vendors response: missing vendors (check VITE_API_URL points at the Nest API /api)',
    );
  }
  const raw = d as Partial<VendorsResponse>;
  return {
    vendors: asArray<VendorScore>(raw.vendors),
    summary:
      raw.summary && typeof raw.summary === 'object' && raw.summary !== null
        ? (raw.summary as VendorsSummary)
        : EMPTY_VENDORS_SUMMARY,
    computed_at:
      typeof raw.computed_at === 'string'
        ? raw.computed_at
        : new Date().toISOString(),
  };
}

export async function postScore(body: ScoreRequest): Promise<VendorScore> {
  const { data } = await api.post<VendorScore>('/score', body);
  return data;
}

export async function getExperiments(): Promise<ExperimentsResponse> {
  const { data } = await api.get<ExperimentsResponse>('/experiments');
  return data;
}

export async function getRedirectStats(): Promise<RedirectStatsResponse> {
  const { data } = await api.get<unknown>('/redirect/stats');
  const d = data as Partial<RedirectStatsResponse> | null | undefined;
  return {
    vendors: asArray<RedirectVendorStats>(d?.vendors),
    total_clicks_last_60s:
      typeof d?.total_clicks_last_60s === 'number' ? d.total_clicks_last_60s : 0,
    last_updated: typeof d?.last_updated === 'string' ? d.last_updated : '',
  };
}

export async function getRedirectEvents(
  vendorId?: string,
  limit = 20,
): Promise<RedirectEvent[]> {
  const { data } = await api.get<unknown>('/redirect/events', {
    params: { vendor_id: vendorId, limit },
  });
  return asArray<RedirectEvent>(data);
}

export async function getLiveVendorUpdates(): Promise<LiveVendorScoreUpdate[]> {
  const { data } = await api.get<unknown>('/vendors/live-updates');
  return asArray<LiveVendorScoreUpdate>(data);
}
