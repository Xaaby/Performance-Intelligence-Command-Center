import { useCallback, useEffect, useState } from 'react';
import { getLiveVendorUpdates, getRedirectEvents, getRedirectStats } from '../api/client';
import type { LiveVendorScoreUpdate, RedirectEvent, RedirectStatsResponse } from '../types/vendor.types';

const STATS_POLL_MS = 3_000;
const EVENTS_POLL_MS = 2_000;
const UPDATES_POLL_MS = 5_000;

export function useLiveFeed(suspended = false) {
  const [stats, setStats] = useState<RedirectStatsResponse | null>(null);
  const [events, setEvents] = useState<RedirectEvent[]>([]);
  const [updates, setUpdates] = useState<LiveVendorScoreUpdate[]>([]);
  /** Last live click traffic (events or non-zero 60s rollups). Stale only if this was set then went quiet. */
  const [lastReceivedAt, setLastReceivedAt] = useState<number | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const res = await getRedirectStats();
      if (res && typeof res === 'object' && !Array.isArray(res)) {
        setStats(res);
        if (res.total_clicks_last_60s > 0) {
          setLastReceivedAt(Date.now());
        }
      }
    } catch {
      // Keep dashboard alive during transient backend errors.
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const res = await getRedirectEvents(undefined, 10);
      const safeEvents = Array.isArray(res) ? res : [];
      setEvents(safeEvents);
      if (safeEvents.length > 0) {
        setLastReceivedAt(Date.now());
      }
    } catch {
      // Keep dashboard alive during transient backend errors.
    }
  }, []);

  const refreshUpdates = useCallback(async () => {
    try {
      const res = await getLiveVendorUpdates();
      setUpdates(Array.isArray(res) ? res : []);
    } catch {
      // Keep dashboard alive during transient backend errors.
    }
  }, []);

  useEffect(() => {
    void refreshStats();
    void refreshEvents();
    void refreshUpdates();
  }, [refreshEvents, refreshStats, refreshUpdates]);

  useEffect(() => {
    if (suspended) {
      return;
    }
    const statsId = window.setInterval(() => void refreshStats(), STATS_POLL_MS);
    const eventsId = window.setInterval(() => void refreshEvents(), EVENTS_POLL_MS);
    const updatesId = window.setInterval(() => void refreshUpdates(), UPDATES_POLL_MS);
    return () => {
      window.clearInterval(statsId);
      window.clearInterval(eventsId);
      window.clearInterval(updatesId);
    };
  }, [refreshEvents, refreshStats, refreshUpdates, suspended]);

  // Before any live clicks exist, lastReceivedAt stays null — do not show "sync latency" (that was a false positive on fresh deploys).
  const stale =
    lastReceivedAt !== null && Date.now() - lastReceivedAt > 30_000;

  return {
    stats,
    events,
    updates,
    stale,
  };
}
