export function formatScore(n: number): string {
  return n.toFixed(2);
}

export function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function formatIsoTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
