use serde::Serialize;
#[cfg(target_os = "ios")]
use std::sync::Mutex;
use tauri::{
    plugin::{Builder, PluginApi, TauriPlugin},
    AppHandle, Manager, Runtime,
};
#[cfg(target_os = "ios")]
use tauri::plugin::PluginHandle;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_native_audio);

/// Payload forwarded to the native (iOS Swift) helper over the mobile plugin
/// channel. Mirrors the fields the audio engine exposes so the native side can
/// render lock-screen / control-center metadata and keep the audio session
/// alive while the screen is off.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(not(target_os = "ios"), allow(dead_code))]
struct PlaybackStatePayload<'a> {
    playing: bool,
    title: Option<&'a str>,
    artist: Option<&'a str>,
    album: Option<&'a str>,
    /// Track duration in seconds (0 when unknown yet).
    duration: f64,
    /// Current playback position in seconds.
    position: f64,
    /// Audio source URL (used by the native side to keep the session warm).
    #[serde(rename = "streamUrl")]
    stream_url: Option<&'a str>,
}

/// Managed handle to the registered iOS native plugin.
#[cfg(target_os = "ios")]
pub struct NativeAudioState<R: Runtime>(Mutex<Option<PluginHandle<R>>>);

/// Placeholder for non-iOS targets; native calls are no-ops there.
#[cfg(not(target_os = "ios"))]
pub struct NativeAudioState;

/// Initializes the native-audio plugin.
///
/// On iOS this registers the Swift `NativeAudioPlugin` class during setup so
/// the frontend can drive `AVAudioSession` + lock-screen metadata. On every
/// other platform the plugin is inert.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("native-audio")
        .setup(|app, api: PluginApi<R, ()>| {
            #[cfg(target_os = "ios")]
            {
                match api.register_ios_plugin(init_plugin_native_audio) {
                    Ok(handle) => {
                        app.manage(NativeAudioState(Mutex::new(Some(handle))));
                    }
                    Err(e) => {
                        app.manage(NativeAudioState::<R>(Mutex::new(None)));
                        eprintln!(
                            "[MUSE-AUDIO][native-audio] failed to register ios plugin: {e}"
                        );
                    }
                }
            }
            #[cfg(not(target_os = "ios"))]
            {
                let _ = api;
                app.manage(NativeAudioState);
            }
            Ok(())
        })
        .build()
}

/// Forward the current playback state to the native background/ lock-screen
/// helper. On iOS this:
///   - keeps `AVAudioSession` configured as `.playback` (+ active), so the
///     WKWebView HTML5 audio may continue while the screen is off
///   - updates `MPNowPlayingInfoCenter` + `MPRemoteCommandCenter` metadata
///   - calls `setActive(false)` when paused so other apps can play audio
pub fn set_playback_state<R: Runtime>(
    app: &AppHandle<R>,
    playing: bool,
    title: Option<&str>,
    artist: Option<&str>,
    album: Option<&str>,
    duration: f64,
    position: f64,
    stream_url: Option<&str>,
) -> tauri::Result<()> {
    #[cfg(target_os = "ios")]
    {
        let state = app.state::<NativeAudioState<R>>();
        let handle = state.0.lock().unwrap().clone();
        if let Some(handle) = handle {
            if let Err(e) = handle.run_mobile_plugin::<()>(
                "setPlaybackState",
                PlaybackStatePayload {
                    playing,
                    title,
                    artist,
                    album,
                    duration,
                    position,
                    stream_url,
                },
            ) {
                eprintln!("[MUSE-AUDIO][native-audio] setPlaybackState failed: {e}");
            }
        }
    }
    #[cfg(not(target_os = "ios"))]
    {
        let _ = (app, playing, title, artist, album, duration, position, stream_url);
    }
    Ok(())
}