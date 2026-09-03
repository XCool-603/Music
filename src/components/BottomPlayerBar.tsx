import React, { useState } from 'react';
import { Track, PlaybackMode, StreamQuality } from '../types';
import { formatTime } from '../utils/lyricsParser';
import { VisualizerCanvas } from './VisualizerCanvas';
import { ImageWithFallback } from './ImageWithFallback';
import { normalizeCoverUrl } from '../utils/imageUtils';
import { useAudioTime } from '../utils/timeStore';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  Sliders,
  Moon,
  ListMusic,
  Maximize2,
  Heart,
  Activity,
  Music,
  Download,
} from 'lucide-react';

interface BottomPlayerBarProps {
  track: Track | null;
  isPlaying: boolean;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackMode: PlaybackMode;
  playbackSpeed: number;
  quality: StreamQuality;
  isFavorite: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onTogglePlaybackMode: () => void;
  onChangePlaybackSpeed: (speed: number) => void;
  onChangeQuality: (quality: StreamQuality) => void;
  onToggleFavorite: (track: Track) => void;
  onOpenEQ: () => void;
  onOpenQueue: () => void;
  onOpenSleepTimer: () => void;
  onOpenFullScreen: () => void;
  onOpenDownload?: (track: Track) => void;
}

export const BottomPlayerBar: React.FC<BottomPlayerBarProps> = ({
  track,
  isPlaying,
  duration,
  volume,
  isMuted,
  playbackMode,
  quality,
  isFavorite,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onTogglePlaybackMode,
  onChangeQuality,
  onToggleFavorite,
  onOpenEQ,
  onOpenQueue,
  onOpenSleepTimer,
  onOpenFullScreen,
  onOpenDownload,
}) => {
  // Playback time is subscribed via the module-singleton timeStore (capped at
  // 10fps) instead of a prop, so the whole app tree doesn't re-render per tick.
  const currentTime = useAudioTime();
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [showMiniVisualizer, setShowMiniVisualizer] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);

  if (!track) {
    return (
      <div className="h-20 bg-black/40 backdrop-blur-xl border-t border-white/10 flex items-center justify-center text-slate-500 text-sm">
        <Music className="w-4 h-4 mr-2" />
        选择一首歌曲开始享受美妙音乐之旅
      </div>
    );
  }

  const currentDisplayTime = isScrubbing ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (currentDisplayTime / duration) * 100 : 0;

  const handleHeart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFavorite) {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.9 },
        colors: ['#34d399', '#818cf8', '#f472b6'],
      });
    }
    onToggleFavorite(track);
  };

  return (
    <div className="relative bg-black/40 backdrop-blur-2xl border-t border-white/10 shadow-2xl select-none z-40">
      {/* Mini Visualizer Strip on top of player */}
      {showMiniVisualizer && (
        <div className="absolute -top-12 left-0 right-0 h-12 bg-black/60 backdrop-blur-xl border-t border-white/10 flex items-center px-4 overflow-hidden">
          <VisualizerCanvas
            mode="bars"
            isPlaying={isPlaying}
            themeColor={track.themeColor || '#10b981'}
            height={44}
          />
        </div>
      )}

      {/* Top Scrubber Progress bar (for ultra fluid control) */}
      <div className="relative w-full group">
        <div className="h-1.5 bg-white/10 w-full cursor-pointer group-hover:h-2 transition-all duration-150">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-indigo-400 to-fuchsia-400 transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {/* Visual thumb dot on hover */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 rounded-full bg-white border-2 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `${progressPercent}%` }}
        />
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentDisplayTime}
          onMouseDown={() => { setScrubValue(currentTime); setIsScrubbing(true); }}
          onTouchStart={() => { setScrubValue(currentTime); setIsScrubbing(true); }}
          onChange={(e) => setScrubValue(parseFloat(e.target.value))}
          onMouseUp={(e) => {
            setIsScrubbing(false);
            onSeek(parseFloat((e.target as HTMLInputElement).value));
          }}
          onTouchEnd={(e) => {
            setIsScrubbing(false);
            onSeek(parseFloat((e.target as HTMLInputElement).value));
          }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-6 -top-2"
        />
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 md:gap-6">
        {/* Left Section: Track Metadata & Like */}
        <div
          onClick={onOpenFullScreen}
          className="flex items-center gap-3 min-w-0 max-w-[40%] sm:max-w-[30%] cursor-pointer group"
        >
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md flex-shrink-0 bg-white/5 ring-1 ring-white/15">
            <ImageWithFallback
              src={normalizeCoverUrl(track.coverUrl)}
              alt={track.title}
              className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${
                isPlaying ? 'animate-[spin_15s_linear_infinite]' : ''
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate group-hover:text-emerald-300 transition">
              {track.title}
            </div>
            <div className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
              <span>{track.artist}</span>
              {/* Stream Quality Selector */}
              <span className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setQualityOpen(!qualityOpen); }}
                  className="hidden sm:inline-flex items-center text-[10px] bg-white/10 text-emerald-300 px-1.5 py-0.2 rounded font-mono border border-white/10 hover:bg-white/20"
                  title="切换音质"
                >
                  {quality === 'lossless' ? 'FLAC' : quality === 'high' ? 'HQ' : 'SD'}
                </button>
                {qualityOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setQualityOpen(false); }} />
                    <div className="absolute bottom-7 left-0 z-50 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1.5 w-36">
                      {(
                        [
                          { key: 'lossless', label: '无损 · FLAC' },
                          { key: 'high', label: '高 · HQ' },
                          { key: 'standard', label: '标准 · SD' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.key}
                          onClick={(e) => { e.stopPropagation(); setQualityOpen(false); onChangeQuality(opt.key); }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition ${
                            quality === opt.key
                              ? 'text-white bg-emerald-500/20 font-semibold'
                              : 'text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </span>
            </div>
          </div>

          <button
            onClick={handleHeart}
            className={`p-1.5 rounded-full transition ml-1 hidden sm:block ${
              isFavorite ? 'text-pink-400' : 'text-slate-500 hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Center Section: Main Playback Controls & Scrubber */}
        <div className="flex flex-col items-center flex-1 max-w-xl">
          <div className="flex items-center gap-2 sm:gap-5">
            {/* Playback Mode (Sequence, Repeat All, Repeat 1, Shuffle) */}
            <button
              onClick={onTogglePlaybackMode}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition hidden sm:block"
              title={`模式: ${playbackMode}`}
            >
              {playbackMode === 'repeat-one' ? (
                <Repeat1 className="w-4 h-4 text-emerald-400" />
              ) : playbackMode === 'shuffle' ? (
                <Shuffle className="w-4 h-4 text-emerald-400" />
              ) : (
                <Repeat className={`w-4 h-4 ${playbackMode === 'repeat-all' ? 'text-emerald-400' : ''}`} />
              )}
            </button>

            {/* Prev */}
            <button
              onClick={onPrev}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg transition active:scale-90"
              title="上一首"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Play / Pause Primary Button */}
            <button
              onClick={onTogglePlay}
              className="p-3 bg-white hover:bg-slate-100 text-black rounded-full shadow-lg shadow-white/15 transition transform hover:scale-105 active:scale-95 flex items-center justify-center font-bold"
              title={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={onNext}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg transition active:scale-90"
              title="下一首"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Visualizer Mini Bar Toggle */}
            <button
              onClick={() => setShowMiniVisualizer(!showMiniVisualizer)}
              className={`p-1.5 rounded-lg transition hidden md:block ${
                showMiniVisualizer ? 'text-emerald-400 bg-white/10' : 'text-slate-400 hover:text-white'
              }`}
              title="实时音频波形"
            >
              <Activity className="w-4 h-4" />
            </button>
          </div>

          {/* Time indicator (hidden on very small mobile, visible sm+) */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-1">
            <span>{formatTime(currentDisplayTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Section: Volume & Advanced Utilities */}
        <div className="flex items-center gap-1 sm:gap-2.5">
          {/* Download button */}
          <button
            onClick={() => onOpenDownload?.(track)}
            className="p-2 text-slate-400 hover:text-emerald-400 rounded-xl hover:bg-white/5 transition hidden sm:block"
            title="下载音乐 / 歌词 / 封面"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* EQ Mixer shortcut */}
          <button
            onClick={onOpenEQ}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition hidden lg:block"
            title="音效均衡器"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Sleep timer */}
          <button
            onClick={onOpenSleepTimer}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition hidden lg:block"
            title="睡眠定时"
          >
            <Moon className="w-4 h-4" />
          </button>

          {/* Volume Control */}
          <div className="hidden md:flex items-center gap-2 px-1">
            <button
              onClick={onToggleMute}
              className="text-slate-400 hover:text-white transition"
              title={isMuted ? '取消静音' : '静音'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              style={{ ['--slider-fill' as string]: `${(isMuted ? 0 : volume) * 100}%` }}
              className="w-16 lg:w-20 cursor-pointer"
            />
          </div>

          {/* Queue Drawer Toggle */}
          <button
            onClick={onOpenQueue}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
            title="播放队列"
          >
            <ListMusic className="w-5 h-5" />
          </button>

          {/* Full Screen Immersive View Toggle */}
          <button
            onClick={onOpenFullScreen}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
            title="沉浸式大屏歌词/唱片模式"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
