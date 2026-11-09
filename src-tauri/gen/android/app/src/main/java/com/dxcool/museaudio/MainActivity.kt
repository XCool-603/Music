package com.dxcool.museaudio

import android.os.Bundle
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import com.dxcool.museaudio.keepawake.PlaybackService

class MainActivity : TauriActivity() {
  private var appWebView: WebView? = null

  companion object {
    private var instance: MainActivity? = null

    fun sendMediaAction(action: String) {
      instance?.let { act ->
        act.runOnUiThread {
          act.appWebView?.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('nativeMediaAction', { detail: '$action' }));",
            null
          )
        }
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    instance = this
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onDestroy() {
    if (instance === this) {
      instance = null
    }
    super.onDestroy()
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    appWebView = webView
    // Ensure HTML5 / WebAudio does not require repeated user gesture
    webView.settings.mediaPlaybackRequiresUserGesture = false

    // Native DownloadListener so in-app / webview download requests are handed to Android DownloadManager
    webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, contentLength ->
      try {
        val request = android.app.DownloadManager.Request(android.net.Uri.parse(url))
        val filename = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimetype)
        request.setTitle(filename)
        request.setDescription("正在下载音乐文件...")
        request.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        request.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, filename)
        val dm = getSystemService(android.content.Context.DOWNLOAD_SERVICE) as android.app.DownloadManager
        dm.enqueue(request)
      } catch (e: Exception) {
        e.printStackTrace()
      }
    }
  }

  override fun onPause() {
    super.onPause()
    // CRITICAL: WryActivity.onPause() calls mWebView.onPause(), which halts
    // HTML5 audio playback and pauses WebAudio contexts and JavaScript timers.
    // When playback is running, immediately resume the WebView so music
    // continues uninterrupted when the screen turns off or the app is minimized.
    if (PlaybackService.isRunning()) {
      appWebView?.onResume()
      appWebView?.resumeTimers()
    }
  }

  override fun onStop() {
    super.onStop()
    // When the screen locks or activity is stopped while music is playing,
    // resume WebView and timers so network requests and audio continue!
    if (PlaybackService.isRunning()) {
      appWebView?.onResume()
      appWebView?.resumeTimers()
    }
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (!hasFocus && PlaybackService.isRunning()) {
      appWebView?.resumeTimers()
    }
  }
}
