import axios from 'axios';
import { getApiBaseUrl } from '../lib/apiBase';
import type {
  ExperimentsResponse,
  LiveVendorScoreUpdate,
  RedirectEvent,
  RedirectStatsResponse,
  ScoreRequest,
  VendorScore,
  VendorsResponse,
} from '../types/vendor.types';

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

export async function getVendors(): Promise<VendorsResponse> {
  const { data } = await api.get<VendorsResponse>('/vendors');
  return data;
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
  const { data } = await api.get<RedirectStatsResponse>('/redirect/stats');
  return data;
}

export async function getRedirectEvents(
  vendorId?: string,
  limit = 20,
): Promise<RedirectEvent[]> {
  const { data } = await api.get<RedirectEvent[]>('/redirect/events', {
    params: { vendor_id: vendorId, limit },
  });
  return data;
}

export async function getLiveVendorUpdates(): Promise<LiveVendorScoreUpdate[]> {
  const { data } = await api.get<LiveVendorScoreUpdate[]>('/vendors/live-updates');
  return data;
}
