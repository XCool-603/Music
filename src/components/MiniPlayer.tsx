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
  Volume2,
  VolumeX,
  Pin,
  PinOff,
  Move,
  X,
} from 'lucide-react';

interface MiniPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  isPlaying: boolean;
  isFavorite: boolean;
  duration: number;
  volume: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleFavorite: (track: Track) => void;
  onOpenFullScreen: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  isOpen,
  onClose,
  track,
  isPlaying,
  isFavorite,
  duration,
  volume,
  isMuted,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFavorite,
  onOpenFullScreen,
}) => {
  const currentTime = useAudioTime();
  const [isPinned, setIsPinned] = useState(true);
  const [showVolume, setShowVolume] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

  // Tauri window resizing & always-on-top integration
  useEffect(() => {
    if (!isOpen) return;

    const adaptTauriWindow = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const appWindow = getCurrentWindow();
          await appWindow.setAlwaysOnTop(isPinned);
        }
      } catch {
        // Ignore Tauri window API if in browser
      }
    };

    adaptTauriWindow();

    return () => {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
          const appWindow = getCurrentWindow();
          appWindow.setAlwaysOnTop(false).catch(() => {});
        }).catch(() => {});
      }
    };
  }, [isOpen, isPinned]);

  // Real-time lyric parsing
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

  // Window Dragging Handler for in-app mini floating widget
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 380, dragStartRef.current.startX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 140, dragStartRef.current.startY + dy)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen || !track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{
        right: `${position.x}px`,
        bottom: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
      className={`fixed z-[9990] w-[360px] bg-slate-950/90 text-white backdrop-blur-2xl border border-white/20 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-3 select-none transition-shadow ${
        isDragging ? 'shadow-2xl opacity-95 cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Top Header / Drag Strip */}
      <div className="flex items-center justify-between px-1 pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
          <Move className="w-3.5 h-3.5 text-slate-500" />
          <span className="tracking-wide">MINI PLAYER</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsPinned(!isPinned);
            }}
            className={`p-1 rounded-lg hover:bg-white/10 transition ${
              isPinned ? 'text-emerald-400' : 'text-slate-500'
            }`}
            title={isPinned ? '已置顶' : '点击置顶'}
          >
            {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenFullScreen();
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
            title="全屏模式"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
            title="还原完整窗口"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body: Artwork + Track details + Controls */}
      <div className="flex items-center gap-3 pt-2.5">
        {/* Cover Art with Vinyl Spin */}
        <div className="relative w-14 h-14 flex-shrink-0 rounded-2xl overflow-hidden shadow-md border border-white/15">
          <ImageWithFallback
            src={normalizeCoverUrl(track.coverUrl)}
            alt={track.title}
            className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}
          />
          <div className="absolute inset-0 bg-radial from-transparent to-black/40 pointer-events-none" />
        </div>

        {/* Center Details & Lyrics */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate max-w-[170px]">{track.title}</div>
              <div className="text-[11px] text-slate-400 truncate max-w-[170px]">{track.artist}</div>
            </div>
            <button
              onClick={() => {
                triggerHaptic('light');
                onToggleFavorite(track);
              }}
              className="p-1 text-slate-400 hover:text-red-400 transition flex-shrink-0"
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'text-red-400 fill-red-400' : ''}`} />
            </button>
          </div>

          {/* Real-time Scrolling Lyric */}
          <div className="h-4 overflow-hidden">
            <p className="text-[11px] text-emerald-400/90 font-medium truncate animate-in fade-in duration-150">
              {currentLyric || '♫ 享受音乐 ♫'}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div className="pt-2">
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            onSeek(ratio * duration);
          }}
          className="relative h-1.5 bg-white/15 rounded-full overflow-hidden cursor-pointer"
        >
          <div
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Compact Controls Row */}
      <div className="flex items-center justify-between pt-2 px-1">
        <span className="text-[10px] text-slate-500 font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              triggerHaptic('light');
              onPrev();
            }}
            className="p-1 rounded-full text-slate-300 hover:text-white transition"
          >
            <SkipBack className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={() => {
              triggerHaptic('medium');
              onTogglePlay();
            }}
            className="p-2 rounded-full bg-emerald-500 text-black hover:scale-105 active:scale-95 shadow-md shadow-emerald-500/30 transition"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              onNext();
            }}
            className="p-1 rounded-full text-slate-300 hover:text-white transition"
          >
            <SkipForward className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        {/* Volume Popover Trigger */}
        <div className="relative">
          <button
            onClick={() => onToggleMute()}
            onMouseEnter={() => setShowVolume(true)}
            className="p-1 text-slate-400 hover:text-white transition"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          {showVolume && (
            <div
              onMouseLeave={() => setShowVolume(false)}
              className="absolute bottom-6 right-0 bg-slate-900 border border-white/15 rounded-xl p-2 shadow-xl z-50 flex items-center gap-2"
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 accent-emerald-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
