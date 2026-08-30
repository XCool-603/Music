import React, { useState } from 'react';
import { Playlist, Track } from '../types';
import { formatTime } from '../utils/lyricsParser';
import { ImageWithFallback } from './ImageWithFallback';
import { normalizeCoverUrl } from '../utils/imageUtils';
import {
  Play,
  Pause,
  Shuffle,
  Clock,
  Heart,
  Plus,
  Trash2,
  Search,
  Volume2,
  Sparkles,
  ArrowLeft,
  Download,
} from 'lucide-react';

interface PlaylistDetailViewProps {
  playlist: Playlist;
  allTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: string[];
  onPlayTrack: (track: Track) => void;
  onPlayAll: (tracks: Track[]) => void;
  onShuffleAll: (tracks: Track[]) => void;
  onAddToQueue: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  onRemoveTrackFromPlaylist?: (playlistId: string, trackId: string) => void;
  onBack?: () => void;
  onOpenDownload?: (track: Track) => void;
  onBatchDownload?: (tracks: Track[]) => void;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  playlist,
  allTracks,
  currentTrack,
  isPlaying,
  favorites,
  onPlayTrack,
  onPlayAll,
  onShuffleAll,
  onAddToQueue,
  onToggleFavorite,
  onRemoveTrackFromPlaylist,
  onBack,
  onOpenDownload,
  onBatchDownload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Get tracks belonging to this playlist
  const playlistTracks = allTracks.filter((t) => playlist.trackIds.includes(t.id));
  const filteredTracks = playlistTracks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDuration = playlistTracks.reduce((acc, t) => acc + t.duration, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Back button on mobile */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 sm:p-8 rounded-3xl bg-neutral-900/80 border border-neutral-800/80 shadow-2xl relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 -z-10"
          style={{ backgroundImage: `url(${normalizeCoverUrl(playlist.coverUrl)})` }}
        />

        <ImageWithFallback
          src={normalizeCoverUrl(playlist.coverUrl)}
          alt={playlist.name}
          className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl object-cover shadow-2xl flex-shrink-0 border-2 border-white/10"
        />

        <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
              {playlist.isCustom ? '自建歌单' : '官方精选'}
            </span>
            {playlist.tags && (
              <span className="text-xs text-neutral-400">
                {playlist.tags.join(' · ')}
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white truncate">
            {playlist.name}
          </h2>

          <p className="text-xs sm:text-sm text-neutral-300 line-clamp-2 leading-relaxed">
            {playlist.description}
          </p>

          <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-neutral-400 font-mono">
            <span>{playlistTracks.length} 首歌曲</span>
            <span>·</span>
            <span>总时长 {Math.floor(totalDuration / 60)} 分钟</span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
            <button
              onClick={() => {
                if (playlistTracks.length > 0) onPlayAll(playlistTracks);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95 text-sm"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>播放全部</span>
            </button>

            <button
              onClick={() => {
                if (playlistTracks.length > 0) onShuffleAll(playlistTracks);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium rounded-xl border border-neutral-700 transition"
            >
              <Shuffle className="w-4 h-4 text-indigo-400" />
              <span>随机播放</span>
            </button>

            <button
              onClick={() => {
                if (playlistTracks.length > 0) {
                  if (onBatchDownload) onBatchDownload(playlistTracks);
                  else if (onOpenDownload) onOpenDownload(playlistTracks[0]);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-emerald-950/50 hover:text-emerald-300 text-neutral-200 text-sm font-medium rounded-xl border border-neutral-700 hover:border-emerald-500/30 transition"
              title="一键下载该歌单内的全部歌曲"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>下载全部 ({playlistTracks.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Playlist Tracks Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="在歌单内搜索歌曲或艺术家..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Tracks Table */}
      <div className="bg-neutral-900/60 rounded-3xl border border-neutral-800/80 overflow-hidden">
        {filteredTracks.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">该歌单暂无匹配歌曲</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/60">
            {filteredTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isFav = favorites.includes(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  className={`group flex items-center justify-between p-3 sm:px-5 hover:bg-neutral-800/60 transition cursor-pointer ${
                    isCurrent ? 'bg-indigo-600/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <span className="w-6 text-center text-xs font-mono font-bold text-neutral-500 flex-shrink-0">
                      {isCurrent ? (
                        isPlaying ? (
                          <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse mx-auto" />
                        ) : (
                          <Play className="w-4 h-4 text-indigo-400 mx-auto" />
                        )
                      ) : (
                        idx + 1
                      )}
                    </span>

                    <ImageWithFallback
                      src={normalizeCoverUrl(track.coverUrl)}
                      alt={track.title}
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-sm"
                    />

                    <div className="min-w-0 flex-1 pr-2">
                      <div className={`text-sm font-semibold truncate ${isCurrent ? 'text-indigo-300' : 'text-white'}`}>
                        {track.title}
                      </div>
                      <div className="text-xs text-neutral-400 truncate mt-0.5">
                        {track.artist}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDownload?.(track);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-emerald-400 rounded-lg hover:bg-neutral-700/60 transition"
                      title="下载音乐 / 歌词"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToQueue(track);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-700/60 transition"
                      title="加入队列"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(track);
                      }}
                      className={`p-1.5 rounded-lg transition ${
                        isFav ? 'text-pink-500' : 'text-neutral-500 hover:text-white'
                      }`}
                      title={isFav ? '取消喜欢' : '加入喜欢'}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>

                    {playlist.isCustom && onRemoveTrackFromPlaylist && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTrackFromPlaylist(playlist.id, track.id);
                        }}
                        className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg transition"
                        title="从歌单移出"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <span className="text-xs font-mono text-neutral-400 w-12 text-right">
                      {formatTime(track.duration)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
