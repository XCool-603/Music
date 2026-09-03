import React, { useState, useEffect } from 'react';
import { DownloadTask, subscribeDownloadTasks, clearCompletedTasks } from '../utils/downloadManager';
import {
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Music,
  FileText,
  Image,
  Package,
} from 'lucide-react';

export const DownloadToastNotification: React.FC = () => {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeDownloadTasks((updatedTasks) => {
      setTasks(updatedTasks);
    });
    return unsubscribe;
  }, []);

  if (tasks.length === 0) return null;

  const activeTask = tasks.find((t) => t.status === 'downloading');
  const recentErrors = tasks.filter((t) => t.status === 'error');

  const latestTask = tasks[0];

  return (
    <div className="fixed bottom-24 right-4 z-50 max-w-sm w-full animate-in slide-in-from-bottom-3 duration-300 pointer-events-auto">
      <div className="bg-neutral-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-3.5 text-slate-100 ring-1 ring-black/50">
        {/* Header summary */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                activeTask
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : recentErrors.length > 0
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {activeTask ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>
                  {activeTask
                    ? '正在下载音乐资源...'
                    : recentErrors.length > 0
                    ? '下载任务已结束'
                    : '下载完成'}
                </span>
                {tasks.length > 1 && (
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.2 rounded-full text-slate-300 font-mono">
                    {tasks.length} 项
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={clearCompletedTasks}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-xs transition"
              title="清除已完成记录"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Latest Active Task Progress / Details */}
        {latestTask && (
          <div className="space-y-1.5 bg-white/5 rounded-xl p-2.5 border border-white/5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                {latestTask.type === 'audio' && <Music className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                {latestTask.type === 'lrc' && <FileText className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                {latestTask.type === 'cover' && <Image className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                {latestTask.type === 'bundle' && <Package className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                <span className="font-medium text-white truncate">{latestTask.title}</span>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 font-mono text-[11px]">
                {latestTask.status === 'downloading' && (
                  <span className="text-emerald-400 font-bold">{latestTask.progress}%</span>
                )}
                {latestTask.status === 'completed' && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 已保存
                  </span>
                )}
                {latestTask.status === 'error' && (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> 失败
                  </span>
                )}
              </div>
            </div>

            {latestTask.status === 'downloading' && (
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-500 transition-all duration-200 rounded-full"
                  style={{ width: `${latestTask.progress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
