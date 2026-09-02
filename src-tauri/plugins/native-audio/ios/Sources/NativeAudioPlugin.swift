// Copyright 2019-2024 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

import AVFoundation
import Foundation
import MediaPlayer
import Tauri
import UIKit

/// Native playback engine for MUSE.AUDIO (iOS).
///
/// Plays the stream with a native `AVPlayer` so audio reliably keeps playing
/// while the screen is off or the app is backgrounded (WKWebView HTML5 audio is
/// unreliable for this). It owns `AVAudioSession` (`.playback`), keeps the
/// lock-screen / Control Center `MPNowPlayingInfoCenter` in sync, and answers
/// `MPRemoteCommandCenter` controls. Progress ticks and the "track ended"
/// signal are streamed back to the frontend over a Tauri `Channel`.
public class NativeAudioPlugin: Plugin {

  private let player = AVPlayer()
  private var sink: Channel?
  private var timeObserver: Any?
  private var endObserver: NSObjectProtocol?
  private var errorObserver: NSObjectProtocol?
  private var isPlaying = false
  private var playbackRate: Float = 1.0
  private var shouldResumeAfterInterruption = false

  // Cached Now Playing metadata (refreshed by the frontend on title changes).
  private var infoTitle: String?
  private var infoArtist: String?
  private var infoAlbum: String?
  private var infoDuration: Double = 0

  // MARK: - Setup

  public override init() {
    super.init()
    observeInterruptions()
    setupRemoteCommands()
    errorObserver = NotificationCenter.default.addObserver(
      forName: AVPlayerItem.newErrorLogEntryNotification, object: nil, queue: .main
    ) { [weak self] _ in
      self?.sendEvent(type: "error", playing: false, position: nil, duration: 0)
    }

    timeObserver = player.addPeriodicTimeObserver(
      forInterval: CMTime(seconds: 1, preferredTimescale: 1),
      queue: .main
    ) { [weak self] time in
      guard let self = self else { return }
      guard self.isPlaying else { return }
      let position = time.seconds.isFinite ? time.seconds : 0
      self.sendEvent(
        type: "tick", playing: true, position: position,
        duration: self.currentDuration()
      )
    }
  }

  deinit {
    if let timeObserver = timeObserver {
      player.removeTimeObserver(timeObserver)
    }
    if let endObserver = endObserver {
      NotificationCenter.default.removeObserver(endObserver)
    }
    if let errorObserver = errorObserver {
      NotificationCenter.default.removeObserver(errorObserver)
    }
  }

  // MARK: - JS -> Native commands

  /// Refresh the lock-screen Now Playing metadata. Kept for backwards
  /// compatibility with the frontend metadata sync effect; activating / releasing
  /// the audio session is now owned by the play()/pause() commands.
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
      updateNowPlaying(
        title: args.title,
        artist: args.artist,
        album: args.album,
        duration: args.duration > 0 ? args.duration : -1,
        position: args.position
      )
      invoke.resolve()
    } catch {
      invoke.reject("setPlaybackState failed: \(error.localizedDescription)")
    }
  }

  /// Load a new source (track URL) into AVPlayer. Metadata from the frontend is
  /// applied immediately so the lock screen reflects the new track right away.
  @objc public func setSource(_ invoke: Invoke) {
    struct Args: Decodable {
      let url: String
      let title: String?
      let artist: String?
      let album: String?
      let duration: Double
      let position: Double?
    }

    do {
      let args = try invoke.parseArgs(Args.self)
      guard let url = URL(string: args.url) else {
        invoke.reject("Invalid audio URL")
        return
      }

      let item = AVPlayerItem(url: url)
      registerEndObserver(for: item)
      player.replaceCurrentItem(with: item)

      if let start = args.position, start > 0 {
        player.seek(to: CMTime(seconds: start, preferredTimescale: 600))
      }
      self.playbackRate = 1.0
      self.isPlaying = false

      updateNowPlaying(
        title: args.title,
        artist: args.artist,
        album: args.album,
        duration: args.duration,
        position: args.position ?? 0
      )
      activateSession()
      invoke.resolve()
    } catch {
      invoke.reject("setSource failed: \(error.localizedDescription)")
    }
  }

  /// Start playback. Activates the `.playback` audio session and keeps the
  /// WKWebView process alive so channel events keep flowing while backgrounded.
  @objc public func play(_ invoke: Invoke) {
    guard player.currentItem != nil else {
      invoke.reject("No source loaded")
      return
    }
    activateSession()
    player.play()
    player.rate = playbackRate
    isPlaying = true
    updateNowPlaying(position: player.currentTime().seconds)
    invoke.resolve()
  }

  /// Pause playback and release the audio session (so other apps can resume).
  @objc public func pause(_ invoke: Invoke) {
    pauseNativePlayback()
    invoke.resolve()
  }

  /// Seek to a new position (seconds).
  @objc public func seek(_ invoke: Invoke) {
    struct Args: Decodable {
      let position: Double
    }

    do {
      let args = try invoke.parseArgs(Args.self)
      guard args.position.isFinite else {
        invoke.reject("Invalid position")
        return
      }
      let position = max(0, args.position)
      player.seek(to: CMTime(seconds: position, preferredTimescale: 600))
      updateNowPlaying(position: position)
      sendEvent(
        type: "state", playing: isPlaying, position: position,
        duration: currentDuration()
      )
      invoke.resolve()
    } catch {
      invoke.reject("seek failed: \(error.localizedDescription)")
    }
  }

  /// Change the playback speed (0.5x - 2.0x).
  @objc public func setRate(_ invoke: Invoke) {
    struct Args: Decodable {
      let rate: Double
    }

    do {
      let args = try invoke.parseArgs(Args.self)
      self.playbackRate = Float(max(0.5, min(2.0, args.rate)))
      if isPlaying {
        player.rate = self.playbackRate
      }
      updateNowPlaying(position: player.currentTime().seconds)
      invoke.resolve()
    } catch {
      invoke.reject("setRate failed: \(error.localizedDescription)")
    }
  }

  /// Register the back-channel used to push position ticks, "track ended" and
  /// lock-screen remote commands into the frontend. The channel must be created
  /// once on the JS side and forwarded through the invoke payload.
  @objc public func registerSink(_ invoke: Invoke) {
    struct Args: Decodable {
      let channel: Channel
    }

    do {
      let args = try invoke.parseArgs(Args.self)
      self.sink = args.channel
      invoke.resolve()
    } catch {
      invoke.reject("registerSink failed: \(error.localizedDescription)")
    }
  }

  // MARK: - Playback plumbing

  private func activateSession() {
    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(.playback, mode: .default)
      try session.setActive(true)
    } catch {
      print("[MUSE-AUDIO][native-audio] failed to activate audio session: \(error)")
    }
  }

  private func deactivateSession() {
    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(.playback, mode: .default)
      try session.setActive(false, options: [.notifyOthersOnDeactivation])
    } catch {
      print("[MUSE-AUDIO][native-audio] failed to deactivate audio session: \(error)")
    }
  }

  private func pauseNativePlayback() {
    player.pause()
    isPlaying = false
    deactivateSession()
    updateNowPlaying(position: player.currentTime().seconds)
    sendEvent(
      type: "state", playing: false, position: player.currentTime().seconds,
      duration: currentDuration()
    )
  }

  private func currentDuration() -> Double {
    guard let item = player.currentItem else { return infoDuration }
    let duration = item.duration.seconds
    return (duration.isFinite && duration > 0) ? duration : infoDuration
  }

  private func registerEndObserver(for item: AVPlayerItem) {
    if let endObserver = endObserver {
      NotificationCenter.default.removeObserver(endObserver)
    }
    endObserver = NotificationCenter.default.addObserver(
      forName: AVPlayerItem.didPlayToEndTimeNotification, object: item, queue: .main
    ) { [weak self] _ in
      self?.handlePlaybackEnded()
    }
  }

  private func handlePlaybackEnded() {
    isPlaying = false
    let position = currentDuration()
    updateNowPlaying(position: position)
    deactivateSession()
    sendEvent(type: "ended", playing: false, position: position, duration: position)
  }

  // MARK: - Now Playing / Control Center

  private func updateNowPlaying(
    title: String? = nil, artist: String? = nil, album: String? = nil,
    duration: Double = -1, position: Double? = nil
  ) {
    if let title = title { infoTitle = title }
    if let artist = artist { infoArtist = artist }
    if let album = album { infoAlbum = album }
    if duration >= 0 { infoDuration = duration }

    var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [String: Any]()
    if let t = infoTitle { info[MPMediaItemPropertyTitle] = t }
    if let a = infoArtist { info[MPMediaItemPropertyArtist] = a }
    if let al = infoAlbum { info[MPMediaItemPropertyAlbumTitle] = al }
    let d = currentDuration()
    if d > 0 { info[MPMediaItemPropertyPlaybackDuration] = d }
    if let p = position, p.isFinite {
      info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = p
    } else {
      let cur = player.currentTime().seconds
      if cur.isFinite { info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = cur }
    }
    info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? playbackRate : 0
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
  }

  private func setupRemoteCommands() {
    let commands = MPRemoteCommandCenter.shared()

    commands.playCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      guard self.player.currentItem != nil else { return .commandFailed }
      self.activateSession()
      self.player.play()
      self.player.rate = self.playbackRate
      self.isPlaying = true
      self.updateNowPlaying(position: self.player.currentTime().seconds)
      self.sendEvent(
        type: "state", playing: true, position: self.player.currentTime().seconds,
        duration: self.currentDuration()
      )
      return .success
    }

    commands.pauseCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      self.pauseNativePlayback()
      return .success
    }

    commands.togglePlayPauseCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      if self.isPlaying {
        self.pauseNativePlayback()
      } else {
        self.player.play()
        self.player.rate = self.playbackRate
        self.isPlaying = true
        self.activateSession()
        self.updateNowPlaying(position: self.player.currentTime().seconds)
      }
      return .success
    }

    commands.nextTrackCommand.addTarget { [weak self] _ in
      self?.sendEvent(type: "remote", playing: false, position: nil, duration: 0, command: "next")
      return .success
    }

    commands.previousTrackCommand.addTarget { [weak self] _ in
      self?.sendEvent(type: "remote", playing: false, position: nil, duration: 0, command: "prev")
      return .success
    }

    commands.changePlaybackPositionCommand.addTarget { [weak self] event in
      guard let self = self,
        let e = event as? MPChangePlaybackPositionCommandEvent
      else { return .commandFailed }
      let position = max(0, e.positionTime)
      self.player.seek(to: CMTime(seconds: position, preferredTimescale: 600))
      self.updateNowPlaying(position: position)
      self.sendEvent(
        type: "state", playing: self.isPlaying, position: position,
        duration: self.currentDuration()
      )
      return .success
    }
  }

  // MARK: - Interruptions

  private func observeInterruptions() {
    NotificationCenter.default.addObserver(
      forName: AVAudioSession.interruptionNotification, object: nil, queue: .main
    ) { [weak self] note in
      guard let self = self,
        let userInfo = note.userInfo,
        let raw = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
        let type = AVAudioSession.InterruptionType(rawValue: raw)
      else { return }

      switch type {
      case .began:
        self.shouldResumeAfterInterruption = self.isPlaying
        self.player.pause()
        self.isPlaying = false
        self.updateNowPlaying(position: self.player.currentTime().seconds)
        self.sendEvent(
          type: "state", playing: false, position: self.player.currentTime().seconds,
          duration: self.currentDuration()
        )
      case .ended:
        let shouldResume =
          userInfo[AVAudioSessionInterruptionOptionKey] as? UInt
          == AVAudioSession.InterruptionOptions.shouldResume.rawValue
        if shouldResume && self.shouldResumeAfterInterruption {
          self.activateSession()
          self.player.play()
          self.player.rate = self.playbackRate
          self.isPlaying = true
          self.updateNowPlaying(position: self.player.currentTime().seconds)
        }
      @unknown default:
        break
      }
    }
  }

  // MARK: - Events back to the frontend

  private struct NativeEvent: Encodable {
    let type: String
    let playing: Bool
    let position: Double
    let duration: Double
    let command: String?
    let value: Double?
  }

  private func sendEvent(
    type: String, playing: Bool, position: Double?, duration: Double,
    command: String? = nil, value: Double? = nil
  ) {
    guard let sink = sink else { return }
    let event = NativeEvent(
      type: type, playing: playing,
      position: position ?? player.currentTime().seconds,
      duration: duration, command: command, value: value
    )
    try? sink.send(event)
  }
}

/// Tauri iOS plugin entry point. Tauri's `register_ios_plugin` receives the
/// raw pointer from this function and stores the instance in PluginManager.
@_cdecl("init_plugin_native_audio")
public func initNativeAudioPlugin() -> UnsafeMutableRawPointer {
  return Unmanaged.passRetained(NativeAudioPlugin()).toOpaque()
}