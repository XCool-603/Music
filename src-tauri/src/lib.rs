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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("[MUSE-AUDIO] rust run() start");
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![set_keep_alive])
        .plugin(tauri_plugin_keepawake::init());
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