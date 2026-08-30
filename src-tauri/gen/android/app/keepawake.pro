# PlaybackService is created by startForegroundService (manifest referenced -> kept automatically).
# KeepAwakePlugin is instantiated reflectively by tauri's mobile plugin loader (getAppClass) and its
# @Command methods are invoked via reflection, so R8 must not shrink/rename it.
-keep class com.dxcool.museaudio.keepawake.** { *; }