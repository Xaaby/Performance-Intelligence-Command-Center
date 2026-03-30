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
  const d = data as Partial<VendorsResponse> | null | undefined;
  return {
    vendors: asArray<VendorScore>(d?.vendors),
    summary:
      d?.summary && typeof d.summary === 'object' && d.summary !== null
        ? (d.summary as VendorsSummary)
        : EMPTY_VENDORS_SUMMARY,
    computed_at:
      typeof d?.computed_at === 'string'
        ? d.computed_at
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
