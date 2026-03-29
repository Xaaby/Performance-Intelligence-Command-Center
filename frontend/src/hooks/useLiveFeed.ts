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
  const [lastReceivedAt, setLastReceivedAt] = useState<number | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const res = await getRedirectStats();
      setStats(res);
      if (res.total_clicks_last_60s > 0) {
        setLastReceivedAt(Date.now());
      }
    } catch {
      // Keep dashboard alive during transient backend errors.
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const res = await getRedirectEvents(undefined, 10);
      setEvents(res);
      if (res.length > 0) {
        setLastReceivedAt(Date.now());
      }
    } catch {
      // Keep dashboard alive during transient backend errors.
    }
  }, []);

  const refreshUpdates = useCallback(async () => {
    try {
      const res = await getLiveVendorUpdates();
      setUpdates(res);
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

  const stale = lastReceivedAt === null ? true : Date.now() - lastReceivedAt > 30_000;

  return {
    stats,
    events,
    updates,
    stale,
  };
}
