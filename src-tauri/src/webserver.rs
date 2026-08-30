use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};

const INDEX_HTML: &[u8] = include_str!("../embedded/index.html").as_bytes();
const APP_JS: &[u8] = include_str!("../embedded/js/app.js").as_bytes();
const APP_CSS: &[u8] = include_str!("../embedded/js/app.css").as_bytes();
const MANIFEST: &[u8] = include_str!("../embedded/manifest.json").as_bytes();
const SW_JS: &[u8] = include_str!("../embedded/sw.js").as_bytes();
const ICON_SVG: &[u8] = include_str!("../embedded/icons/icon.svg").as_bytes();

fn serve_route(path: &str) -> Option<(&'static [u8], &'static str)> {
    match path {
        "/index.html" => Some((INDEX_HTML, "text/html; charset=utf-8")),
        "/" => Some((INDEX_HTML, "text/html; charset=utf-8")),
        "/js/app.js" => Some((APP_JS, "text/javascript; charset=utf-8")),
        "/js/app.css" => Some((APP_CSS, "text/css; charset=utf-8")),
        "/manifest.json" => Some((MANIFEST, "application/manifest+json; charset=utf-8")),
        "/sw.js" => Some((SW_JS, "text/javascript; charset=utf-8")),
        "/icons/icon.svg" => Some((ICON_SVG, "image/svg+xml")),
        _ => None,
    }
}

fn respond(stream: &mut TcpStream, status: &str, content_type: &str, body: &[u8], head_only: bool) {
    let headers = format!(
        "HTTP/1.1 {status}\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-store\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    );
    let _ = stream.write_all(headers.as_bytes());
    if !head_only {
        let _ = stream.write_all(body);
    }
    let _ = stream.flush();
}

fn handle(mut stream: TcpStream) {
    let mut reader = BufReader::new(stream.try_clone().unwrap_or_else(|_| {
        TcpStream::connect("127.0.0.1:1").unwrap_or_else(|_| panic!("stream clone failed"))
    }));
    let mut request_line = String::new();
    if reader.read_line(&mut request_line).is_err() {
        return;
    }
    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or("");
    let target = parts.next().unwrap_or("/");
    let mut line = String::new();
    loop {
        if reader.read_line(&mut line).is_err() {
            break;
        }
        if line.trim().is_empty() {
            break;
        }
        line.clear();
    }

    let path = target.split('?').next().unwrap_or("/");
    if method != "GET" && method != "HEAD" {
        respond(
            &mut stream,
            "405 Method Not Allowed",
            "text/plain; charset=utf-8",
            b"method not allowed",
            false,
        );
        return;
    }
    match serve_route(path) {
        Some((body, ct)) => respond(&mut stream, "200 OK", ct, body, method == "HEAD"),
        None => respond(
            &mut stream,
            "404 Not Found",
            "text/plain; charset=utf-8",
            b"not found",
            method == "HEAD",
        ),
    }
}

/// Starts a local HTTP server that serves the embedded PWA assets and
/// returns the bound port. The accept loop runs on a background thread.
pub fn start() -> u16 {
    let listener = TcpListener::bind("0.0.0.0:0").expect("[MUSE-AUDIO] webserver bind failed");
    let port = listener
        .local_addr()
        .expect("[MUSE-AUDIO] webserver local_addr failed")
        .port();
    println!("[MUSE-AUDIO] embedded http server listening on 127.0.0.1:{port}");
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            if let Ok(s) = stream {
                std::thread::spawn(|| handle(s));
            }
        }
    });
    port
}