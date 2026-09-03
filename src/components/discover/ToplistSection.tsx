import React, { useMemo, useState } from 'react';
import { Flame, Sparkles, Trophy } from 'lucide-react';
import { Track } from '../../types';
import { v2Toplist, type ToplistCategory } from '../../utils/apiV2';
import { useAsyncData } from '../../utils/useAsyncData';
import { TrackRow } from '../common/TrackRow';
import { SectionHeader } from '../common/SectionHeader';
import { SkeletonRow } from '../common/Skeleton';
import { HorizontalScroller } from '../common/HorizontalScroller';

interface ToplistSectionProps {
  favorites: string[];
  localTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onPlayAll: (tracks: Track[]) => void;
  onAddToQueue: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  onOpenAddToPlaylistModal?: (track: Track) => void;
  onOpenDownload?: (track: Track) => void;
}

const TABS: { key: ToplistCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'hot', label: '热歌榜', icon: <Flame className="w-3.5 h-3.5" /> },
  { key: 'new', label: '新歌榜', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: 'rise', label: '飙升榜', icon: <Trophy className="w-3.5 h-3.5" /> },
];

/**
 * Official toplist (v2 API): tabs hot/new/rise, gold-silver-bronze top-3 hero
 * cards + ranked rows 4-10. Silently degrades to local curated tracks.
 */
export const ToplistSection: React.FC<ToplistSectionProps> = ({
  favorites,
  localTracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onPlayAll,
  onAddToQueue,
  onToggleFavorite,
  onOpenAddToPlaylistModal,
  onOpenDownload,
}) => {
  const [category, setCategory] = useState<ToplistCategory>('hot');
  const { data, loading } = useAsyncData(
    () => v2Toplist('netease', category, 10),
    [category]
  );

  const tracks = useMemo(() => {
    if (data && data.length > 0) return data;
    // Degrade: reuse local curated tracks so the section is never empty.
    return localTracks.slice(category === 'new' ? 5 : 0, 10);
  }, [data, localTracks, category]);

  const degraded = !loading && (!data || data.length === 0);
  const top3 = tracks.slice(0, 3);
  const rest = tracks.slice(3, 10);

  return (
    <section id="discover-toplist" className="scroll-mt-24">
      <SectionHeader
        icon={<Trophy className="w-5 h-5" />}
        title="官方排行榜"
        subtitle={degraded ? '精选推荐' : '网易云官方榜单 · 实时更新'}
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full bg-white/5 border border-white/10 p-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setCategory(t.key)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    category === t.key
                      ? 'bg-indigo-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            {tracks.length > 0 && (
              <button
                onClick={() => onPlayAll(tracks)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black text-xs font-bold transition hover:bg-slate-200"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M8 5v14l11-7z" /></svg>
                播放全部
              </button>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top 3 hero cards */}
          <HorizontalScroller>
            {top3.map((track, i) => (
              <TrackRow
                key={`top-${track.id}`}
                track={track}
                variant="compact-card"
                rank={i}
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

          {/* Rows 4-10 */}
          <div className="space-y-1">
            {rest.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i + 3}
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
          </div>
        </div>
      )}
    </section>
  );
};
