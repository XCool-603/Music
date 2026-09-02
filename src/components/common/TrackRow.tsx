import React from 'react';
import { Download, Heart, ListPlus, Pause, Play, Plus } from 'lucide-react';
import { Track } from '../../types';
import { ImageWithFallback } from '../ImageWithFallback';
import { normalizeCoverUrl } from '../../utils/imageUtils';
import { formatTime } from '../../utils/lyricsParser';

/**
 * Shared, memoized track row used by Discover / Search / Toplist lists.
 * Pass booleans only — no derived arrays — so React.memo can skip re-renders.
 */

interface TrackRowProps {
  track: Track;
  index?: number;
  /** Top-N rank badge (compact-card only). */
  rank?: number;
  variant?: 'list-row' | 'compact-card';
  showSourceBadge?: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  isFavorite: boolean;
  onPlay: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onAddToPlaylist?: (track: Track) => void;
  onDownload?: (track: Track) => void;
}

function SourceBadge({ sourceKey }: { sourceKey?: string }) {
  const isWy = sourceKey === 'wy';
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none border shrink-0 ${
        isWy
          ? 'bg-red-500/15 text-red-300 border-red-500/25'
          : 'bg-sky-500/15 text-sky-300 border-sky-500/25'
      }`}
      title={isWy ? '网易云官方源' : '酷我官方源'}
    >
      {isWy ? '网' : '酷'}
    </span>
  );
}

const TrackRowBase: React.FC<TrackRowProps> = ({
  track,
  index,
  rank,
  variant = 'list-row',
  showSourceBadge = false,
  isCurrent,
  isPlaying,
  isFavorite,
  onPlay,
  onToggleFavorite,
  onAddToQueue,
  onAddToPlaylist,
  onDownload,
}) => {
  const active = isCurrent && isPlaying;

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay(track);
  };
  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(track);
  };

  if (variant === 'compact-card') {
    return (
      <div
        className={`group relative shrink-0 w-40 snap-start cursor-pointer rounded-2xl p-3 transition ${
          isCurrent ? 'bg-indigo-500/15 ring-1 ring-indigo-400/40' : 'bg-white/5 hover:bg-white/10'
        }`}
        onClick={handlePlay}
      >
        <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-black/30">
          <ImageWithFallback
            src={normalizeCoverUrl(track.coverUrl)}
            alt={track.title}
            className="h-full w-full object-cover"
          />
          <button
            onClick={handlePlay}
            aria-label={active ? '暂停' : '播放'}
            className={`absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all ${
              active
                ? 'bg-indigo-500 text-white'
                : 'bg-white text-black opacity-0 group-hover:opacity-100'
            }`}
          >
            {active ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {showSourceBadge && <SourceBadge sourceKey={track.sourceKey} />}
          <p className={`truncate text-sm font-semibold ${active ? 'text-indigo-300' : 'text-white'}`}>
            {track.title}
          </p>
        </div>
        <p className="truncate text-xs text-slate-400 mt-0.5">{track.artist}</p>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition cursor-pointer ${
        isCurrent ? 'bg-indigo-500/15' : 'hover:bg-white/5'
      }`}
      onClick={handlePlay}
    >
      {typeof index === 'number' && (
        <div className="w-7 shrink-0 text-center">
          {active ? (
            <div className="flex h-5 items-end justify-center gap-0.5" aria-label="正在播放">
              <span className="w-1 rounded bg-indigo-400 animate-[eqbar_0.9s_ease-in-out_infinite]" style={{ height: '60%' }} />
              <span className="w-1 rounded bg-indigo-400 animate-[eqbar_0.7s_ease-in-out_infinite]" style={{ height: '100%' }} />
              <span className="w-1 rounded bg-indigo-400 animate-[eqbar_1.1s_ease-in-out_infinite]" style={{ height: '45%' }} />
            </div>
          ) : (
            <span className={`text-sm font-semibold ${index! < 3 ? 'text-amber-400' : 'text-slate-500'}`}>
              {index! + 1}
            </span>
          )}
        </div>
      )}

      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-black/30">
        <ImageWithFallback
          src={normalizeCoverUrl(track.coverUrl)}
          alt={track.title}
          className="h-full w-full object-cover"
        />
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {active ? (
            <Pause className="h-5 w-5 fill-current text-white" />
          ) : (
            <Play className="h-5 w-5 fill-current text-white ml-0.5" />
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {showSourceBadge && <SourceBadge sourceKey={track.sourceKey} />}
          <p className={`truncate text-sm font-medium ${active ? 'text-indigo-300' : 'text-white'}`}>
            {track.title}
          </p>
        </div>
        <p className="truncate text-xs text-slate-400 mt-0.5">
          {track.artist} · {track.album}
        </p>
      </div>

      <span className="hidden sm:block shrink-0 text-xs text-slate-500 tabular-nums">
        {formatTime(track.duration || 0)}
      </span>

      <div
        className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleFavorite}
          aria-label={isFavorite ? '取消收藏' : '收藏'}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/10 ${
            isFavorite ? 'text-pink-400' : 'text-slate-400 hover:text-pink-300'
          }`}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
        {onAddToQueue && (
          <button
            onClick={() => onAddToQueue(track)}
            aria-label="加入队列"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <ListPlus className="h-4 w-4" />
          </button>
        )}
        {onAddToPlaylist && (
          <button
            onClick={() => onAddToPlaylist(track)}
            aria-label="收藏到歌单"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
        {onDownload && (
          <button
            onClick={() => onDownload(track)}
            aria-label="下载"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export const TrackRow = React.memo(TrackRowBase);
