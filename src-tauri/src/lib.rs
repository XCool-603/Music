#[cfg(mobile)]
mod webserver;

#[tauri::command]
fn set_keep_alive(
    app: tauri::AppHandle,
    playing: bool,
    title: Option<String>,
    artist: Option<String>,
) -> Result<(), String> {
    tauri_plugin_keepawake::set_keep_alive(&app, playing, title.as_deref(), artist.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_playback_state(
    app: tauri::AppHandle,
    playing: bool,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    duration: f64,
    position: f64,
    stream_url: Option<String>,
) -> Result<(), String> {
    tauri_plugin_native_audio::set_playback_state(
        &app,
        playing,
        title.as_deref(),
        artist.as_deref(),
        album.as_deref(),
        duration,
        position,
        stream_url.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn native_playback_available(app: tauri::AppHandle) -> bool {
    tauri_plugin_native_audio::native_playback_available(&app)
}

#[tauri::command]
fn native_set_source(
    app: tauri::AppHandle,
    url: String,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    duration: f64,
    position: f64,
) -> Result<(), String> {
    tauri_plugin_native_audio::native_set_source(
        &app,
        &url,
        title.as_deref(),
        artist.as_deref(),
        album.as_deref(),
        duration,
        position,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn native_play(app: tauri::AppHandle) -> Result<(), String> {
    tauri_plugin_native_audio::native_play(&app).map_err(|e| e.to_string())
}

#[tauri::command]
fn native_pause(app: tauri::AppHandle) -> Result<(), String> {
    tauri_plugin_native_audio::native_pause(&app).map_err(|e| e.to_string())
}

#[tauri::command]
fn native_seek(app: tauri::AppHandle, position: f64) -> Result<(), String> {
    tauri_plugin_native_audio::native_seek(&app, position).map_err(|e| e.to_string())
}

#[tauri::command]
fn native_set_rate(app: tauri::AppHandle, rate: f64) -> Result<(), String> {
    tauri_plugin_native_audio::native_set_rate(&app, rate).map_err(|e| e.to_string())
}

#[tauri::command]
fn native_register_sink(
    app: tauri::AppHandle,
    channel: tauri::ipc::Channel<serde_json::Value>,
) -> Result<(), String> {
    tauri_plugin_native_audio::native_register_sink(&app, channel).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("[MUSE-AUDIO] rust run() start");
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            set_keep_alive,
            set_playback_state,
            native_playback_available,
            native_set_source,
            native_play,
            native_pause,
            native_seek,
            native_set_rate,
            native_register_sink
        ])
        .plugin(tauri_plugin_keepawake::init())
        .plugin(tauri_plugin_native_audio::init());
    #[cfg(mobile)]
    {
        builder = builder.setup(|app| {
            use tauri::Manager;
            println!("[MUSE-AUDIO] setup ok");
            let port = webserver::start();
            if let Some(win) = app.get_webview_window("main") {
                let url =
                    tauri::Url::parse(&format!("http://127.0.0.1:{port}/index.html?diag=1"))
                        .expect("invalid local web server url");
                println!("[MUSE-AUDIO] loading {url}");
                let _ = win.navigate(url);
            }
            Ok(())
        });
    }
    builder
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}