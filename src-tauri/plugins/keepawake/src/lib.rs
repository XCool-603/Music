use serde::Serialize;
#[cfg(target_os = "android")]
use std::sync::Mutex;
use tauri::{
    plugin::{Builder, PluginApi, TauriPlugin},
    AppHandle, Manager, Runtime,
};
#[cfg(target_os = "android")]
use tauri::plugin::PluginHandle;

/// Payload sent to the Kotlin plugin over the mobile plugin channel.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(not(target_os = "android"), allow(dead_code))]
struct KeepAlivePayload<'a> {
    playing: bool,
    title: Option<&'a str>,
    artist: Option<&'a str>,
}

/// Managed handle to the registered android plugin (or `None` when the
/// native side could not be registered, or on non-android platforms).
#[cfg(target_os = "android")]
pub struct KeepAwakeState<R: Runtime>(Mutex<Option<PluginHandle<R>>>);

/// Placeholder placeholder for non-android platforms; the state is never
/// accessed there (`set_keep_alive` returns early on non-android).
#[cfg(not(target_os = "android"))]
pub struct KeepAwakeState;

/// Initializes the keepawake plugin.
///
/// On Android this registers the native `KeepAwakePlugin` Kotlin class during
/// setup. On every other platform the plugin is inert (a no-op).
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("keepawake")
        .setup(|app, api: PluginApi<R, ()>| {
            #[cfg(target_os = "android")]
            {
                match api.register_android_plugin(
                    "com.dxcool.museaudio.keepawake",
                    "KeepAwakePlugin",
                ) {
                    Ok(handle) => {
                        app.manage(KeepAwakeState(Mutex::new(Some(handle))));
                    }
                    Err(e) => {
                        app.manage(KeepAwakeState::<R>(Mutex::new(None)));
                        eprintln!(
                            "[MUSE-AUDIO][keepawake] failed to register android plugin: {e}"
                        );
                    }
                }
            }
            #[cfg(not(target_os = "android"))]
            {
                app.manage(KeepAwakeState);
            }
            Ok(())
        })
        .build()
}

/// Forward the current playback state to the native background-playback
/// helper (foreground media service + partial wake lock on Android).
pub fn set_keep_alive<R: Runtime>(
    app: &AppHandle<R>,
    playing: bool,
    title: Option<&str>,
    artist: Option<&str>,
) -> tauri::Result<()> {
    #[cfg(target_os = "android")]
    {
        let state = app.state::<KeepAwakeState<R>>();
        let handle = state.0.lock().unwrap().clone();
        if let Some(handle) = handle {
            handle.run_mobile_plugin::<()>(
                "setKeepAlive",
                KeepAlivePayload {
                    playing,
                    title,
                    artist,
                },
            )?;
        }
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, playing, title, artist);
    }
    Ok(())
}