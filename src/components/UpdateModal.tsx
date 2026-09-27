import React, { useState } from 'react';
import {
  ArrowUpCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Monitor,
  RefreshCw,
  Smartphone,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import {
  UpdateInfo,
  dismissVersion,
  formatFileSize,
  downloadAssetFile,
  executeServerUpdate,
  clearWebCacheAndReload,
} from '../utils/updater';

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
  const [isUpdatingWeb, setIsUpdatingWeb] = useState(false);
  const [webUpdateStatus, setWebUpdateStatus] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadLoaded, setDownloadLoaded] = useState(0);
  const [downloadTotal, setDownloadTotal] = useState(0);
  const [useMirror, setUseMirror] = useState(true);
  const [hasCopiedDockerCmd, setHasCopiedDockerCmd] = useState(false);
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);

  if (!isOpen) return null;

  const isWeb = updateInfo?.platform === 'web' || !updateInfo?.platform;

  // Handle in-app Web one-click update
  const handleWebOneClickUpdate = async () => {
    setIsUpdatingWeb(true);
    setWebUpdateStatus('正在连接服务端拉取最新代码并清理本地缓存...');

    try {
      const serverResult = await executeServerUpdate();
      if (serverResult.message) {
        setWebUpdateStatus(serverResult.message);
      }
    } catch {
      // Backend may be static-only or standalone
    }

    setWebUpdateStatus('缓存清理完毕，正在重新加载页面...');
    setTimeout(async () => {
      await clearWebCacheAndReload();
    }, 1200);
  };

  // Handle in-app App binary download (Android APK, Windows exe, etc.)
  const handleAppDownload = async () => {
    if (!updateInfo) return;
    const targetUrl = useMirror && updateInfo.mirrorDownloadUrl ? updateInfo.mirrorDownloadUrl : updateInfo.downloadUrl;
    if (!targetUrl) return;

    const filename = updateInfo.assetName || `muse-audio-v${updateInfo.latestVersion}.${
      updateInfo.platform === 'android' ? 'apk' : updateInfo.platform === 'windows' ? 'exe' : 'zip'
    }`;

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      await downloadAssetFile(targetUrl, filename, useMirror, (percent, loaded, total) => {
        setDownloadProgress(percent);
        setDownloadLoaded(loaded);
        setDownloadTotal(total);
      });
      // After complete
      setTimeout(() => {
        setIsDownloading(false);
      }, 2000);
    } catch (err: any) {
      console.error('[Updater] Download error:', err);
      // Fallback: direct window.open
      window.open(targetUrl, '_blank');
      setIsDownloading(false);
    }
  };

  const handleIgnore = () => {
    if (updateInfo?.latestVersion) {
      dismissVersion(updateInfo.latestVersion);
    }
    onClose();
  };

  const copyDockerCommand = () => {
    const cmd = 'git pull origin main && docker compose up -d --build';
    navigator.clipboard?.writeText(cmd);
    setHasCopiedDockerCmd(true);
    setTimeout(() => setHasCopiedDockerCmd(false), 2500);
  };

  const getPlatformLabel = (platform?: string) => {
    switch (platform) {
      case 'windows': return 'Windows 桌面客户端 (.exe)';
      case 'android': return 'Android 安卓客户端 (.apk)';
      case 'harmonyos': return 'HarmonyOS 鸿蒙 NEXT (.hap)';
      case 'linux': return 'Linux 桌面版 (.AppImage)';
      case 'ios': return 'iOS 客户端';
      default: return 'Web 网页版 / 服务端';
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
                  ? '正在连接更新服务器获取最新版本信息...'
                  : updateInfo?.hasUpdate
                  ? `检测到新版本 v${updateInfo.latestVersion}，支持在程序内一键无缝更新`
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
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-sm text-zinc-400">正在获取最新版本信息，请稍候...</p>
            </div>
          ) : updateInfo?.hasUpdate ? (
            <>
              {/* Version Comparison Box */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <div>
                  <div className="text-xs text-zinc-500 font-medium">当前版本</div>
                  <span className="font-mono text-zinc-300 font-medium">v{updateInfo.currentVersion}</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <ArrowUpCircle className="w-5 h-5" />
                  <span>升级至</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500 font-medium">最新版本</div>
                  <span className="font-mono text-emerald-300 font-bold text-base">v{updateInfo.latestVersion}</span>
                </div>
              </div>

              {/* Platform Info Tag */}
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/40 text-xs border border-zinc-800/80">
                <span className="text-zinc-400">检测运行环境：</span>
                <span className="text-emerald-300 font-medium">{getPlatformLabel(updateInfo.platform)}</span>
              </div>

              {/* In-App Downloading Progress Bar */}
              {isDownloading && (
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                  <div className="flex justify-between text-xs text-indigo-200">
                    <span className="flex items-center space-x-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      <span>正在下载新版本安装包...</span>
                    </span>
                    <span className="font-mono font-bold text-indigo-300">{downloadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-200"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                    <span>{formatFileSize(downloadLoaded)}</span>
                    <span>{formatFileSize(downloadTotal)}</span>
                  </div>
                </div>
              )}

              {/* Web Updating Status Indicator */}
              {isUpdatingWeb && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto" />
                  <p className="text-xs text-emerald-200 font-medium">{webUpdateStatus}</p>
                </div>
              )}

              {/* Release Notes */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  更新日志 (Release Notes)
                </h3>
                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 max-h-40 overflow-y-auto text-xs font-mono leading-relaxed whitespace-pre-wrap text-zinc-300 custom-scrollbar">
                  {updateInfo.releaseNotes || '暂无详细更新日志'}
                </div>
              </div>

              {/* Fast Mirror & Other Options */}
              {!isWeb && (
                <div className="flex items-center justify-between text-xs px-1 text-zinc-400">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useMirror}
                      onChange={e => setUseMirror(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>启用国内高速加速节点 (推荐)</span>
                  </label>
                  {updateInfo.assetSize ? (
                    <span className="text-zinc-500 font-mono">{formatFileSize(updateInfo.assetSize)}</span>
                  ) : null}
                </div>
              )}

              {/* Web / Docker Helper */}
              {isWeb && (
                <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/80 text-xs space-y-2">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>💡 Docker 一键更新命令：</span>
                    <button
                      onClick={copyDockerCommand}
                      className="flex items-center space-x-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] transition"
                    >
                      {hasCopiedDockerCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{hasCopiedDockerCmd ? '已复制' : '复制命令'}</span>
                    </button>
                  </div>
                  <code className="block p-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[11px] select-all overflow-x-auto">
                    git pull origin main && docker compose up -d --build
                  </code>
                </div>
              )}

              {/* Show All Platform Downloads Toggle */}
              <div>
                <button
                  onClick={() => setShowAllPlatforms(!showAllPlatforms)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 flex items-center space-x-1"
                >
                  <span>{showAllPlatforms ? '收起其他平台安装包' : '查看/下载其他平台客户端 (Android / Windows 等)'}</span>
                </button>
                {showAllPlatforms && updateInfo.allAssets && updateInfo.allAssets.length > 0 && (
                  <div className="mt-2 space-y-1.5 p-2 rounded-xl bg-zinc-950 border border-zinc-800 max-h-36 overflow-y-auto custom-scrollbar">
                    {updateInfo.allAssets.map((asset, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 hover:bg-zinc-900 rounded">
                        <span className="text-zinc-300 truncate max-w-[200px]" title={asset.name}>
                          {asset.name}
                        </span>
                        <div className="flex items-center space-x-2 font-mono text-zinc-500 text-[11px]">
                          <span>{formatFileSize(asset.size)}</span>
                          <a
                            href={useMirror ? asset.mirrorDownloadUrl : asset.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                            title="下载"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  当前版本 v{updateInfo?.currentVersion || '1.0.0'} 已是最新稳定版，畅享 Hi-Fi 纯净音质。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
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
                  disabled={isDownloading || isUpdatingWeb}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition disabled:opacity-50"
                >
                  稍后提醒
                </button>

                {isWeb ? (
                  <button
                    onClick={handleWebOneClickUpdate}
                    disabled={isUpdatingWeb}
                    className="flex items-center space-x-1.5 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-lg shadow-lg shadow-emerald-600/30 transition disabled:opacity-60"
                  >
                    {isUpdatingWeb ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 fill-white" />
                    )}
                    <span>{isUpdatingWeb ? '正在更新...' : '一键更新网页版'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleAppDownload}
                    disabled={isDownloading}
                    className="flex items-center space-x-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-600/30 transition disabled:opacity-60"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>{isDownloading ? '正在下载...' : '一键下载并安装'}</span>
                  </button>
                )}
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
                  <span>查看 GitHub 发行版</span>
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
