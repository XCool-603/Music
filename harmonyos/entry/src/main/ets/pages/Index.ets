import { webview } from '@kit.ArkWeb';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { window } from '@kit.ArkUI';

const DOMAIN: number = 0x0000;
const TAG: string = 'MuseAudio';

type ErrorReceiveEvent = {
  request: {
    getErrorInfo(): string;
  };
  error: {
    getErrorInfo(): string;
    getErrorCode(): number;
  };
};
type ConsoleEvent = {
  message: {
    getMessage(): string;
  };
};
type ProgressChangeEvent = {
  newProgress: number;
};

@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController();

  aboutToAppear(): void {
    // 播放时保持屏幕常亮（对应 keepawake 逻辑）
    try {
      window.getLastWindow((err: BusinessError, win: window.Window) => {
        if (err) {
          hilog.error(DOMAIN, TAG, 'getLastWindow failed: %{public}s', JSON.stringify(err));
          return;
        }
        win.setWindowKeepScreenOn(true);
      });
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'keep screen on not supported, skip');
    }
  }

  onPageHide(): void {
    try {
      window.getLastWindow((err: BusinessError, win: window.Window) => {
        if (err) {
          return;
        }
        win.setWindowKeepScreenOn(false);
      });
    } catch (e) {
      // ignore
    }
  }

  build() {
    Column() {
      Web({ src: $rawfile('www/index.html'), controller: this.controller })
        .width('100%')
        .height('100%')
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .fileAccess(true)
        .onlineImageAccess(true)
        .mediaAccess(true)
        .onErrorReceive((event: ErrorReceiveEvent) => {
          hilog.error(DOMAIN, TAG, 'Web onErrorReceive: %{public}s',
            event.error && event.error.getErrorInfo ? event.error.getErrorInfo() : JSON.stringify(event));
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
