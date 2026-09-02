import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, Plus, Shuffle, Sparkles } from 'lucide-react';
import { Track } from '../../types';
import { ImageWithFallback } from '../ImageWithFallback';
import { normalizeCoverUrl } from '../../utils/imageUtils';

interface BannerCarouselProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onShuffleAll: (tracks: Track[]) => void;
  onAddToQueue: (track: Track) => void;
}

/**
 * Hero banner carousel: 5s auto-advance, paused on hover / hidden tab /
 * prefers-reduced-motion. Pill pagination dots + fade transition.
 */
export const BannerCarousel: React.FC<BannerCarouselProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onShuffleAll,
  onAddToQueue,
}) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const count = tracks.length;

  useEffect(() => {
    if (count <= 1) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || paused || document.hidden) return;

    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, 5000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [count, paused]);

  useEffect(() => {
    const onVisibility = () => setPaused((p) => (document.hidden ? true : false));
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (count === 0) return null;
  const track = tracks[Math.min(index, count - 1)];
  const active = currentTrack?.id === track.id && isPlaying;

  return (
    <div
      className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background: blurred cover + gradient scrim (no backdrop-blur on scroll area) */}
      {tracks.map((t, i) => (
        <div
          key={t.id}
          className="absolute inset-0 transition-opacity duration-700 -z-10"
          style={{ opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
        >
          <div
            className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110"
            style={{ backgroundImage: `url(${normalizeCoverUrl(t.coverUrl)})` }}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/95 via-[#0a0a0f]/70 to-transparent -z-10" />

      {/* Left copy + CTAs */}
      <div className="max-w-xl space-y-4 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-emerald-300 border border-white/15 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 焦点新声 · 官方音源
          </span>
          <span className="text-xs text-slate-400 font-mono">{track.genre}</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight line-clamp-2">
          {track.title}
        </h2>
        <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
          {track.artist} · 《{track.album}》 高保真无损解析，带给你触及灵魂的听觉盛宴。
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => onPlayTrack(track)}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-100 text-black font-bold rounded-full shadow-xl transition transform hover:scale-105 active:scale-95"
          >
            {active ? (
              <>
                <Pause className="w-5 h-5 fill-current" /> <span>暂停播放</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" /> <span>立即播放</span>
              </>
            )}
          </button>
          <button
            onClick={() => onShuffleAll(tracks)}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full border border-white/15 transition"
          >
            <Shuffle className="w-5 h-5" /> <span>随机畅听</span>
          </button>
          <button
            onClick={() => onAddToQueue(track)}
            className="hidden sm:flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-full border border-white/10 transition"
            aria-label="加入播放队列"
          >
            <Plus className="w-4 h-4" /> <span className="text-sm">加入队列</span>
          </button>
        </div>
      </div>

      {/* Right: rotating vinyl disc */}
      <div className="relative shrink-0 hidden md:block">
        <div
          className={`h-52 w-52 rounded-full border-8 border-black/60 shadow-2xl overflow-hidden ${
            active ? 'animate-[spin_12s_linear_infinite]' : ''
          }`}
        >
          <ImageWithFallback
            src={normalizeCoverUrl(track.coverUrl)}
            alt={track.title}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 m-auto h-10 w-10 rounded-full bg-[#0a0a0f] border-2 border-white/20" />
      </div>

      {/* Pill pagination dots */}
      {count > 1 && (
        <div className="absolute bottom-4 left-6 sm:left-8 flex items-center gap-1.5">
          {tracks.map((t, i) => (
            <button
              key={t.id}
              aria-label={`切换到 ${t.title}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-emerald-400' : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
