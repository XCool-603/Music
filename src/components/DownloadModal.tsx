import React, { useState, useEffect } from 'react';
import { Track, CustomSourceScript, StreamQuality } from '../types';
import {
  downloadTrackAudio,
  downloadTrackLyrics,
  downloadTrackCover,
  downloadTrackBundle,
  sanitizeFilename,
} from '../utils/downloadManager';
import { ImageWithFallback } from './ImageWithFallback';
import { normalizeCoverUrl } from '../utils/imageUtils';
import confetti from 'canvas-confetti';
import {
  X,
  Download,
  Music,
  FileText,
  Image,
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Disc,
  Headphones,
  HardDrive,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  customScripts?: CustomSourceScript[];
  quality?: StreamQuality;
  onOpenLocalImporter?: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  track,
  customScripts = [],
  quality = 'high',
  onOpenLocalImporter,
}: DownloadModalProps) => {
  const [downloadingType, setDownloadingType] = useState<'audio' | 'lrc' | 'cover' | 'bundle' | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [completedType, setCompletedType] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDownloadingType(null);
      setProgress(0);
      setCompletedType(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen || !track) return null;

  const handleDownloadAudio = async () => {
    setDownloadingType('audio');
    setProgress(15);
    setErrorMsg(null);

    const success = await downloadTrackAudio(track, customScripts, quality, (p) => setProgress(p));
    setDownloadingType(null);

    if (success) {
      setCompletedType('audio');
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10b981', '#6366f1', '#ec4899'],
      });
    } else {
      setErrorMsg('音频下载失败，请检查网络连接或稍后重试');
    }
  };

  const handleDownloadLyrics = async () => {
    setDownloadingType('lrc');
    setProgress(30);
    setErrorMsg(null);

    const success = await downloadTrackLyrics(track);
    setDownloadingType(null);

    if (success) {
      setCompletedType('lrc');
    } else {
      setErrorMsg('歌词文件获取失败');
    }
  };

  const handleDownloadCover = async () => {
    setDownloadingType('cover');
    setProgress(50);
    setErrorMsg(null);

    const success = await downloadTrackCover(track);
    setDownloadingType(null);

    if (success) {
      setCompletedType('cover');
    } else {
      setErrorMsg('封面图片获取失败');
    }
  };

  const handleDownloadBundle = async () => {
    setDownloadingType('bundle');
    setProgress(20);
    setErrorMsg(null);

    const success = await downloadTrackBundle(track, customScripts, quality);
    setDownloadingType(null);

    if (success) {
      setCompletedType('bundle');
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#10b981', '#38bdf8', '#fbbf24', '#f43f5e'],
      });
    } else {
      setErrorMsg('打包下载过程中部分文件获取受限');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-neutral-900/95 border border-white/15 rounded-3xl p-6 sm:p-7 text-slate-100 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Ambient Glow */}
        <div
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-15 pointer-events-none -z-10"
          style={{ backgroundImage: `url(${normalizeCoverUrl(track.coverUrl)})` }}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">下载音乐与离线资源</h3>
              <p className="text-xs text-slate-400">支持保存高品质音频文件、LRC同步歌词及专辑封面</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Track Preview Card */}
        <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-md flex-shrink-0 bg-neutral-800 ring-1 ring-white/15">
            <ImageWithFallback
              src={normalizeCoverUrl(track.coverUrl)}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white truncate">{track.title}</span>
              {track.bitrate && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono border border-emerald-500/30 flex-shrink-0">
                  {track.bitrate.includes('FLAC') ? '无损 FLAC' : '320k MP3'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {track.artist} · 《{track.album}》
            </p>
            <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-2">
              <span>
                文件命名: {sanitizeFilename(`${track.artist} - ${track.title}.${quality === 'lossless' ? 'flac' : 'mp3'}`)}（音质：{quality === 'lossless' ? '无损 FLAC' : quality === 'high' ? 'HQ 320k' : '标准 128k'}）
              </span>
            </div>
          </div>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Progress Bar (Visible while downloading) */}
        {downloadingType && (
          <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-2 text-emerald-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                正在准备并传输文件流...
              </span>
              <span className="font-mono text-slate-400">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Banner */}
        {completedType && !downloadingType && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-200">
                {completedType === 'audio'
                  ? '音乐音频文件已触发下载！'
                  : completedType === 'lrc'
                  ? 'LRC 动态同步歌词已保存！'
                  : completedType === 'cover'
                  ? '专辑封面图片已保存！'
                  : '全套音乐礼包（音频+歌词+封面）已全部触发下载！'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                浏览器已自动将文件保存到您的系统「下载」文件夹中。
              </p>
            </div>
          </div>
        )}

        {/* Download Options Grid */}
        <div className="mt-5 space-y-2.5">
          {/* 1. MP3 Audio File */}
          <button
            onClick={handleDownloadAudio}
            disabled={downloadingType !== null}
            className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 flex items-center justify-between text-left transition group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>下载{quality === 'lossless' ? '无损' : '高品质'}音频 (.{quality === 'lossless' ? 'flac' : 'mp3'})</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.2 rounded-full border border-emerald-500/30">
                    {quality === 'lossless' ? '无损' : '推荐'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {quality === 'lossless'
                    ? 'FLAC 无损原码率，音质天花板，适合 HIFI 离线收藏'
                    : '320kbps / 纯正音频源，兼容各类离线播放设备与车载音响'}
                </p>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/5 group-hover:bg-emerald-500 group-hover:text-black transition">
              {downloadingType === 'audio' ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              ) : completedType === 'audio' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Download className="w-4 h-4 text-slate-400 group-hover:text-black" />
              )}
            </div>
          </button>

          {/* 2. LRC Lyrics File */}
          <button
            onClick={handleDownloadLyrics}
            disabled={downloadingType !== null}
            className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 flex items-center justify-between text-left transition group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-105 transition">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">下载 LRC 同步动态歌词 (.lrc)</div>
                <p className="text-xs text-slate-400 mt-0.5">标准毫秒级时间戳，Foobar2000、手机及车机播放器即插即显</p>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/5 group-hover:bg-indigo-500 group-hover:text-white transition">
              {downloadingType === 'lrc' ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              ) : completedType === 'lrc' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />
              )}
            </div>
          </button>

          {/* 3. High-Res Cover Art */}
          <button
            onClick={handleDownloadCover}
            disabled={downloadingType !== null}
            className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 flex items-center justify-between text-left transition group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-105 transition">
                <Image className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">下载原画高清专辑封面 (.jpg)</div>
                <p className="text-xs text-slate-400 mt-0.5">高清原始画质，适合作为壁纸或离线音乐库封面资产</p>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/5 group-hover:bg-purple-500 group-hover:text-white transition">
              {downloadingType === 'cover' ? (
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              ) : completedType === 'cover' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />
              )}
            </div>
          </button>

          {/* 4. Complete Bundle */}
          <button
            onClick={handleDownloadBundle}
            disabled={downloadingType !== null}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-purple-500/10 hover:from-emerald-500/20 hover:to-purple-500/20 border border-white/15 hover:border-white/30 flex items-center justify-between text-left transition group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-500 text-white group-hover:scale-105 transition shadow-lg shadow-emerald-500/20">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>一键下载全套音乐礼包</span>
                  <span className="text-[10px] bg-gradient-to-r from-amber-500/30 to-rose-500/30 text-amber-300 px-2 py-0.2 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> 三合一
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">同时下载{quality === 'lossless' ? '无损 FLAC' : ' MP3 音频'} + LRC 歌词 + 高清封面</p>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/10 group-hover:bg-white group-hover:text-black transition">
              {downloadingType === 'bundle' ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              ) : completedType === 'bundle' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Download className="w-4 h-4 text-white group-hover:text-black" />
              )}
            </div>
          </button>
        </div>

        {/* Footer info & Local Importer Tip */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-500">
            <HardDrive className="w-3.5 h-3.5" />
            <span>下载后支持通过「本地导入」导入播放</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium transition"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
