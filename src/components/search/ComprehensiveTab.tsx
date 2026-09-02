import React from 'react';
import { Music, FileCode, Play, ArrowRight } from 'lucide-react';
import { Track, Playlist } from '../../types';
import { BestMatchHero, BestMatch } from './BestMatchHero';
import { TrackResultList } from './TrackResultList';
import { ArtistGrid, AlbumGrid, PlaylistGrid, LyricMatchList, MatchedArtist, MatchedAlbum, MatchedLyric } from './SearchResultGroups';

const PREVIEW_COUNT = 10;
const GROUP_PREVIEW = 4;

interface ComprehensiveTabProps {
  bestMatch: BestMatch | null;
  onlineTracks: Track[];
  localTracks: Track[];
  scriptTracks: Track[];
  isSearchingScripts: boolean;
  matchedArtists: MatchedArtist[];
  matchedAlbums: MatchedAlbum[];
  matchedPlaylists: Playlist[];
  matchedLyrics: MatchedLyric[];
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: string[];
  onPlayTrack: (track: Track) => void;
  onPlayAll: (tracks: Track[]) => void;
  onToggleFavorite: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onAddToPlaylist: (track: Track) => void;
  onDownload?: (track: Track) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onShowMoreSongs: () => void;
}

/**
 * 「综合」tab：最佳匹配 → 在线 top10（查看更多切单曲 tab）→ 本机/JS 音源预览 → 各类网格。
 */
export const ComprehensiveTab: React.FC<ComprehensiveTabProps> = ({
  bestMatch,
  onlineTracks,
  localTracks,
  scriptTracks,
  isSearchingScripts,
  matchedArtists,
  matchedAlbums,
  matchedPlaylists,
  matchedLyrics,
  currentTrack,
  isPlaying,
  favorites,
  onPlayTrack,
  onPlayAll,
  onToggleFavorite,
  onAddToQueue,
  onAddToPlaylist,
  onDownload,
  onSelectPlaylist,
  onShowMoreSongs,
}) => (
  <div className="space-y-6">
    <BestMatchHero
      bestMatch={bestMatch}
      onPlayTrack={onPlayTrack}
      onPlayAll={onPlayAll}
      onAddToQueue={onAddToQueue}
      onOpenDownload={onDownload}
    />

    {onlineTracks.length > 0 && (
      <TrackResultList
        tracks={onlineTracks.slice(0, PREVIEW_COUNT)}
        title={`在线单曲 (${onlineTracks.length})`}
        titleIcon={<Music className="w-4 h-4 text-emerald-400" />}
        showSourceBadge
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        favorites={favorites}
        onPlayTrack={onPlayTrack}
        onToggleFavorite={onToggleFavorite}
        onAddToQueue={onAddToQueue}
        onAddToPlaylist={onAddToPlaylist}
        onDownload={onDownload}
        action={
          onlineTracks.length > PREVIEW_COUNT && (
            <button
              onClick={onShowMoreSongs}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition"
            >
              <span>查看更多</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )
        }
      />
    )}

    {localTracks.length > 0 && (
      <TrackResultList
        tracks={localTracks.slice(0, 5)}
        title={`本机曲库匹配 (${localTracks.length})`}
        titleIcon={<Music className="w-4 h-4 text-indigo-400" />}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        favorites={favorites}
        onPlayTrack={onPlayTrack}
        onToggleFavorite={onToggleFavorite}
        onAddToQueue={onAddToQueue}
        onAddToPlaylist={onAddToPlaylist}
        onDownload={onDownload}
      />
    )}

    {scriptTracks.length > 0 && (
      <TrackResultList
        tracks={scriptTracks.slice(0, 5)}
        title={`JS 自定义音源 (${scriptTracks.length})`}
        titleIcon={<FileCode className="w-4 h-4 text-emerald-400" />}
        titleExtra={
          isSearchingScripts ? (
            <span className="text-xs text-emerald-400 font-normal animate-pulse">正在通过 JS 沙箱检索...</span>
          ) : undefined
        }
        showSourceBadge
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        favorites={favorites}
        onPlayTrack={onPlayTrack}
        onToggleFavorite={onToggleFavorite}
        onAddToQueue={onAddToQueue}
        onAddToPlaylist={onAddToPlaylist}
        onDownload={onDownload}
        action={
          scriptTracks.length > 1 && (
            <button
              onClick={() => onPlayAll(scriptTracks)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>播放全部</span>
            </button>
          )
        }
      />
    )}

    <ArtistGrid artists={matchedArtists} limit={GROUP_PREVIEW} onPlayAll={onPlayAll} />
    <AlbumGrid albums={matchedAlbums} limit={GROUP_PREVIEW} onPlayAll={onPlayAll} />
    <PlaylistGrid playlists={matchedPlaylists} limit={GROUP_PREVIEW} onSelectPlaylist={onSelectPlaylist} />
    <LyricMatchList items={matchedLyrics} limit={GROUP_PREVIEW} onPlayTrack={onPlayTrack} />
  </div>
);
