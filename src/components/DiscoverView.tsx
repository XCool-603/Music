import React, { useState, useMemo } from 'react';
import { Track, Playlist } from '../types';
import { GENRE_CATEGORIES, getHeroTracks, getTrendingTracks, filterTracksByGenre } from '../data/discoveryData';
import { formatTime } from '../utils/lyricsParser';
import { ImageWithFallback } from './ImageWithFallback';
import { normalizeCoverUrl } from '../utils/imageUtils';
import {
  Play,
  Pause,
  Plus,
  Heart,
  Sparkles,
  Flame,
  Clock,
  ListPlus,
  Shuffle,
  Volume2,
  Headphones,
  Check,
  Download,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DiscoverViewProps {
  tracks: Track[];
  playlists: Playlist[];
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
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  tracks,
  playlists,
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
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [heroIndex, setHeroIndex] = useState(0);

  const heroTracks = useMemo(() => getHeroTracks(), []);
  const trendingTracks = useMemo(() => getTrendingTracks(), []);
  const featuredTrack = heroTracks[heroIndex] || heroTracks[0];

  const selectedCategory = GENRE_CATEGORIES.find((c) => c.id === selectedCategoryId) || GENRE_CATEGORIES[0];

  const filteredTracks = useMemo(
    () => filterTracksByGenre(trendingTracks, selectedCategory),
    [trendingTracks, selectedCategory]
  );

  const handleFavorite = (track: Track) => {
    const isFav = favorites.includes(track.id);
    if (!isFav) {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#ec4899', '#a855f7'],
      });
    }
    onToggleFavorite(track);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Featured Hero Banner */}
      {featuredTrack && (
        <div className="relative rounded-3xl overflow-hidden bg-black/40 border border-white/10 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Ambient Glow */}
          <div
            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-25 -z-10 scale-110"
            style={{ backgroundImage: `url(${normalizeCoverUrl(featuredTrack.coverUrl)})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent -z-10" />

          {/* Left Text & Call-To-Action */}
          <div className="max-w-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-emerald-300 border border-white/15 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 焦点新声 · 精选首播
              </span>
              <span className="text-xs text-slate-400 font-mono">{featuredTrack.genre}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {featuredTrack.title}
            </h2>

            <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
              由 {featuredTrack.artist} 倾情呈现，收录于《{featuredTrack.album}》，高保真无损解析，带给你触及灵魂的听觉盛宴。
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onPlayTrack(featuredTrack)}
                className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-100 text-black font-bold rounded-full shadow-xl shadow-white/10 transition transform hover:scale-105 active:scale-95"
              >
                {currentTrack?.id === featuredTrack.id && isPlaying ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" />
                    <span>暂停播放</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                    <span>立即试听</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onPlayAll(tracks)}
                className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-full border border-white/15 backdrop-blur-md transition"
              >
                <Shuffle className="w-4 h-4 text-emerald-400" />
                <span>随机播放全部</span>
              </button>
            </div>
          </div>

          {/* Right Album Artwork with disc ring */}
          <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => onPlayTrack(featuredTrack)}>
            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 relative backdrop-blur-sm">
              <ImageWithFallback
                src={normalizeCoverUrl(featuredTrack.coverUrl)}
                alt={featuredTrack.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center backdrop-blur-xs">
                <div className="p-4 bg-white text-black rounded-full shadow-lg font-bold">
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </div>
              </div>
            </div>

            {/* Pagination dots for banner */}
            <div className="flex justify-center gap-2 mt-3">
              {heroTracks.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setHeroIndex(i);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    heroIndex === i ? 'w-6 bg-emerald-400' : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Genre Filter Pills */}
      <div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {GENRE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition flex items-center gap-2 ${
                selectedCategoryId === cat.id
                  ? 'bg-white text-black font-bold shadow-lg shadow-white/10 border border-white'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10 backdrop-blur-md'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured Playlists Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xl font-bold text-white">推荐歌单</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">精心挑选与编辑</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl)}
              className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-3xl p-3.5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl backdrop-blur-xl shadow-black/40"
            >
              {/* Cover with hover play button */}
              <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 bg-white/5 ring-1 ring-white/10">
                <ImageWithFallback
                  src={normalizeCoverUrl(pl.coverUrl)}
                  alt={pl.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const plTracks = tracks.filter((t) => pl.trackIds.includes(t.id));
                    if (plTracks.length > 0) onPlayAll(plTracks);
                  }}
                  className="absolute bottom-2 right-2 p-3 bg-white text-black rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 font-bold"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>

              <h4 className="text-sm font-semibold text-white truncate group-hover:text-emerald-300 transition">
                {pl.name}
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                {pl.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Trending Music Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xl font-bold text-white">热播榜单 · 新歌速递</h3>
          </div>
          <button
            onClick={() => onPlayAll(filteredTracks)}
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            播放本组全部 ({filteredTracks.length})
          </button>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="divide-y divide-white/5">
            {filteredTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isFav = favorites.includes(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  className={`group flex items-center justify-between p-3 sm:px-5 hover:bg-white/10 transition cursor-pointer ${
                    isCurrent ? 'bg-white/10' : ''
                  }`}
                >
                  {/* Left info */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <span className="w-6 text-center text-xs font-mono font-bold text-slate-500 flex-shrink-0">
                      {isCurrent ? (
                        isPlaying ? (
                          <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse mx-auto" />
                        ) : (
                          <Play className="w-4 h-4 text-emerald-400 mx-auto" />
                        )
                      ) : (
                        idx + 1
                      )}
                    </span>

                    <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 shadow-sm bg-white/5 ring-1 ring-white/10">
                      <ImageWithFallback
                        src={normalizeCoverUrl(track.coverUrl)}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1 pr-2">
                      <div className={`text-sm font-semibold truncate ${isCurrent ? 'text-emerald-300' : 'text-white'}`}>
                        {track.title}
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {track.artist} · <span className="text-slate-500">{track.album}</span>
                      </div>
                    </div>
                  </div>

                  {/* Genre Tag (hidden on small mobile) */}
                  <div className="hidden md:block w-32 text-xs text-slate-400 truncate">
                    {track.genre}
                  </div>

                  {/* Actions & Duration */}
                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDownload?.(track);
                      }}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-white/10 transition"
                      title="下载音乐 / 歌词"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToQueue(track);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
                      title="添加到播放队列"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAddToPlaylistModal(track);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition hidden sm:block"
                      title="收藏到歌单"
                    >
                      <ListPlus className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFavorite(track);
                      }}
                      className={`p-1.5 rounded-lg transition ${
                        isFav ? 'text-pink-400' : 'text-slate-500 hover:text-white'
                      }`}
                      title={isFav ? '取消喜欢' : '加入喜欢'}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>

                    <span className="text-xs font-mono text-slate-400 w-12 text-right">
                      {formatTime(track.duration)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
