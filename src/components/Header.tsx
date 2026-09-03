import React, { useState, useRef, useEffect } from 'react';
import { Track } from '../types';
import { Search, X, Keyboard, ShieldCheck } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { normalizeCoverUrl } from '../utils/imageUtils';

interface HeaderProps {
  tracks: Track[];
  onPlayTrack: (track: Track) => void;
  onOpenMobileMenu?: () => void;
  onOpenEQ: () => void;
  onNavigateToSearch?: (query?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  tracks,
  onPlayTrack,
  onNavigateToSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const shortcutsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showShortcuts) return;
    const onDocClick = (e: MouseEvent) => {
      if (shortcutsRef.current && !shortcutsRef.current.contains(e.target as Node)) {
        setShowShortcuts(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowShortcuts(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showShortcuts]);

  const safeSearch = (searchQuery || '').trim();
  const searchResults = safeSearch
    ? tracks.filter(
        (t) =>
          (t.title || '').toLowerCase().includes(safeSearch.toLowerCase()) ||
          (t.artist || '').toLowerCase().includes(safeSearch.toLowerCase()) ||
          (t.genre || '').toLowerCase().includes(safeSearch.toLowerCase()) ||
          (t.album || '').toLowerCase().includes(safeSearch.toLowerCase())
      )
    : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (onNavigateToSearch) {
        onNavigateToSearch(safeSearch);
        setIsSearchFocused(false);
      }
    }
  };

  return (
    <header className="h-16 border-b border-white/10 bg-black/20 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between gap-4 select-none relative z-20">
      {/* Search Input Box with Frosted Glass styling */}
      <div className="relative flex-1 max-w-md">
        <div className="relative flex items-center bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 backdrop-blur-md focus-within:border-emerald-400/50 focus-within:bg-white/10 transition shadow-inner">
          <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
            placeholder="搜索歌曲、艺术家、专辑、曲风 (按 Enter 搜索)..."
            className="bg-transparent border-none outline-none text-xs text-slate-100 placeholder:text-slate-500 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-white p-0.5 ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Popup Dropdown */}
        {isSearchFocused && safeSearch && (
          <div className="absolute left-0 right-0 top-12 bg-black/80 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                实时匹配 ({searchResults.length})
              </span>
              {onNavigateToSearch && (
                <button
                  onMouseDown={() => onNavigateToSearch(safeSearch)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  进入搜索页查看全部 →
                </button>
              )}
            </div>

            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                未找到匹配的音乐，按 Enter 在全能搜索页查找
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin">
                {searchResults.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => {
                      onPlayTrack(track);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/10 transition cursor-pointer group"
                  >
                    <ImageWithFallback
                      src={normalizeCoverUrl(track.coverUrl)}
                      alt={track.title}
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0 ring-1 ring-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition truncate">
                        {track.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {track.artist} · {track.genre}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Keyboard Shortcuts dropdown */}
        <div className="relative" ref={shortcutsRef}>
          <button
            onClick={() => setShowShortcuts((prev) => !prev)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition relative"
            title="键盘快捷键"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {showShortcuts && (
            <div
              className="absolute right-0 top-10 w-64 bg-black/90 border border-white/15 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl z-50"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-indigo-400" />
                  <h4 className="font-bold text-white text-xs">键盘快捷键</h4>
                </div>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="p-0.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">播放 / 暂停</span>
                  <kbd className="px-2 py-0.5 bg-white/10 rounded font-mono text-slate-200 border border-white/15">Space</kbd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">快进 / 快退 5 秒</span>
                  <kbd className="px-2 py-0.5 bg-white/10 rounded font-mono text-slate-200 border border-white/15">← / →</kbd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">音量调节</span>
                  <kbd className="px-2 py-0.5 bg-white/10 rounded font-mono text-slate-200 border border-white/15">↑ / ↓</kbd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">静音切换</span>
                  <kbd className="px-2 py-0.5 bg-white/10 rounded font-mono text-slate-200 border border-white/15">M</kbd>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">沉浸全屏模式</span>
                  <kbd className="px-2 py-0.5 bg-white/10 rounded font-mono text-slate-200 border border-white/15">F</kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audio Quality indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Hi-Fi 32bit FP</span>
        </div>

        {/* User profile avatar badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-400 p-[1px] shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="User avatar"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>
      </div>

    </header>
  );
};
