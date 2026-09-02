/**
 * Frontend bridge to the native-audio (AVPlayer) plugin.
 *
 * On iOS the app plays audio with a native `AVPlayer` instead of WKWebView HTML5
 * audio so playback keeps running while the screen is off / the app is
 * backgrounded. Position ticks, "track ended", native errors and lock-screen
 * remote commands (next/prev) stream back to the frontend over a Tauri `Channel`.
 * On desktop / plain browser every call degrades to a silent no-op.
 */

import { invoke, Channel } from '@tauri-apps/api/core';

export interface PlaybackStateInput {
  playing: boolean;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  position?: number;
  streamUrl?: string;
}

export type NativeRemoteCommand = 'next' | 'prev';

export interface NativePlaybackHandlers {
  /** Track finished playing. Mirrors the HTML5 `ended` event. */
  onEnded: () => void;
  /** Lock-screen / Control Center "next" / "prev" pressed. */
  onRemoteCommand: (command: NativeRemoteCommand) => void;
  /** Native AVPlayer failed to play the current source. */
  onPlaybackError?: () => void;
}

interface NativeEvent {
  type: 'tick' | 'state' | 'ended' | 'remote' | 'error';
  playing: boolean;
  position: number;
  duration: number;
  command?: 'next' | 'prev';
}

export interface NativeSnapshot {
  playing: boolean;
  position: number;
  /** Native-reported track duration (0 while unknown). */
  duration: number;
}

interface NativeState {
  available: boolean;
  initialized: boolean;
  snapshot: NativeSnapshot;
  lastTickAt: number;
  interactive: boolean;
}

const state: NativeState = {
  available: false,
  initialized: false,
  snapshot: { playing: false, position: 0, duration: 0 },
  lastTickAt: 0,
  interactive: false,
};

function canInvoke(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Wire up the native back-channel once. The `Channel` is registered with the
 * Swift plugin through the Rust mobile bridge; every native → JS event is
 * delivered to the matching handler here. Resolves true when native playback is
 * available (iOS with the plugin registered), false everywhere else.
 */
export async function initNativePlayback(handlers: NativePlaybackHandlers): Promise<boolean> {
  if (!canInvoke()) return false;
  if (state.initialized) return state.available;

  state.initialized = true;
  try {
    const available = await invoke<boolean>('native_playback_available');
    state.available = available;
    if (!available) return false;

    const channel = new Channel<NativeEvent>((event) => {
      state.interactive = true;
      switch (event.type) {
        case 'tick':
        case 'state':
          state.snapshot.playing = event.playing;
          state.snapshot.position = event.position;
          if (event.duration > 0) state.snapshot.duration = event.duration;
          state.lastTickAt = Date.now();
          break;
        case 'ended':
          state.snapshot.playing = false;
          state.snapshot.position = 0;
          state.lastTickAt = Date.now();
          handlers.onEnded();
          break;
        case 'remote':
          if (event.command === 'next' || event.command === 'prev') {
            handlers.onRemoteCommand(event.command);
          }
          break;
        case 'error':
          handlers.onPlaybackError?.();
          break;
      }
    });

    await invoke('native_register_sink', { channel });
    return true;
  } catch (err) {
    console.warn('[nativeAudio] initNativePlayback failed:', err);
    state.available = false;
    return false;
  }
}

/** True once initNativePlayback resolved with native playback available. */
export function isNativePlayback(): boolean {
  return state.available;
}

/** Load a new source (track URL) into the native AVPlayer. */
export async function nativeSetSource(
  url: string,
  meta: { title?: string; artist?: string; album?: string; duration: number },
  position = 0
): Promise<boolean> {
  if (!state.available) return false;
  try {
    await invoke('native_set_source', {
      url,
      title: meta.title ?? null,
      artist: meta.artist ?? null,
      album: meta.album ?? null,
      duration: meta.duration || 0,
      position: position || 0,
    });
    state.snapshot.playing = false;
    state.snapshot.position = position || 0;
    state.snapshot.duration = meta.duration || 0;
    state.lastTickAt = Date.now();
    return true;
  } catch (err) {
    console.warn('[nativeAudio] native_set_source failed:', err);
    return false;
  }
}

export async function nativePlay(): Promise<boolean> {
  if (!state.available) return false;
  try {
    await invoke('native_play');
    state.snapshot.playing = true;
    state.lastTickAt = Date.now();
    return true;
  } catch (err) {
    console.warn('[nativeAudio] native_play failed:', err);
    return false;
  }
}

export async function nativePause(): Promise<boolean> {
  if (!state.available) return false;
  try {
    await invoke('native_pause');
    state.snapshot.playing = false;
    state.lastTickAt = Date.now();
    return true;
  } catch (err) {
    console.warn('[nativeAudio] native_pause failed:', err);
    return false;
  }
}

export async function nativeSeek(position: number): Promise<boolean> {
  if (!state.available) return false;
  try {
    await invoke('native_seek', { position: position || 0 });
    state.snapshot.position = position || 0;
    state.lastTickAt = Date.now();
    return true;
  } catch (err) {
    console.warn('[nativeAudio] native_seek failed:', err);
    return false;
  }
}

export async function nativeSetRate(rate: number): Promise<boolean> {
  if (!state.available) return false;
  try {
    await invoke('native_set_rate', { rate });
    return true;
  } catch (err) {
    console.warn('[nativeAudio] native_set_rate failed:', err);
    return false;
  }
}

/**
 * Best-guess current position: the last native-reported value plus drift toward
 * app messages at 1 tick/sec. Falls back to snapshot.position when unknown.
 */
export function getNativePosition(): number {
  if (!state.available) return 0;
  const { snapshot, lastTickAt, interactive } = state;
  if (!interactive || !snapshot.playing || !lastTickAt) return snapshot.position;
  const drift = (Date.now() - lastTickAt) / 1000;
  return snapshot.position + Math.max(0, Math.min(2, drift));
}

export function getNativeSnapshot(): NativeSnapshot {
  return {
    playing: state.snapshot.playing,
    position: getNativePosition(),
    duration: state.snapshot.duration,
  };
}

/**
 * Refresh the lock-screen Now Playing metadata. Used for every playback state
 * surface so the Control Center artwork/title stay in sync (and as the native
 * session heartbeat on older builds). Resolves false when the bridge is missing.
 */
export async function setPlaybackState(input: PlaybackStateInput): Promise<boolean> {
  if (!canInvoke()) return false;
  try {
    await invoke('set_playback_state', {
      playing: input.playing,
      title: input.title ?? null,
      artist: input.artist ?? null,
      album: input.album ?? null,
      duration: input.duration ?? 0,
      position: input.position ?? 0,
      stream_url: input.streamUrl ?? null,
    });
    return true;
  } catch {
    return false;
  }
}