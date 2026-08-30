import React, { useState, useEffect } from 'react';
import { Moon, Clock, X, Check, StopCircle } from 'lucide-react';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  timerMinutes: number | null;
  onSetTimer: (minutes: number | null) => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen,
  onClose,
  timerMinutes,
  onSetTimer,
}) => {
  const [remainingSecs, setRemainingSecs] = useState<number | null>(null);

  useEffect(() => {
    if (timerMinutes === null) {
      setRemainingSecs(null);
      return;
    }
    setRemainingSecs(timerMinutes * 60);

    const interval = setInterval(() => {
      setRemainingSecs((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerMinutes]);

  if (!isOpen) return null;

  const presets = [15, 30, 45, 60, 90];

  const formatRemaining = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}分 ${s.toString().padStart(2, '0')}秒`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">睡眠定时器</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status */}
        {timerMinutes !== null && remainingSecs !== null && remainingSecs > 0 ? (
          <div className="mt-4 p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-center">
            <div className="text-xs text-indigo-300">定时播放中，将在以下时间后停止</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {formatRemaining(remainingSecs)}
            </div>
            <button
              onClick={() => onSetTimer(null)}
              className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-xs font-medium transition"
            >
              <StopCircle className="w-3.5 h-3.5" />
              关闭定时器
            </button>
          </div>
        ) : (
          <p className="text-xs text-neutral-400 mt-3">
            选择倒计时时间，时间到达后音乐将自动平滑渐弱并暂停播放。
          </p>
        )}

        {/* Options */}
        <div className="mt-4 space-y-2">
          {presets.map((mins) => (
            <button
              key={mins}
              onClick={() => {
                onSetTimer(mins);
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-200 text-sm font-medium transition"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-400" />
                {mins} 分钟后
              </span>
              {timerMinutes === mins && <Check className="w-4 h-4 text-indigo-400" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
