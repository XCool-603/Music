import { webview } from '@kit.ArkWeb';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { BusinessError } from '@kit.BasicServicesKit';

const DOMAIN: number = 0x0000;
const TAG: string = 'MuseAudio';

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
        .onErrorReceive((event) => {
          hilog.error(DOMAIN, TAG, 'Web onErrorReceive: %{public}s',
            JSON.stringify(event?.request?.getErrorInfo ? event.request.getErrorInfo() : event));
        })
        .onConsole((event) => {
          if (event && event.message) {
            hilog.info(DOMAIN, TAG, 'console: %{public}s', event.message.getMessage());
          }
        })
        .onProgressChange((event) => {
          // 可在此加加载进度动画
        })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#000000')
  }
}
