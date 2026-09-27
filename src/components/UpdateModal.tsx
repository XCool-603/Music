import React from 'react';
import { ArrowUpCircle, CheckCircle2, Download, ExternalLink, Loader2, Sparkles, X } from 'lucide-react';
import { UpdateInfo, dismissVersion, formatFileSize } from '../utils/updater';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  isChecking?: boolean;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  isChecking = false,
}) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    if (updateInfo?.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_blank');
    }
  };

  const handleIgnore = () => {
    if (updateInfo?.latestVersion) {
      dismissVersion(updateInfo.latestVersion);
    }
    onClose();
  };

  const getPlatformLabel = (platform?: string) => {
    switch (platform) {
      case 'windows': return 'Windows (x64)';
      case 'android': return 'Android';
      case 'harmonyos': return 'HarmonyOS NEXT';
      case 'linux': return 'Linux';
      case 'ios': return 'iOS';
      default: return 'Web / 浏览器';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-lg max-h-[85vh] bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl border ${
              isChecking
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                : updateInfo?.hasUpdate
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
            }`}>
              {isChecking ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : updateInfo?.hasUpdate ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {isChecking
                  ? '检查更新中...'
                  : updateInfo?.hasUpdate
                  ? '发现新版本可用！'
                  : '已是最新版本'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isChecking
                  ? '正在连接 GitHub 获取最新发行版...'
                  : updateInfo?.hasUpdate
                  ? `检测到新版本 v${updateInfo.latestVersion}，建议更新体验最新功能`
                  : `当前版本 v${updateInfo?.currentVersion || '1.0.0'} 已是最新`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-zinc-300 custom-scrollbar">
          {isChecking ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-zinc-400">正在查询 GitHub Releases 最新版本...</p>
            </div>
          ) : updateInfo?.hasUpdate ? (
            <>
              {/* Version Comparison Box */}
              <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-400 block">当前版本</span>
                  <span className="font-mono text-zinc-300 font-medium">v{updateInfo.currentVersion}</span>
                </div>
                <div className="text-emerald-400">
                  <ArrowUpCircle className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-400 block font-semibold">最新版本</span>
                  <span className="font-mono text-emerald-300 font-bold text-base">v{updateInfo.latestVersion}</span>
                </div>
              </div>

              {/* Package Details */}
              <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-400">目标平台：</span>
                  <span className="text-zinc-200">{getPlatformLabel(updateInfo.platform)}</span>
                </div>
                {updateInfo.assetName && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">安装包：</span>
                    <span className="text-indigo-300 truncate max-w-[240px]" title={updateInfo.assetName}>
                      {updateInfo.assetName}
                    </span>
                  </div>
                )}
                {updateInfo.assetSize && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">文件大小：</span>
                    <span className="text-zinc-200">{formatFileSize(updateInfo.assetSize)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">发布时间：</span>
                  <span className="text-zinc-300">{new Date(updateInfo.publishedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Changelog */}
              <div>
                <h3 className="font-semibold text-white mb-2 text-xs uppercase tracking-wider text-zinc-400">
                  更新日志 (Release Notes)
                </h3>
                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 max-h-48 overflow-y-auto text-xs font-mono leading-relaxed whitespace-pre-wrap text-zinc-300 custom-scrollbar">
                  {updateInfo.releaseNotes || '暂无详细更新日志'}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">您正在使用最新版本</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  当前版本 v{updateInfo?.currentVersion || '1.0.0'} 已包含所有最新的稳定性改进与音效增强。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-3">
          {updateInfo?.hasUpdate ? (
            <>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleIgnore}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg transition"
                >
                  忽略此版本
                </button>
                <a
                  href={updateInfo.releaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs text-zinc-400 hover:text-indigo-400 rounded-lg transition"
                >
                  <span>Releases</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                >
                  稍后提醒
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-600/30 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>立即下载更新</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full space-x-3">
              {updateInfo?.releaseUrl && (
                <a
                  href={updateInfo.releaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 px-4 py-2 text-xs text-zinc-400 hover:text-indigo-400 rounded-lg transition"
                >
                  <span>查看 GitHub Releases</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              )}
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
              >
                确定
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
