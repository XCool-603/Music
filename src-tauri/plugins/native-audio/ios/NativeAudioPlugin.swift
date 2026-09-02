import AVFoundation
import Foundation
import MediaPlayer
import Tauri
import UIKit

/// Native audio session helper for MUSE.AUDIO (iOS).
///
/// Integrated as a Tauri mobile plugin. It keeps `AVAudioSession` configured as
/// `.playback` and drives `MPNowPlayingInfoCenter` so the WKWebView HTML5 audio
/// keeps playing with the screen off, and the user gets lock-screen controls.
///
/// IMPORTANT (Mac integration):
///   After `tauri ios init` on a Mac, place this file at
///   `src-tauri/gen/apple/<Project>/<Project>/Plugins/NativeAudioPlugin.swift`
///   and add it to the app target. The Rust plugin registers it via
///   `tauri::ios_plugin_binding!(init_plugin_native_audio)`, which resolves to
///   the `init_plugin_native_audio` symbol exposed below with `@_cdecl`.
public class NativeAudioPlugin: Plugin {

  public override init() {
    super.init()
  }

  /// Called with the Rust payload `{ playing, title, artist, album, duration,
  /// position, streamUrl }`. Keeps the audio session alive while playing and
  /// updates Now Playing metadata for the lock screen / Control Center.
  @objc public func setPlaybackState(_ invoke: Invoke) {
    struct Args: Decodable {
      let playing: Bool
      let title: String?
      let artist: String?
      let album: String?
      let duration: Double
      let position: Double
      let streamUrl: String?
    }

    do {
      let args = try invoke.parseArgs(Args.self)
      let session = AVAudioSession.sharedInstance()

      if args.playing {
        try session.setCategory(.playback, mode: .default)
        try session.setActive(true)
      } else {
        try session.setCategory(.playback, mode: .default)
        try session.setActive(false, options: [.notifyOthersOnDeactivation])
      }

      if args.playing {
        var info = [String: Any]()
        if let title = args.title {
          info[MPMediaItemPropertyTitle] = title
        }
        if let artist = args.artist {
          info[MPMediaItemPropertyArtist] = artist
        }
        if let album = args.album {
          info[MPMediaItemPropertyAlbumTitle] = album
        }
        if args.duration > 0 {
          info[MPMediaItemPropertyPlaybackDuration] = args.duration
        }
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = args.position
        info[MPNowPlayingInfoPropertyPlaybackRate] = 1.0
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
      } else {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
      }

      invoke.resolve()
    } catch {
      invoke.reject("Failed to set audio session: \(error.localizedDescription)")
    }
  }
}

/// Tauri iOS plugin entry point. Tauri's `register_ios_plugin` receives the
/// raw pointer from this function and stores the instance in PluginManager.
@_cdecl("init_plugin_native_audio")
public func initNativeAudioPlugin() -> UnsafeMutableRawPointer {
  return Unmanaged.passRetained(NativeAudioPlugin()).toOpaque()
}