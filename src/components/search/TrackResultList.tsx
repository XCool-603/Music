import React, { useMemo } from 'react';
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

const TrackResultListInner: React.FC<TrackResultListProps> = ({
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
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const currentId = useMemo(() => currentTrack?.id ?? null, [currentTrack]);

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
              isCurrent={currentId === track.id}
              isPlaying={isPlaying}
              isFavorite={favSet.has(track.id)}
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

export const TrackResultList = React.memo(TrackResultListInner);
