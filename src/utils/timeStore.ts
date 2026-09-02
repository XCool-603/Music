import { useSyncExternalStore } from 'react';

/**
 * Module-singleton store for continuous playback time.
 *
 * Kept OUT of React state on purpose: feeding `currentTime` through App state
 * via a requestAnimationFrame loop re-rendered the entire component tree at
 * 60fps. Here, only components that actually display time subscribe — and they
 * receive notifications at a capped rate (default 10fps), so the app idles
 * while playing instead of re-rendering every frame.
 */

export interface TimeSnapshot {
  time: number;
  duration: number;
}

type Listener = () => void;

const NOTIFY_INTERVAL_MS = 100; // 10fps cap for React consumers

let snapshot: TimeSnapshot = { time: 0, duration: 0 };
const listeners = new Set<Listener>();

let lastNotifiedAt = 0;
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

function notify(immediate: boolean): void {
  if (immediate) {
    if (notifyTimer !== null) {
      clearTimeout(notifyTimer);
      notifyTimer = null;
    }
    lastNotifiedAt = Date.now();
    listeners.forEach((fn) => fn());
    return;
  }
  const now = Date.now();
  const elapsed = now - lastNotifiedAt;
  if (elapsed >= NOTIFY_INTERVAL_MS) {
    lastNotifiedAt = now;
    listeners.forEach((fn) => fn());
    return;
  }
  // Schedule a trailing notification so the final value always lands.
  if (notifyTimer === null) {
    notifyTimer = setTimeout(() => {
      notifyTimer = null;
      lastNotifiedAt = Date.now();
      listeners.forEach((fn) => fn());
    }, NOTIFY_INTERVAL_MS - elapsed);
  }
}

export const timeStore = {
  /** Sync read without subscribing (safe inside callbacks/effects). */
  get(): TimeSnapshot {
    return snapshot;
  },

  getTime(): number {
    return snapshot.time;
  },

  getDuration(): number {
    return snapshot.duration;
  },

  /**
   * Update playback time. `immediate` bypasses the notify throttle — used on
   * seek so the progress bar jumps instantly.
   */
  setTime(t: number, immediate = false): void {
    if (!Number.isFinite(t) || t < 0) return;
    if (t === snapshot.time) return;
    snapshot = { ...snapshot, time: t };
    notify(immediate);
  },

  setDuration(d: number): void {
    if (!Number.isFinite(d) || d < 0 || d === snapshot.duration) return;
    snapshot = { ...snapshot, duration: d };
    notify(false);
  },

  /** Reset on track change: zero the time and notify immediately. */
  reset(duration = 0): void {
    snapshot = { time: 0, duration };
    notify(true);
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

/**
 * Subscribe to playback time with a notify-rate already capped at 10fps
 * globally. Returns the current time in seconds.
 */
export function useAudioTime(): number {
  return useSyncExternalStore(
    timeStore.subscribe,
    () => snapshot.time,
    () => 0
  );
}
