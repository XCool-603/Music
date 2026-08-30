import React, { useState } from 'react';
import { Track, Playlist } from '../types';
import { formatTime } from '../utils/lyricsParser';
import { ImageWithFallback } from './ImageWithFallback';
import { normalizeCoverUrl } from '../utils/imageUtils';
import {
  Heart,
  ListMusic,
  Upload,
  History,
  Play,
  Plus,
  Trash2,
  Sparkles,
  Music,
  Volume2,
  Download,
} from 'lucide-react';

interface LibraryViewProps {
  tracks: Track[];
  playlists: Playlist[];
  favorites: string[];
  recentHistory: string[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onPlayAll: (tracks: Track[]) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenCreatePlaylist: () => void;
  onToggleFavorite: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onOpenLocalImport: () => void;
  onOpenDownload?: (track: Track) => void;
  defaultSubTab?: 'favorites' | 'playlists' | 'local' | 'history';
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  tracks,
  playlists,
  favorites,
  recentHistory,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onPlayAll,
  onSelectPlaylist,
  onOpenCreatePlaylist,
  onToggleFavorite,
  onAddToQueue,
  onOpenLocalImport,
  onOpenDownload,
  defaultSubTab = 'favorites',
}) => {
  const [subTab, setSubTab] = useState<'favorites' | 'playlists' | 'local' | 'history'>(defaultSubTab);

  const favoriteTracks = tracks.filter((t) => favorites.includes(t.id));
  const localTracks = tracks.filter((t) => t.isLocal);
  const historyTracks = recentHistory
    .map((id) => tracks.find((t) => t.id === id))
    .filter((t): t is Track => !!t);

  const currentList =
    subTab === 'favorites'
      ? favoriteTracks
      : subTab === 'local'
      ? localTracks
      : historyTracks;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div>
          <h2 className="text-2xl font-bold text-white">我的音乐库</h2>
          <p className="text-xs text-neutral-400 mt-1">专属收藏、自定义歌单与本地文件管理</p>
        </div>

        {/* Sub tabs */}
        <div className="flex items-center bg-neutral-900 p-1 rounded-2xl border border-neutral-800 text-xs overflow-x-auto scrollbar-none">
          <button
            onClick={() => setSubTab('favorites')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
              subTab === 'favorites' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <span>我喜欢的 ({favoriteTracks.length})</span>
          </button>

          <button
            onClick={() => setSubTab('playlists')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
              subTab === 'playlists' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>自建歌单 ({playlists.length})</span>
          </button>

          <button
            onClick={() => setSubTab('local')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
              subTab === 'local' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>本地导入 ({localTracks.length})</span>
          </button>

          <button
            onClick={() => setSubTab('history')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
              subTab === 'history' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>最近播放</span>
          </button>
        </div>
      </div>

      {/* Playlists View */}
      {subTab === 'playlists' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">歌单列表</h3>
            <button
              onClick={onOpenCreatePlaylist}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              新建歌单
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Create new card */}
            <div
              onClick={onOpenCreatePlaylist}
              className="border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition group min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-neutral-800 group-hover:bg-indigo-600 text-neutral-400 group-hover:text-white flex items-center justify-center transition mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-neutral-300 group-hover:text-white">
                新建歌单
              </span>
              <span className="text-xs text-neutral-500 mt-1">创建属于你的音乐集合</span>
            </div>

            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => onSelectPlaylist(pl)}
                className="group relative bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/80 rounded-2xl p-3 cursor-pointer transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-neutral-800">
                  <ImageWithFallback
                    src={normalizeCoverUrl(pl.coverUrl)}
                    alt={pl.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <div className="p-3 bg-indigo-600 rounded-full text-white shadow-lg">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-white truncate">{pl.name}</h4>
                <p className="text-xs text-neutral-400 mt-1 font-mono">{pl.trackIds.length} 首单曲</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Track list representation for Favorites, Local, History */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-400 font-medium">
              共 <span className="text-white font-bold">{currentList.length}</span> 首歌曲
            </div>
            {currentList.length > 0 && (
              <button
                onClick={() => onPlayAll(currentList)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                播放全部
              </button>
            )}
          </div>

          {currentList.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/40 rounded-3xl border border-neutral-800/60">
              <Music className="w-10 h-10 mx-auto text-neutral-600 mb-3" />
              <p className="text-base text-neutral-400 font-medium">暂无歌曲</p>
              {subTab === 'local' && (
                <button
                  onClick={onOpenLocalImport}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-500 transition"
                >
                  立即导入本地音乐
                </button>
              )}
            </div>
          ) : (
            <div className="bg-neutral-900/60 rounded-3xl border border-neutral-800/80 overflow-hidden divide-y divide-neutral-800/60">
              {currentList.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                const isFav = favorites.includes(track.id);

                return (
                  <div
                    key={`${track.id}-${idx}`}
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
      )}
    </div>
  );
};
