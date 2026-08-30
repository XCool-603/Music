import React, { useEffect, useRef, useState } from 'react';
import { Track } from '../types';
import { parseLRC, getActiveLyricIndex, formatTime } from '../utils/lyricsParser';
import { Play, Sparkles, Type } from 'lucide-react';

interface LyricsViewProps {
  track: Track;
  currentTime: number;
  onSeek: (seconds: number) => void;
  className?: string;
  isCompact?: boolean;
}

export const LyricsView: React.FC<LyricsViewProps> = ({
  track,
  currentTime,
  onSeek,
  className = '',
  isCompact = false,
}) => {
  const lyrics = React.useMemo(() => parseLRC(track.lyrics), [track.lyrics]);
  const activeIndex = getActiveLyricIndex(lyrics, currentTime);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Smooth scroll to active line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (lyrics.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center text-center p-8 text-neutral-400 ${className}`}>
        <Sparkles className="w-12 h-12 mb-3 text-neutral-500 opacity-60" />
        <p className="text-base font-medium">纯音乐 / 暂无歌词</p>
        <p className="text-xs text-neutral-500 mt-1">请尽情感受旋律的律动</p>
      </div>
    );
  }

  const fontClass = {
    sm: 'text-base leading-relaxed',
    md: 'text-lg md:text-xl leading-loose',
    lg: 'text-xl md:text-2xl leading-loose font-medium',
  }[fontSize];

  return (
    <div className={`relative flex flex-col h-full overflow-hidden select-none ${className}`}>
      {/* Control bar */}
      {!isCompact && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>LRC 毫秒级动态同步</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 text-[11px]">字号:</span>
            <div className="flex bg-neutral-800/80 rounded-lg p-0.5 border border-white/10">
              <button
                onClick={() => setFontSize('sm')}
                className={`px-2 py-0.5 rounded text-xs transition ${fontSize === 'sm' ? 'bg-indigo-600 text-white' : 'hover:text-white'}`}
              >
                小
              </button>
              <button
                onClick={() => setFontSize('md')}
                className={`px-2 py-0.5 rounded text-xs transition ${fontSize === 'md' ? 'bg-indigo-600 text-white' : 'hover:text-white'}`}
              >
                中
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-0.5 rounded text-xs transition ${fontSize === 'lg' ? 'bg-indigo-600 text-white' : 'hover:text-white'}`}
              >
                大
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lyrics scroll area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-24 space-y-6 scrollbar-none text-center transition-all"
        style={{ scrollBehavior: 'smooth' }}
      >
        {lyrics.map((line, idx) => {
          const isActive = idx === activeIndex;
          const isPassed = idx < activeIndex;

          return (
            <div
              key={`${line.time}-${idx}`}
              ref={isActive ? activeLineRef : null}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onSeek(line.time)}
              className={`group relative transition-all duration-300 cursor-pointer py-1.5 px-4 rounded-xl max-w-xl mx-auto ${
                isActive
                  ? 'scale-105 font-bold text-white shadow-sm'
                  : isPassed
                  ? 'text-neutral-400 opacity-60 hover:opacity-90'
                  : 'text-neutral-500 opacity-40 hover:opacity-80'
              }`}
            >
              {/* Active Glow indicator */}
              {isActive && (
                <div
                  className="absolute inset-0 rounded-xl -z-10 opacity-20 blur-md"
                  style={{ backgroundColor: track.themeColor || '#6366f1' }}
                />
              )}

              {/* Timestamp Hover Action */}
              {hoveredIdx === idx && (
                <span className="absolute -left-12 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-[11px] font-mono text-indigo-400 bg-neutral-900/90 px-1.5 py-0.5 rounded border border-indigo-500/30">
                  <Play className="w-2.5 h-2.5 fill-current" />
                  {formatTime(line.time)}
                </span>
              )}

              <p
                className={`${fontClass} tracking-wide transition-colors ${
                  isActive ? 'text-indigo-200 drop-shadow-sm' : ''
                }`}
                style={isActive && track.themeColor ? { color: '#ffffff' } : {}}
              >
                {line.text}
              </p>

              {line.translation && (
                <p className="text-xs text-neutral-400 mt-1 font-normal opacity-80">
                  {line.translation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
