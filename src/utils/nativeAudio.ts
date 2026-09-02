/**
 * Thin frontend bridge to the native-audio plugin.
 *
 * On iOS (Tauri), `setPlaybackState` drives AVAudioSession (.playback) and the
 * lock-screen Now Playing metadata so HTML5 audio keeps playing with the screen
 * off. On desktop / plain browser this is a silent no-op.
 */

export interface PlaybackStateInput {
  playing: boolean;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  position?: number;
  streamUrl?: string;
}

function canInvoke(): boolean {
  try {
    const tauri = (window as unknown as { __TAURI_INTERNALS__?: { invoke?: () => unknown } })
      .__TAURI_INTERNALS__;
    return !!tauri?.invoke;
  } catch {
    return false;
  }
}

/**
 * Forward the playback state to native. Resolves false when the bridge is not
 * available (browser/desktop) so callers can feature-detect silently.
 */
export async function setPlaybackState(input: PlaybackStateInput): Promise<boolean> {
  if (!canInvoke()) return false;
  try {
    const tauri = (window as unknown as {
      __TAURI_INTERNALS__: { invoke: (cmd: string, args: Record<string, unknown>) => Promise<unknown> };
    }).__TAURI_INTERNALS__;
    await tauri.invoke('set_playback_state', {
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