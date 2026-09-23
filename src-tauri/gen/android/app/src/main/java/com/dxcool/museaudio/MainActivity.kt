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

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (!hasFocus && PlaybackService.isRunning()) {
      appWebView?.resumeTimers()
    }
  }
}

