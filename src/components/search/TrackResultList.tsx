import React from 'react';
import { Track } from '../../types';
import { TrackRow } from '../common/TrackRow';

interface TrackResultListProps {
  tracks: Track[];
  title: string;
  titleIcon: React.ReactNode;
  titleExtra?: React.ReactNode;
  action?: React.ReactNode;
  startIndex?: number;
  showSourceBadge?: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: string[];
  onPlayTrack: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onAddToPlaylist: (track: Track) => void;
  onDownload?: (track: Track) => void;
}

/**
 * 歌曲结果列表：TrackRow 集合 + 标题行（含数量与可选操作按钮）。
 */
export const TrackResultList: React.FC<TrackResultListProps> = ({
  tracks,
  title,
  titleIcon,
  titleExtra,
  action,
  startIndex = 0,
  showSourceBadge = false,
  currentTrack,
  isPlaying,
  favorites,
  onPlayTrack,
  onToggleFavorite,
  onAddToQueue,
  onAddToPlaylist,
  onDownload,
}) => {
  if (tracks.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-bold text-base">
          {titleIcon}
          <span>{title}</span>
          {titleExtra}
        </div>
        {action}
      </div>

      <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-xl">
        <div className="divide-y divide-white/5">
          {tracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={startIndex + idx}
              showSourceBadge={showSourceBadge}
              isCurrent={currentTrack?.id === track.id}
              isPlaying={isPlaying}
              isFavorite={favorites.includes(track.id)}
              onPlay={onPlayTrack}
              onToggleFavorite={onToggleFavorite}
              onAddToQueue={onAddToQueue}
              onAddToPlaylist={onAddToPlaylist}
              onDownload={onDownload}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
