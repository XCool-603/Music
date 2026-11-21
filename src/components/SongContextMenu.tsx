import React, { useEffect, useRef } from 'react';
import { Track } from '../types';
import {
  Play,
  ListPlus,
  ListStart,
  Heart,
  Download,
  Copy,
  Search,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export interface ContextMenuPosition {
  x: number;
  y: number;
  track: Track;
}

interface SongContextMenuProps {
  position: ContextMenuPosition | null;
  isFavorite: boolean;
  onClose: () => void;
  onPlay: (track: Track) => void;
  onPlayNext: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  onDownload?: (track: Track) => void;
  onSearchArtist?: (artist: string) => void;
}

export const SongContextMenu: React.FC<SongContextMenuProps> = ({
  position,
  isFavorite,
  onClose,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onToggleFavorite,
  onDownload,
  onSearchArtist,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [position, onClose]);

  if (!position) return null;

  const { x, y, track } = position;

  // Screen overflow adjustments
  const menuWidth = 220;
  const menuHeight = 310;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 12);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 12);

  const handleCopy = () => {
    triggerHaptic('light');
    const text = `${track.title} - ${track.artist}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-[9999] w-56 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-1.5 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100 select-none"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Track Header Header */}
      <div className="px-3 py-2 border-b border-white/10 mb-1">
        <div className="font-semibold text-white truncate max-w-[190px]">{track.title}</div>
        <div className="text-[11px] text-slate-400 truncate max-w-[190px]">{track.artist}</div>
      </div>

      {/* Action Items */}
      <button
        onClick={() => {
          triggerHaptic('light');
          onPlay(track);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-500/20 hover:text-emerald-300 transition text-left"
      >
        <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
        <span>立即播放</span>
      </button>

      <button
        onClick={() => {
          triggerHaptic('light');
          onPlayNext(track);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition text-left"
      >
        <ListStart className="w-3.5 h-3.5 text-cyan-400" />
        <span>下一首播放</span>
      </button>

      <button
        onClick={() => {
          triggerHaptic('light');
          onAddToQueue(track);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition text-left"
      >
        <ListPlus className="w-3.5 h-3.5 text-indigo-400" />
        <span>添加到播放队列</span>
      </button>

      <div className="h-px bg-white/10 my-1" />

      <button
        onClick={() => {
          triggerHaptic('light');
          onToggleFavorite(track);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition text-left"
      >
        <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'text-red-400 fill-red-400' : 'text-slate-400'}`} />
        <span>{isFavorite ? '取消喜欢' : '加入我喜欢的音乐'}</span>
      </button>

      {onDownload && (
        <button
          onClick={() => {
            triggerHaptic('light');
            onDownload(track);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition text-left"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>下载 / 离线缓存</span>
        </button>
      )}

      {onSearchArtist && (
        <button
          onClick={() => {
            triggerHaptic('light');
            onSearchArtist(track.artist);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition text-left"
        >
          <Search className="w-3.5 h-3.5 text-purple-400" />
          <span>搜索歌手作品</span>
        </button>
      )}

      <button
        onClick={handleCopy}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition text-left"
      >
        <Copy className="w-3.5 h-3.5 text-slate-400" />
        <span>复制歌曲与歌手名</span>
      </button>
    </div>
  );
};
