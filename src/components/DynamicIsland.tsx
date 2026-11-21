import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Track } from '../types';
import { useAudioTime } from '../utils/timeStore';
import { parseLRC, formatTime } from '../utils/lyricsParser';
import { ImageWithFallback } from './ImageWithFallback';
import { normalizeCoverUrl } from '../utils/imageUtils';
import { triggerHaptic } from '../utils/haptics';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Heart,
  ChevronUp,
} from 'lucide-react';

interface DynamicIslandProps {
  track: Track | null;
  isPlaying: boolean;
  isFavorite: boolean;
  duration: number;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onToggleFavorite: (track: Track) => void;
  onOpenFullScreen: () => void;
  disabled?: boolean;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  track,
  isPlaying,
  isFavorite,
  duration,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onToggleFavorite,
  onOpenFullScreen,
  disabled = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const currentTime = useAudioTime();
  const islandRef = useRef<HTMLDivElement>(null);

  // Parse lyrics for current active line
  const parsedLyrics = useMemo(() => {
    if (!track?.lyrics) return [];
    return parseLRC(track.lyrics);
  }, [track?.lyrics]);

  const currentLyric = useMemo(() => {
    if (!parsedLyrics.length) return '';
    let cur = '';
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time) {
        cur = parsedLyrics[i].text;
      } else {
        break;
      }
    }
    return cur || track?.title || '';
  }, [parsedLyrics, currentTime, track?.title]);

  // Click outside to collapse
  useEffect(() => {
    if (!isExpanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (islandRef.current && !islandRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  if (disabled || !track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={islandRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed top-2.5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
      style={{
        width: isExpanded ? '380px' : isHovered ? '240px' : '200px',
      }}
    >
      {/* Dynamic Island Capsule Container */}
      <div
        onClick={() => {
          if (!isExpanded) {
            triggerHaptic('light');
            setIsExpanded(true);
          }
        }}
        className={`bg-black/95 text-white backdrop-blur-2xl border border-white/20 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.85)] cursor-pointer transition-all duration-300 overflow-hidden ${
          isExpanded ? 'rounded-3xl p-4' : 'px-3.5 py-1.5'
        }`}
      >
        {/* === Collapsed State === */}
        {!isExpanded && (
          <div className="flex items-center justify-between gap-2.5 h-7">
            {/* Left: Mini Spinning Vinyl Cover */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative w-5 h-5 flex-shrink-0">
                <ImageWithFallback
                  src={normalizeCoverUrl(track.coverUrl)}
                  alt={track.title}
                  className={`w-5 h-5 rounded-full object-cover shadow-sm ${
                    isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
                  }`}
                />
                <div className="absolute inset-0 rounded-full ring-1 ring-white/20" />
              </div>
              <div className="text-[11px] font-semibold text-slate-100 truncate max-w-[90px] sm:max-w-[120px]">
                {track.title}
              </div>
            </div>

            {/* Right: Sound Wave Bars or Play Indicator */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isPlaying ? (
                <div className="flex items-end gap-0.5 h-3 px-1">
                  <span className="w-0.5 h-full bg-emerald-400 rounded-full animate-[eqbar_0.8s_ease-in-out_infinite]" />
                  <span className="w-0.5 h-full bg-cyan-400 rounded-full animate-[eqbar_1.1s_ease-in-out_infinite_0.2s]" />
                  <span className="w-0.5 h-full bg-indigo-400 rounded-full animate-[eqbar_0.9s_ease-in-out_infinite_0.4s]" />
                </div>
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
              )}
            </div>
          </div>
        )}

        {/* === Expanded State (Interactive HUD) === */}
        {isExpanded && (
          <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
            {/* Top row: Track info & Action collapse */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden shadow-lg border border-white/15">
                  <ImageWithFallback
                    src={normalizeCoverUrl(track.coverUrl)}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{track.title}</div>
                  <div className="text-xs text-slate-400 truncate">{track.artist}</div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('light');
                    onToggleFavorite(track);
                  }}
                  className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-red-400 transition"
                  title="收藏"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'text-red-400 fill-red-400' : ''}`} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('light');
                    onOpenFullScreen();
                    setIsExpanded(false);
                  }}
                  className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition"
                  title="全屏播放器"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('light');
                    setIsExpanded(false);
                  }}
                  className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
                  title="收起灵动岛"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Lyric Banner */}
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-center">
              <p className="text-xs text-emerald-300 font-medium truncate tracking-wide">
                {currentLyric || '♫ 享受当下的高保真音乐 ♫'}
              </p>
            </div>

            {/* Progress Bar & Scrubber */}
            <div className="space-y-1">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  onSeek(ratio * duration);
                }}
                className="relative h-1.5 bg-white/15 rounded-full overflow-hidden cursor-pointer"
              >
                <div
                  className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-6 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  onPrev();
                }}
                className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('medium');
                  onTogglePlay();
                }}
                className="p-3 rounded-full bg-white text-black hover:scale-105 active:scale-95 shadow-lg shadow-white/20 transition"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current translate-x-0.5" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  onNext();
                }}
                className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
