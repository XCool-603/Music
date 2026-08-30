package com.dxcool.museaudio.keepawake

import android.media.AudioManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

class PlaybackService : Service() {
  private var audioManager: AudioManager? = null

  companion object {
    private const val CHANNEL_ID = "muse_playback"
    private const val CHANNEL_NAME = "后台播放"
    private const val NOTIFICATION_ID = 1001
    private var wakeLock: PowerManager.WakeLock? = null
    private var running = false

    fun isRunning(): Boolean = running

    fun start(context: Context, title: String, artist: String) {
      val intent = Intent(context, PlaybackService::class.java)
        .putExtra("title", title)
        .putExtra("artist", artist)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, PlaybackService::class.java))
    }
  }

  override fun onCreate() {
    super.onCreate()
    running = true
    audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    acquireWakeLock()
    requestAudioFocus()
  }

  override fun onDestroy() {
    running = false
    releaseWakeLock()
    abandonAudioFocus()
    super.onDestroy()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val title = intent?.getStringExtra("title") ?: "MUSE.AUDIO"
    val artist = intent?.getStringExtra("artist") ?: ""
    showNotification(title, artist)
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun showNotification(title: String, artist: String) {
    ensureChannel()
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle(title)
      .setContentText(artist)
      .setOngoing(true)
      .setShowWhen(false)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
    } else {
      0
    }
    ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type)
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_LOW)
      channel.setShowBadge(false)
      channel.setSound(null, null)
      nm.createNotificationChannel(channel)
    }
  }

  private fun acquireWakeLock() {
    try {
      val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
      @Suppress("DEPRECATION")
      val lock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "muse-audio:playback")
      lock.setReferenceCounted(false)
      lock.acquire()
      wakeLock = lock
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  private fun releaseWakeLock() {
    try {
      wakeLock?.let { if (it.isHeld) it.release() }
    } catch (e: Exception) {
      // ignore
    }
    wakeLock = null
  }

  private fun requestAudioFocus() {
    val am = audioManager ?: return
    try {
      @Suppress("DEPRECATION")
      val result = am.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN)
      println("[MUSE-AUDIO][keepawake] audio focus request result: $result")
    } catch (e: Exception) {
      // ignore
    }
  }

  private fun abandonAudioFocus() {
    try {
      @Suppress("DEPRECATION")
      audioManager?.abandonAudioFocus(null)
    } catch (e: Exception) {
      // ignore
    }
  }
}