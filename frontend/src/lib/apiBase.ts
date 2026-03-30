/**
 * Base URL for Nest routes under `/api` (no trailing slash).
 * Accepts Railway-style `https://host`, `https://host/api`, or dev default `/api`.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (raw === undefined || raw === '') return '/api';
  const trimmed = String(raw).trim().replace(/\/$/, '');
  if (trimmed === '' || trimmed === '/api') return '/api';
  if (trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
}
