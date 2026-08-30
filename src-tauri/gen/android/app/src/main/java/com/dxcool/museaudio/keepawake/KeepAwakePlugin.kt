package com.dxcool.museaudio.keepawake

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin
import app.tauri.plugin.PluginManager

@InvokeArg
class KeepAliveArgs {
  var playing: Boolean = false
  var title: String? = null
  var artist: String? = null
}

@TauriPlugin
class KeepAwakePlugin(private val activity: Activity) : Plugin(activity) {
  @Command
  fun setKeepAlive(invoke: Invoke) {
    val args = invoke.parseArgs(KeepAliveArgs::class.java)
    try {
      if (args.playing) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
          ContextCompat.checkSelfPermission(
            activity,
            Manifest.permission.POST_NOTIFICATIONS
          ) != PackageManager.PERMISSION_GRANTED
        ) {
          PluginManager.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS)) {}
        }
        PlaybackService.start(activity, args.title ?: "MUSE.AUDIO", args.artist ?: "")
      } else {
        PlaybackService.stop(activity)
      }
      invoke.resolve()
    } catch (e: Exception) {
      invoke.reject(e.message ?: "start/stop keepalive failed")
    }
  }
}