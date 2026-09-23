import { webview } from '@kit.ArkWeb';
import { hilog } from '@kit.PerformanceAnalysisKit';

const DOMAIN: number = 0x0000;
const TAG: string = 'MuseAudio';

interface ErrorReceiveEvent {
  request: WebResourceRequest;
  error: WebResourceError;
}
interface ConsoleEvent {
  message: ConsoleMessage;
}
interface ProgressChangeEvent {
  newProgress: number;
}

@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController();

  build() {
    Column() {
      Web({ src: $rawfile('www/index.html'), controller: this.controller })
        .width('100%')
        .height('100%')
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .fileAccess(true)
        .onlineImageAccess(true)
        .mediaPlayGestureAccess(false)
        .audioSilent(false)
        .onErrorReceive((event: ErrorReceiveEvent) => {
          hilog.error(DOMAIN, TAG, 'Web onErrorReceive: %{public}s',
            event.error ? event.error.getErrorInfo() : JSON.stringify(event));
        })
        .onConsole((event: ConsoleEvent) => {
          if (event && event.message) {
            hilog.info(DOMAIN, TAG, 'console: %{public}s', event.message.getMessage());
          }
          return false;
        })
        .onProgressChange((event: ProgressChangeEvent) => {
          // 可在此加加载进度动画
        })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#000000')
  }
}
