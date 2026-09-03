import React, { useState } from 'react';
import { Track, PlaybackMode, VisualizerMode, StreamQuality } from '../types';
import { LyricsView } from './LyricsView';
import { VisualizerCanvas } from './VisualizerCanvas';
import { formatTime } from '../utils/lyricsParser';
import { ImageWithFallback } from './ImageWithFallback';
import { normalizeCoverUrl } from '../utils/imageUtils';
import { useAudioTime } from '../utils/timeStore';
import confetti from 'canvas-confetti';
import {
  ChevronDown,
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Sliders,
  Moon,
  ListMusic,
  Disc,
  FileText,
  Activity,
  Gauge,
  Radio,
  Download,
  Music,
} from 'lucide-react';

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
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
  onOpenDownload?: (track: Track) => void;
}

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({
  isOpen,
  onClose,
  track,
  isPlaying,
  duration,
  playbackMode,
  playbackSpeed,
  quality,
  isFavorite,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onTogglePlaybackMode,
  onChangePlaybackSpeed,
  onChangeQuality,
  onToggleFavorite,
  onOpenEQ,
  onOpenQueue,
  onOpenSleepTimer,
  onOpenDownload,
}) => {
  // Playback time is subscribed via the module-singleton timeStore (capped at
  // 10fps) instead of a prop, so the whole app tree doesn't re-render per tick.
  const currentTime = useAudioTime();
  const [activeTab, setActiveTab] = useState<'vinyl' | 'lyrics' | 'visualizer'>('vinyl');
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('bars');
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  if (!isOpen || !track) return null;

  const currentDisplayTime = isScrubbing ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (currentDisplayTime / duration) * 100 : 0;

  const handleFavoriteClick = () => {
    if (!isFavorite) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#ec4899', '#f43f5e', '#a855f7'],
      });
    }
    onToggleFavorite(track);
  };

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#08080c] text-slate-100 animate-in slide-in-from-bottom-5 duration-300 overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Background Dynamic Ambient Blur */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-125 transition-all duration-1000 -z-10"
        style={{ backgroundImage: `url(${normalizeCoverUrl(track.coverUrl)})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-[#08080c] -z-10" />

      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-white/10 flex-shrink-0 backdrop-blur-md">
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
          aria-label="收起播放器"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        {/* View mode switcher */}
        <div className="flex items-center bg-white/5 backdrop-blur-xl rounded-full p-1 border border-white/10 text-xs shadow-inner">
          <button
            onClick={() => setActiveTab('vinyl')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-medium transition ${
              activeTab === 'vinyl' ? 'bg-white text-black font-bold shadow-md shadow-white/10' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">唱片模式</span>
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-medium transition ${
              activeTab === 'lyrics' ? 'bg-white text-black font-bold shadow-md shadow-white/10' : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">同步歌词</span>
          </button>
          <button
            onClick={() => setActiveTab('visualizer')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-medium transition ${
              activeTab === 'visualizer' ? 'bg-white text-black font-bold shadow-md shadow-white/10' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">音频频谱</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSleepTimer}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
            title="睡眠定时"
          >
            <Moon className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenEQ}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
            title="均衡器"
          >
            <Sliders className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Center Stage */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-4 md:p-8 min-h-0 overflow-hidden">
        {activeTab === 'vinyl' && (
          <div className="flex flex-col items-center justify-center w-full max-w-md my-auto">
            {/* Tone Arm & Rotating Vinyl Disc */}
            <div className="relative flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96">
              {/* Outer Vinyl Ring */}
              <div
                className={`relative w-full h-full rounded-full bg-neutral-900 border-8 border-neutral-950 shadow-2xl flex items-center justify-center transition-all ${
                  isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''
                }`}
                style={{
                  boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), inset 0 0 30px rgba(0,0,0,0.8)',
                  background: 'radial-gradient(circle, #262626 0%, #171717 70%, #0a0a0a 100%)',
                }}
              >
                {/* Vinyl Grooves texture lines */}
                <div className="absolute inset-4 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute inset-8 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute inset-14 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute inset-20 rounded-full border border-white/5 pointer-events-none" />

                {/* Album Cover Center Label */}
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-white/10 shadow-inner flex items-center justify-center">
                  <ImageWithFallback
                    src={normalizeCoverUrl(track.coverUrl)}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute w-6 h-6 rounded-full bg-neutral-950 border-2 border-white/30" />
                </div>
              </div>
            </div>

            {/* Quality Pill */}
            <div className="mt-6 flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-full text-[11px] font-mono tracking-wider font-semibold bg-white/10 text-emerald-300 border border-white/15 backdrop-blur-md flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400" />
                {track.bitrate || 'Hi-Res Lossless Audio'}
              </span>
            </div>
          </div>
        )}

        {activeTab === 'lyrics' && (
          <div className="w-full max-w-2xl h-full flex flex-col justify-center">
            <LyricsView
              track={track}
              currentTime={currentTime}
              onSeek={onSeek}
              className="h-full"
            />
          </div>
        )}

        {activeTab === 'visualizer' && (
          <div className="w-full max-w-2xl flex flex-col items-center justify-center p-6 space-y-6">
            <div className="w-full bg-white/5 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> 实时音频图谱分析
                </h4>
                <div className="flex gap-1.5">
                  {(['bars', 'wave', 'circle', 'neon'] as VisualizerMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setVisualizerMode(m)}
                      className={`px-3 py-1 text-xs rounded-full font-medium capitalize transition ${
                        visualizerMode === m
                          ? 'bg-white text-black font-bold shadow-md shadow-white/10'
                          : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {m === 'bars' ? '频谱柱' : m === 'wave' ? '示波器' : m === 'circle' ? '环形' : '霓虹'}
                    </button>
                  ))}
                </div>
              </div>

              <VisualizerCanvas
                mode={visualizerMode}
                isPlaying={isPlaying}
                themeColor={track.themeColor || '#10b981'}
                height={220}
                className="rounded-2xl bg-black/40 p-2 border border-white/5"
              />
            </div>

            {/* Quick lyric preview in visualizer mode */}
            <div className="text-center max-w-lg">
              <p className="text-base text-emerald-300 font-medium tracking-wide drop-shadow">
                {track.title} · {track.artist}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Track Controls Area */}
      <div className="px-6 md:px-12 pb-8 pt-2 bg-gradient-to-t from-black via-black/90 to-transparent flex-shrink-0">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Track Info & Actions */}
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-4">
              <h2 className="text-xl md:text-2xl font-bold text-white truncate">{track.title}</h2>
              <p className="text-sm text-slate-400 mt-0.5 truncate">{track.artist} — {track.album}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Playback speed dropdown */}
              <div className="flex items-center bg-white/5 border border-white/10 backdrop-blur-md rounded-full px-3 py-1 text-xs font-mono text-slate-300">
                <Gauge className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                <select
                  value={playbackSpeed}
                  onChange={(e) => onChangePlaybackSpeed(parseFloat(e.target.value))}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  {speedOptions.map((s) => (
                    <option key={s} value={s} className="bg-neutral-900 text-white">
                      {s}x
                    </option>
                  ))}
                </select>
              </div>

              {/* Stream quality dropdown */}
              <div className="flex items-center bg-white/5 border border-white/10 backdrop-blur-md rounded-full px-3 py-1 text-xs font-mono text-slate-300">
                <Music className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                <select
                  value={quality}
                  onChange={(e) => onChangeQuality(e.target.value as StreamQuality)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                  title="播放音质"
                >
                  <option value="lossless" className="bg-neutral-900 text-white">无损 · FLAC</option>
                  <option value="high" className="bg-neutral-900 text-white">高 · HQ</option>
                  <option value="standard" className="bg-neutral-900 text-white">标准 · SD</option>
                </select>
              </div>

              <button
                onClick={() => onOpenDownload?.(track)}
                className="p-2.5 rounded-full text-slate-400 hover:text-emerald-400 hover:bg-white/10 transition"
                title="下载音乐 / 歌词 / 封面"
              >
                <Download className="w-5 h-5" />
              </button>

              <button
                onClick={handleFavoriteClick}
                className={`p-2.5 rounded-full transition ${
                  isFavorite
                    ? 'text-pink-400 bg-pink-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Progress Bar & Timestamps */}
          <div className="space-y-1.5">
            <div className="relative group">
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
                className="w-full cursor-pointer h-1.5"
                style={{ ['--slider-fill' as string]: `${progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-xs font-mono text-slate-400 px-0.5">
              <span>{formatTime(currentDisplayTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls Row */}
          <div className="flex items-center justify-between pt-2">
            {/* Playback Mode (Loop/Shuffle) */}
            <button
              onClick={onTogglePlaybackMode}
              className="p-3 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
              title={`模式: ${playbackMode}`}
            >
              {playbackMode === 'repeat-one' ? (
                <Repeat1 className="w-5 h-5 text-emerald-400" />
              ) : playbackMode === 'shuffle' ? (
                <Shuffle className="w-5 h-5 text-emerald-400" />
              ) : (
                <Repeat className={`w-5 h-5 ${playbackMode === 'repeat-all' ? 'text-emerald-400' : ''}`} />
              )}
            </button>

            {/* Previous */}
            <button
              onClick={onPrev}
              className="p-3 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition active:scale-95"
            >
              <SkipBack className="w-7 h-7" />
            </button>

            {/* Play / Pause Big Button */}
            <button
              onClick={onTogglePlay}
              className="p-5 bg-white hover:bg-slate-100 text-black rounded-full shadow-2xl shadow-white/20 transition transform hover:scale-105 active:scale-95 flex items-center justify-center font-bold"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={onNext}
              className="p-3 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition active:scale-95"
            >
              <SkipForward className="w-7 h-7" />
            </button>

            {/* Queue Button */}
            <button
              onClick={onOpenQueue}
              className="p-3 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
              title="当前播放列表"
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
