import React from 'react';
import { ListMusic } from 'lucide-react';
import { Playlist, Track } from '../../types';
import { ImageWithFallback } from '../ImageWithFallback';
import { SectionHeader } from '../common/SectionHeader';
import { HorizontalScroller } from '../common/HorizontalScroller';
import { SkeletonCard } from '../common/Skeleton';

interface PlaylistSectionProps {
  playlists: Playlist[];
  tracks: Track[];
  loading: boolean;
  onSelectPlaylist: (playlist: Playlist) => void;
  onPlayPlaylistFirst: (playlist: Playlist) => void;
}

/**
 * Horizontal playlist cards. Card click → detail; play button → play first
 * track of the playlist without navigating (stopPropagation).
 */
export const PlaylistSection: React.FC<PlaylistSectionProps> = ({
  playlists,
  tracks,
  loading,
  onSelectPlaylist,
  onPlayPlaylistFirst,
}) => {
  if (loading) {
    return (
      <section>
        <SectionHeader icon={<ListMusic className="w-5 h-5" />} title="精选歌单" subtitle="由编辑每日甄选" />
        <HorizontalScroller>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </HorizontalScroller>
      </section>
    );
  }

  if (playlists.length === 0) return null;

  return (
    <section id="discover-playlists" className="scroll-mt-24">
      <SectionHeader icon={<ListMusic className="w-5 h-5" />} title="精选歌单" subtitle="由编辑每日甄选" />
      <HorizontalScroller>
        {playlists.map((pl) => {
          const firstTrack = pl.trackIds
            .map((id) => tracks.find((t) => t.id === id))
            .find((t): t is Track => Boolean(t));
          return (
            <div
              key={pl.id}
              className="group relative shrink-0 w-40 snap-start cursor-pointer rounded-2xl bg-white/5 hover:bg-white/10 p-3 transition"
              onClick={() => onSelectPlaylist(pl)}
            >
              <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-black/30">
                <ImageWithFallback src={pl.coverUrl} alt={pl.name} className="h-full w-full object-cover" />
                {firstTrack && (
                  <button
                    aria-label="播放歌单"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayPlaylistFirst(pl);
                    }}
                    className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current ml-0.5">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="truncate text-sm font-semibold text-white">{pl.name}</p>
              <p className="truncate text-xs text-slate-400 mt-0.5">
                {pl.tags?.slice(0, 2).join(' · ') || `${pl.trackIds.length} 首`}
              </p>
            </div>
          );
        })}
      </HorizontalScroller>
    </section>
  );
};
