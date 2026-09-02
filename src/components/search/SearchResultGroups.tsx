import React from 'react';
import { User, Disc, ListMusic, FileText, Play } from 'lucide-react';
import { Track, Playlist } from '../../types';
import { ImageWithFallback } from '../ImageWithFallback';
import { normalizeCoverUrl } from '../../utils/imageUtils';

export interface MatchedArtist {
  name: string;
  tracks: Track[];
  coverUrl: string;
  genre: string;
}

export interface MatchedAlbum {
  title: string;
  artist: string;
  coverUrl: string;
  year?: number;
  tracks: Track[];
}

export interface MatchedLyric {
  track: Track;
  snippet: string;
}

/** 歌手 / 专辑 / 歌单 / 歌词四类结果网格（自原 L1041-1179 抽取），均支持按数量截断预览。 */

export const ArtistGrid: React.FC<{ artists: MatchedArtist[]; limit?: number; onPlayAll: (tracks: Track[]) => void }> = ({
  artists,
  limit,
  onPlayAll,
}) => {
  if (artists.length === 0) return null;
  const list = limit ? artists.slice(0, limit) : artists;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-white font-bold text-base">
        <User className="w-4 h-4 text-indigo-400" />
        <span>歌手 / 艺术家 ({artists.length})</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {list.map((artist) => (
          <div
            key={artist.name}
            onClick={() => onPlayAll(artist.tracks)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-3xl p-4 text-center cursor-pointer transition group"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 ring-2 ring-white/10 group-hover:ring-emerald-400/50 transition">
              <ImageWithFallback
                src={normalizeCoverUrl(artist.coverUrl)}
                alt={artist.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition truncate">
              {artist.name}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {artist.tracks.length} 首歌曲 · {artist.genre}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AlbumGrid: React.FC<{ albums: MatchedAlbum[]; limit?: number; onPlayAll: (tracks: Track[]) => void }> = ({
  albums,
  limit,
  onPlayAll,
}) => {
  if (albums.length === 0) return null;
  const list = limit ? albums.slice(0, limit) : albums;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-white font-bold text-base">
        <Disc className="w-4 h-4 text-pink-400" />
        <span>专辑 ({albums.length})</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {list.map((album) => (
          <div
            key={album.title}
            onClick={() => onPlayAll(album.tracks)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-3xl p-3.5 cursor-pointer transition group"
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 ring-1 ring-white/10">
              <ImageWithFallback
                src={normalizeCoverUrl(album.coverUrl)}
                alt={album.title}
                className="w-full h-full object-cover"
              />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition truncate">
              {album.title}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{album.artist}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PlaylistGrid: React.FC<{
  playlists: Playlist[];
  limit?: number;
  onSelectPlaylist: (playlist: Playlist) => void;
}> = ({ playlists, limit, onSelectPlaylist }) => {
  if (playlists.length === 0) return null;
  const list = limit ? playlists.slice(0, limit) : playlists;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-white font-bold text-base">
        <ListMusic className="w-4 h-4 text-emerald-400" />
        <span>精选歌单 ({playlists.length})</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {list.map((pl) => (
          <div
            key={pl.id}
            onClick={() => onSelectPlaylist(pl)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-3xl p-3.5 cursor-pointer transition group"
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 ring-1 ring-white/10">
              <ImageWithFallback
                src={normalizeCoverUrl(pl.coverUrl)}
                alt={pl.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition truncate">{pl.name}</h4>
            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{pl.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LyricMatchList: React.FC<{ items: MatchedLyric[]; limit?: number; onPlayTrack: (track: Track) => void }> = ({
  items,
  limit,
  onPlayTrack,
}) => {
  if (items.length === 0) return null;
  const list = limit ? items.slice(0, limit) : items;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-white font-bold text-base">
        <FileText className="w-4 h-4 text-amber-400" />
        <span>歌词包含匹配 ({items.length})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {list.map(({ track, snippet }) => (
          <div
            key={track.id}
            onClick={() => onPlayTrack(track)}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition cursor-pointer flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <ImageWithFallback
                src={normalizeCoverUrl(track.coverUrl)}
                alt={track.title}
                className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/10 flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition truncate">
                  {track.title} · {track.artist}
                </div>
                <div className="text-xs text-amber-300 font-mono mt-1 line-clamp-1 italic bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  “{snippet}”
                </div>
              </div>
            </div>
            <button
              className="p-2.5 rounded-full bg-white/10 text-white group-hover:bg-white group-hover:text-black transition flex-shrink-0"
              title="播放此曲"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
