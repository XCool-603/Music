import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { Track } from '../../types';
import { TrackRow } from '../common/TrackRow';
import { SectionHeader } from '../common/SectionHeader';
import { HorizontalScroller } from '../common/HorizontalScroller';

interface RecentSectionProps {
  recentHistory: string[];
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: string[];
  onPlayTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  onOpenAddToPlaylistModal?: (track: Track) => void;
  onOpenDownload?: (track: Track) => void;
}

/** Recently played, derived from history ids. Hidden when empty. */
export const RecentSection: React.FC<RecentSectionProps> = ({
  recentHistory,
  tracks,
  currentTrack,
  isPlaying,
  favorites,
  onPlayTrack,
  onAddToQueue,
  onToggleFavorite,
  onOpenAddToPlaylistModal,
  onOpenDownload,
}) => {
  const recentTracks = useMemo((): Track[] => {
    const byId = new Map<string, Track>(tracks.map((t) => [t.id, t]));
    const seen = new Set<string>();
    const result: Track[] = [];
    for (const id of recentHistory) {
      if (seen.has(id)) continue;
      const t = byId.get(id);
      if (t) {
        seen.add(id);
        result.push(t);
      }
    }
    return result;
  }, [recentHistory, tracks]);

  if (recentTracks.length === 0) return null;

  return (
    <section>
      <SectionHeader icon={<Clock className="w-5 h-5" />} title="最近播放" subtitle="接着上次继续听" />
      <HorizontalScroller>
        {recentTracks.slice(0, 12).map((track) => (
          <TrackRow
            key={track.id}
            track={track}
            variant="compact-card"
            showSourceBadge
            isCurrent={currentTrack?.id === track.id}
            isPlaying={isPlaying}
            isFavorite={favorites.includes(track.id)}
            onPlay={onPlayTrack}
            onToggleFavorite={onToggleFavorite}
            onAddToQueue={onAddToQueue}
            onAddToPlaylist={onOpenAddToPlaylistModal}
            onDownload={onOpenDownload}
          />
        ))}
      </HorizontalScroller>
    </section>
  );
};
