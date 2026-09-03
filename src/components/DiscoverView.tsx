import React, { useMemo, useState } from 'react';
import { ListMusic, Music, Sparkles } from 'lucide-react';
import { Track, Playlist } from '../types';
import { GENRE_CATEGORIES } from '../data/discoveryData';
import { BannerCarousel } from './discover/BannerCarousel';
import { QuickEntry } from './discover/QuickEntry';
import { PlaylistSection } from './discover/PlaylistSection';
import { ToplistSection } from './discover/ToplistSection';
import { RecentSection } from './discover/RecentSection';

interface DiscoverViewProps {
  tracks: Track[];
  playlists: Playlist[];
  heroTracks: Track[];
  recentHistory: string[];
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: string[];
  onPlayTrack: (track: Track) => void;
  onPlayAll: (tracks: Track[]) => void;
  onShuffleAll: (tracks: Track[]) => void;
  onAddToQueue: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenAddToPlaylistModal: (track: Track) => void;
  onOpenDownload?: (track: Track) => void;
  onNavigateSearch: (keyword: string) => void;
  onNavigate: (path: string) => void;
}

/** Date-seeded deterministic shuffle so "每日推荐" is stable within a day. */
function pickDaily(tracks: Track[], count: number): Track[] {
  if (tracks.length <= count) return [...tracks];
  const daySeed = Math.floor(Date.now() / 86400000);
  const scored = tracks.map((t, i) => {
    let h = (daySeed * 2654435761 + i * 40503) >>> 0;
    h ^= h >>> 13;
    h = (h * 1274126177) >>> 0;
    return { t, k: h };
  });
  return scored.sort((a, b) => a.k - b.k).slice(0, count).map((s) => s.t);
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  tracks,
  playlists,
  heroTracks,
  recentHistory,
  currentTrack,
  isPlaying,
  favorites,
  onPlayTrack,
  onPlayAll,
  onShuffleAll,
  onAddToQueue,
  onToggleFavorite,
  onSelectPlaylist,
  onOpenAddToPlaylistModal,
  onOpenDownload,
  onNavigateSearch,
  onNavigate,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const selectedCategory = GENRE_CATEGORIES.find((c) => c.id === selectedCategoryId) || GENRE_CATEGORIES[0];

  const filteredTracks = useMemo(() => {
    if (!selectedCategory.filterKeywords.length) return tracks.slice(0, 16);
    const kw = selectedCategory.filterKeywords[0].toLowerCase();
    return tracks
      .filter(
        (t) =>
          t.genre?.toLowerCase().includes(kw) ||
          t.title?.toLowerCase().includes(kw) ||
          t.artist?.toLowerCase().includes(kw)
      )
      .slice(0, 16);
  }, [tracks, selectedCategory]);

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDailyRecommend = () => {
    const picks = pickDaily(tracks, 20);
    if (picks.length > 0) onPlayAll(picks);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Hero banner carousel (official-source hero tracks) */}
      <BannerCarousel
        tracks={heroTracks.length > 0 ? heroTracks : tracks.slice(0, 3)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayTrack={onPlayTrack}
        onShuffleAll={onShuffleAll}
        onAddToQueue={onAddToQueue}
      />

      {/* 2. Quick entry tiles */}
      <QuickEntry
        onDailyRecommend={handleDailyRecommend}
        onNavigate={onNavigate}
        scrollToId={scrollToId}
      />

      {/* 3. Genre pills (collapsed row) */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {GENRE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              if (cat.filterKeywords.length > 0) {
                setSelectedCategoryId(cat.id);
                onNavigateSearch(cat.filterKeywords[0]);
              } else {
                setSelectedCategoryId(cat.id);
              }
            }}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition ${
              selectedCategoryId === cat.id
                ? 'bg-indigo-500 border-indigo-400 text-white shadow shadow-indigo-900/40'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 4. Official toplist (v2 API) */}
      <ToplistSection
        favorites={favorites}
        localTracks={tracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayTrack={onPlayTrack}
        onPlayAll={onPlayAll}
        onAddToQueue={onAddToQueue}
        onToggleFavorite={onToggleFavorite}
        onOpenAddToPlaylistModal={onOpenAddToPlaylistModal}
        onOpenDownload={onOpenDownload}
      />

      {/* 5. Curated playlists */}
      <PlaylistSection
        playlists={playlists}
        tracks={tracks}
        loading={false}
        onSelectPlaylist={onSelectPlaylist}
        onPlayPlaylistFirst={(pl) => {
          const first = pl.trackIds
            .map((id) => tracks.find((t) => t.id === id))
            .find((t): t is Track => Boolean(t));
          if (first) onPlayTrack(first);
        }}
      />

      {/* 6. Recently played (hidden when empty) */}
      <RecentSection
        recentHistory={recentHistory}
        tracks={tracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        favorites={favorites}
        onPlayTrack={onPlayTrack}
        onAddToQueue={onAddToQueue}
        onToggleFavorite={onToggleFavorite}
        onOpenAddToPlaylistModal={onOpenAddToPlaylistModal}
        onOpenDownload={onOpenDownload}
      />

      {/* 7. Category tracks (compact grid for the selected pill) */}
      {filteredTracks.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <Music className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">{selectedCategory.name}</h3>
            <Sparkles className="w-4 h-4 text-slate-500 ml-auto" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filteredTracks.map((track) => (
              <button
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className={`group text-left rounded-2xl p-3 transition cursor-pointer ${
                  currentTrack?.id === track.id
                    ? 'bg-indigo-500/15 ring-1 ring-indigo-400/40'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="mb-2 aspect-square overflow-hidden rounded-xl bg-black/30">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className={`truncate text-sm font-semibold ${currentTrack?.id === track.id ? 'text-indigo-300' : 'text-white'}`}>
                  {track.title}
                </p>
                <p className="truncate text-xs text-slate-400 mt-0.5">{track.artist}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-500">
        <ListMusic className="w-3.5 h-3.5" />
        <span>音源来自酷我音乐 / 网易云音乐官方接口 · 仅供个人欣赏</span>
      </div>
    </div>
  );
};
