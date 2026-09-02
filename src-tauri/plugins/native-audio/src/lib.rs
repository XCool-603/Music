use serde::Serialize;
#[cfg(target_os = "ios")]
use std::sync::Mutex;
use tauri::{
    ipc::Channel,
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

/// Payload for the native `setSource` command: the stream URL plus track
/// metadata so the lock screen reflects the new track immediately.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(not(target_os = "ios"), allow(dead_code))]
pub struct NativeSetSourcePayload<'a> {
    url: &'a str,
    title: Option<&'a str>,
    artist: Option<&'a str>,
    album: Option<&'a str>,
    /// Track duration hint in seconds (0 when unknown yet).
    duration: f64,
    /// Resume position in seconds.
    position: f64,
}

/// Payload for the native `seek` command.
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(not(target_os = "ios"), allow(dead_code))]
pub struct NativeSeekPayload {
    position: f64,
}

/// Payload for the native `setRate` command.
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(not(target_os = "ios"), allow(dead_code))]
pub struct NativeRatePayload {
    rate: f64,
}

/// Payload for the native `registerSink` command: the back-channel used to push
/// position ticks / "track ended" / lock-screen remote commands into the
/// frontend. Serialized as `{"channel":"__CHANNEL__:<id>"}` for the Swift side.
#[derive(Serialize)]
#[cfg_attr(not(target_os = "ios"), allow(dead_code))]
pub struct NativeSinkPayload {
    channel: Channel<serde_json::Value>,
}

/// Returns whether native (AVPlayer) playback is available. True only when the
/// iOS plugin registered successfully; everywhere else playback stays HTML5.
pub fn native_playback_available<R: Runtime>(app: &AppHandle<R>) -> bool {
    #[cfg(target_os = "ios")]
    {
        return app.state::<NativeAudioState<R>>().0.lock().unwrap().is_some();
    }
    #[cfg(not(target_os = "ios"))]
    {
        let _ = app;
        return false;
    }
}

/// Load a new source (track URL) into the native AVPlayer.
pub fn native_set_source<R: Runtime>(
    app: &AppHandle<R>,
    url: &str,
    title: Option<&str>,
    artist: Option<&str>,
    album: Option<&str>,
    duration: f64,
    position: f64,
) -> tauri::Result<()> {
    #[cfg(target_os = "ios")]
    {
        let handle = app.state::<NativeAudioState<R>>().0.lock().unwrap().clone();
        if let Some(handle) = handle {
            if let Err(e) = handle.run_mobile_plugin::<()>(
                "setSource",
                NativeSetSourcePayload {
                    url,
                    title,
                    artist,
                    album,
                    duration,
                    position,
                },
            ) {
                eprintln!("[MUSE-AUDIO][native-audio] setSource failed: {e}");
            }
        }
    }
    #[cfg(not(target_os = "ios"))]
    {
        let _ = (app, url, title, artist, album, duration, position);
    }
    Ok(())
}

/// Start native playback (activates `.playback` audio session).
pub fn native_play<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    #[cfg(target_os = "ios")]
    {
        let handle = app.state::<NativeAudioState<R>>().0.lock().unwrap().clone();
        if let Some(handle) = handle {
            if let Err(e) = handle.run_mobile_plugin::<()>("play", ()) {
                eprintln!("[MUSE-AUDIO][native-audio] play failed: {e}");
            }
        }
    }
    #[cfg(not(target_os = "ios"))]
    {
        let _ = app;
    }
    Ok(())
}

/// Pause native playback (releases the audio session).
pub fn native_pause<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    #[cfg(target_os = "ios")]
    {
        let handle = app.state::<NativeAudioState<R>>().0.lock().unwrap().clone();
        if let Some(handle) = handle {
            if let Err(e) = handle.run_mobile_plugin::<()>("pause", ()) {
                eprintln!("[MUSE-AUDIO][native-audio] pause failed: {e}");
            }
        }
    }
    #[cfg(not(target_os = "ios"))]
    {
        let _ = app;
    }
    Ok(())
}

/// Seek the native player to the given position in seconds.
pub fn native_seek<R: Runtime>(app: &AppHandle<R>, position: f64) -> tauri::Result<()> {
    #[cfg(target_os = "ios")]
    {
        let handle = app.state::<NativeAudioState<R>>().0.lock().unwrap().clone();
        if let Some(handle) = handle {
            if let Err(e) = handle.run_mobile_plugin::<()>("seek", NativeSeekPayload { position }) {
                eprintln!("[MUSE-AUDIO][native-audio] seek failed: {e}");
            }
        }
    }
    #[cfg(not(target_os = "ios"))]
    {
        let _ = (app, position);
    }
    Ok(())
}

/// Change the native playback rate (0.5 - 2.0).
pub fn native_set_rate<R: Runtime>(app: &AppHandle<R>, rate: f64) -> tauri::Result<()> {
    #[cfg(target_os = "ios")]
    {
        let handle = app.state::<NativeAudioState<R>>().0.lock().unwrap().clone();
        if let Some(handle) = handle {
            if let Err(e) = handle.run_mobile_plugin::<()>("setRate", NativeRatePayload { rate }) {
                eprintln!("[MUSE-AUDIO][native-audio] setRate failed: {e}");
            }
        }
    }
    #[cfg(not(target_os = "ios"))]
    {
        let _ = (app, rate);
    }
    Ok(())
}

/// Register the back-channel receiving native → frontend events (tick / ended /
/// remote commands). The JS-side `Channel` is forwarded through the mobile
/// plugin bridge and re-decoded natively; sends route back over the same id.
pub fn native_register_sink<R: Runtime>(
    app: &AppHandle<R>,
    channel: Channel<serde_json::Value>,
) -> tauri::Result<()> {
    #[cfg(target_os = "ios")]
    {
        let handle = app.state::<NativeAudioState<R>>().0.lock().unwrap().clone();
        if let Some(handle) = handle {
            if let Err(e) = handle.run_mobile_plugin::<()>("registerSink", NativeSinkPayload { channel }) {
                eprintln!("[MUSE-AUDIO][native-audio] registerSink failed: {e}");
            }
        }
    }
    #[cfg(not(target_os = "ios"))]
    {
        let _ = (app, channel);
    }
    Ok(())
}