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
  if (sourceKey === 'itunes') {
    return (
      <span
        className="px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none border shrink-0 bg-purple-500/15 text-purple-300 border-purple-500/25"
        title="iTunes 试听源 (30秒)"
      >
        果
      </span>
    );
  }
  const isWy = sourceKey === 'wy' || sourceKey === 'netease';
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
      className={`group relative grid grid-cols-[28px_40px_minmax(0,1fr)_auto] sm:grid-cols-[28px_40px_minmax(0,2fr)_minmax(0,1fr)_auto_auto] md:grid-cols-[28px_40px_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition cursor-pointer ${
        isCurrent ? 'bg-indigo-500/15' : 'hover:bg-white/5'
      }`}
      onDoubleClick={handlePlay}
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
            <span className={`text-xs tabular-nums ${index! < 3 ? 'text-amber-400' : 'text-slate-500'}`}>
              {index! + 1}
            </span>
          )}
        </div>
      )}

      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-black/30">
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
            <Pause className="h-4 w-4 fill-current text-white" />
          ) : (
            <Play className="h-4 w-4 fill-current text-white ml-0.5" />
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
        <p className="truncate text-xs text-slate-400 mt-0.5 sm:hidden">
          {track.artist} · {track.album}
        </p>
      </div>

      <p className="hidden sm:block min-w-0 truncate text-xs text-slate-400">{track.artist}</p>
      <p className="hidden md:block min-w-0 truncate text-xs text-slate-500">{track.album}</p>

      <span className="shrink-0 text-xs text-slate-500 tabular-nums">
        {formatTime(track.duration || 0)}
      </span>

      <div
        className="absolute right-2 sm:static flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleFavorite}
          aria-label={isFavorite ? '取消收藏' : '收藏'}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-white/10 ${
            isFavorite ? 'text-pink-400' : 'text-slate-400 hover:text-pink-300'
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
        {onAddToQueue && (
          <button
            onClick={() => onAddToQueue(track)}
            aria-label="加入队列"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <ListPlus className="h-3.5 w-3.5" />
          </button>
        )}
        {onAddToPlaylist && (
          <button
            onClick={() => onAddToPlaylist(track)}
            aria-label="收藏到歌单"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        {onDownload && (
          <button
            onClick={() => onDownload(track)}
            aria-label="下载"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const TrackRow = React.memo(TrackRowBase);
