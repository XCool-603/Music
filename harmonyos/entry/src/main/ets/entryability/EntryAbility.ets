import { AbilityConstant, UIAbility, Want, wantAgent, WantAgent } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { window } from '@kit.ArkUI';
import { BusinessError } from '@kit.BasicServicesKit';
import { backgroundTaskManager } from '@kit.BackgroundTasksKit';

const DOMAIN: number = 0x0000;
const TAG: string = 'MuseAudio';

export default class EntryAbility extends UIAbility {
  private isBackgroundTaskRunning: boolean = false;

  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(DOMAIN, TAG, 'Ability onCreate');
  }

  onDestroy(): void {
    this.stopContinuousTask();
    hilog.info(DOMAIN, TAG, 'Ability onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    hilog.info(DOMAIN, TAG, 'Ability onWindowStageCreate');
    windowStage.loadContent('pages/Index', (err: BusinessError) => {
      if (err.code) {
        hilog.error(DOMAIN, TAG, 'Failed to load content: %{public}s', JSON.stringify(err));
        return;
      }
      hilog.info(DOMAIN, TAG, 'Content loaded');
    });
  }

  onWindowStageDestroy(): void {
    hilog.info(DOMAIN, TAG, 'Ability onWindowStageDestroy');
  }

  onForeground(): void {
    hilog.info(DOMAIN, TAG, 'Ability onForeground');
  }

  onBackground(): void {
    hilog.info(DOMAIN, TAG, 'Ability onBackground - requesting continuous task');
    this.startContinuousTask();
  }

  private startContinuousTask(): void {
    if (this.isBackgroundTaskRunning) return;
    try {
      let wantAgentInfo: wantAgent.WantAgentInfo = {
        wants: [
          {
            bundleName: this.context.abilityInfo.bundleName,
            abilityName: this.context.abilityInfo.name
          }
        ],
        actionType: wantAgent.OperationType.START_ABILITY,
        requestCode: 0,
        actionFlags: [wantAgent.WantAgentFlags.UPDATE_PRESENT_FLAG]
      };

      wantAgent.getWantAgent(wantAgentInfo).then((agent: WantAgent) => {
        backgroundTaskManager.startBackgroundRunningTask(
          this.context,
          backgroundTaskManager.BackgroundMode.AUDIO_PLAYBACK,
          agent
        ).then(() => {
          this.isBackgroundTaskRunning = true;
          hilog.info(DOMAIN, TAG, 'Continuous background audio task started successfully');
        }).catch((err: BusinessError) => {
          hilog.error(DOMAIN, TAG, 'Failed to start continuous task: %{public}s', JSON.stringify(err));
        });
      }).catch((err: BusinessError) => {
        hilog.error(DOMAIN, TAG, 'Failed to get wantAgent: %{public}s', JSON.stringify(err));
      });
    } catch (e) {
      hilog.error(DOMAIN, TAG, 'startContinuousTask exception: %{public}s', JSON.stringify(e));
    }
  }

  private stopContinuousTask(): void {
    if (!this.isBackgroundTaskRunning) return;
    try {
      backgroundTaskManager.stopBackgroundRunningTask(this.context).then(() => {
        this.isBackgroundTaskRunning = false;
        hilog.info(DOMAIN, TAG, 'Continuous background task stopped');
      }).catch((err: BusinessError) => {
        hilog.error(DOMAIN, TAG, 'Failed to stop continuous task: %{public}s', JSON.stringify(err));
      });
    } catch (e) {
      hilog.error(DOMAIN, TAG, 'stopContinuousTask exception: %{public}s', JSON.stringify(e));
    }
  }
}

