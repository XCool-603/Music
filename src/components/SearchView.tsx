import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Track, Playlist, CustomSourceScript } from '../types';
import { SourceScriptRunner, searchAggregatedOnlineMusic } from '../utils/sourceScriptEngine';
import { ImageWithFallback } from './ImageWithFallback';
import { normalizeCoverUrl } from '../utils/imageUtils';
import {
  Search,
  X,
  History,
  Trash2,
  TrendingUp,
  Flame,
  Music,
  User,
  Disc,
  ListMusic,
  Play,
  Pause,
  Plus,
  Heart,
  ListPlus,
  Sparkles,
  FileText,
  Volume2,
  Filter,
  ArrowRight,
  FileCode,
  Radio,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Headphones,
  Download,
} from 'lucide-react';

interface SearchViewProps {
  tracks: Track[];
  playlists: Playlist[];
  scripts?: CustomSourceScript[];
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: string[];
  initialQuery?: string;
  onPlayTrack: (track: Track) => void;
  onPlayAll: (tracks: Track[]) => void;
  onAddToQueue: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenAddToPlaylistModal: (track: Track) => void;
  onOpenDownload?: (track: Track) => void;
}

type SearchFilterCategory = 'all' | 'songs' | 'scripts' | 'artists' | 'albums' | 'playlists' | 'lyrics';
type MusicPlatform = 'all' | 'kuwo' | 'netease';

const HOT_SEARCHES = [
  { keyword: '周杰伦 - 夜曲', tag: '酷我正版', count: '99.8w' },
  { keyword: '周杰伦 - 晴天', tag: '热搜榜首', count: '88.5w' },
  { keyword: '七里香', tag: '经典', count: '76.4w' },
  { keyword: '稻香', tag: '治愈', count: '69.2w' },
  { keyword: '黑色毛衣', tag: '高保真', count: '58.1w' },
  { keyword: '林俊杰 - 江南', tag: 'HOT', count: '52.4w' },
  { keyword: '陈奕迅 - 富士山下', tag: '粤语经典', count: '48.9w' },
  { keyword: 'City Pop / 80s', tag: '复古', count: '41.3w' },
];

const GENRE_CARDS = [
  { name: '周杰伦经典专区', color: 'from-amber-500/30 to-rose-600/30', border: 'border-amber-500/30', query: '周杰伦' },
  { name: 'City Pop / 城市流行', color: 'from-pink-500/30 to-purple-600/30', border: 'border-pink-500/30', query: 'City Pop' },
  { name: 'Synthwave / 赛博电音', color: 'from-fuchsia-600/30 to-indigo-600/30', border: 'border-fuchsia-500/30', query: 'Synthwave' },
  { name: 'Lo-Fi / 助眠白噪', color: 'from-emerald-500/30 to-teal-700/30', border: 'border-emerald-500/30', query: 'Lo-Fi' },
  { name: '华语流行金曲', color: 'from-blue-600/30 to-cyan-700/30', border: 'border-blue-500/30', query: '流行金曲' },
  { name: 'ACG / 动漫原声', color: 'from-violet-600/30 to-rose-700/30', border: 'border-violet-500/30', query: 'ACG' },
];

const STORAGE_KEY_SEARCH_HISTORY = 'muse_search_history';

export const SearchView: React.FC<SearchViewProps> = ({
  tracks,
  playlists,
  scripts = [],
  currentTrack,
  isPlaying,
  favorites,
  initialQuery = '',
  onPlayTrack,
  onPlayAll,
  onAddToQueue,
  onToggleFavorite,
  onSelectPlaylist,
  onOpenAddToPlaylistModal,
  onOpenDownload,
}) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [filterCategory, setFilterCategory] = useState<SearchFilterCategory>('all');
  const [platform, setPlatform] = useState<MusicPlatform>('all');
  const [scriptTracks, setScriptTracks] = useState<Track[]>([]);
  const [isSearchingScripts, setIsSearchingScripts] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SEARCH_HISTORY);
      return saved ? JSON.parse(saved) : ['周杰伦 夜曲', '晴天', '夜间漫游', 'Synthwave'];
    } catch {
      return ['周杰伦 夜曲', '晴天', '夜间漫游', 'Synthwave'];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initial query if changed from parent
  useEffect(() => {
    if (initialQuery !== undefined && initialQuery !== query) {
      const safeInit = initialQuery || '';
      setQuery(safeInit);
      if (safeInit.trim()) {
        saveSearchKeyword(safeInit);
      }
    }
  }, [initialQuery]);

  // Query enabled JS Source Scripts + Aggregated Multi-Platform Online Music
  useEffect(() => {
    const safeQuery = query || '';
    const trimmed = safeQuery.trim().toLowerCase();
    if (!trimmed) {
      setScriptTracks([]);
      return;
    }

    const activeScripts = (scripts || []).filter((s) => s.enabled);

    let isMounted = true;
    setIsSearchingScripts(true);

    const runSearch = async () => {
      try {
        // 1. 从已启用的自定义 JS 音源沙箱中执行 search (若脚本实现了 search 动作)
        const scriptPromises = (platform === 'all')
          ? activeScripts.map(async (script) => {
              try {
                const runner = new SourceScriptRunner(script);
                const initRes = await runner.init();
                if (!initRes.success) return [];
                return await runner.search(trimmed, 1);
              } catch (e) {
                console.error('Script search failed:', e);
                return [];
              }
            })
          : [];

        // 2. 全网多源开放音乐检索 (支持酷我超全周杰伦/原声、网易云等)
        const onlinePromise = searchAggregatedOnlineMusic(trimmed, activeScripts, platform);

        const [scriptResultsNested, onlineResults] = await Promise.all([
          Promise.all(scriptPromises),
          onlinePromise,
        ]);

        if (!isMounted) return;

        const directScriptTracks = scriptResultsNested.flat();

        // 合并去重
        const trackMap = new Map<string, Track>();
        onlineResults.forEach((t) => {
          const key = t.title.toLowerCase() + '_' + t.artist.toLowerCase();
          trackMap.set(key, t);
        });
        directScriptTracks.forEach((t) => {
          const key = t.title.toLowerCase() + '_' + t.artist.toLowerCase();
          if (!trackMap.has(key)) {
            trackMap.set(key, t);
          }
        });

        const combined = Array.from(trackMap.values());
        setScriptTracks(combined);
        setIsSearchingScripts(false);
      } catch (err) {
        console.error('Search aggregation error:', err);
        if (isMounted) setIsSearchingScripts(false);
      }
    };

    runSearch();

    return () => {
      isMounted = false;
    };
  }, [query, scripts, platform]);

  const saveSearchKeyword = (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setHistory((prev) => {
      const filtered = prev.filter((k) => k.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(STORAGE_KEY_SEARCH_HISTORY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY_SEARCH_HISTORY);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    setHistory((prev) => {
      const next = prev.filter((k) => k !== item);
      try {
        localStorage.setItem(STORAGE_KEY_SEARCH_HISTORY, JSON.stringify(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  const handleSelectKeyword = (keyword: string) => {
    setQuery(keyword);
    saveSearchKeyword(keyword);
    inputRef.current?.focus();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const safeQuery = (query || '').trim();
    if (safeQuery) {
      saveSearchKeyword(safeQuery);
    }
  };

  const trimmedQuery = (query || '').trim().toLowerCase();

  // Search Results calculations
  const {
    matchedTracks,
    matchedArtists,
    matchedAlbums,
    matchedPlaylists,
    matchedLyrics,
    bestMatch,
  } = useMemo(() => {
    if (!trimmedQuery) {
      return {
        matchedTracks: [],
        matchedArtists: [],
        matchedAlbums: [],
        matchedPlaylists: [],
        matchedLyrics: [],
        bestMatch: null as { type: 'track' | 'artist' | 'album'; data: any } | null,
      };
    }

    // Matched Tracks
    const mTracks = tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(trimmedQuery) ||
        t.artist.toLowerCase().includes(trimmedQuery) ||
        t.album.toLowerCase().includes(trimmedQuery) ||
        t.genre.toLowerCase().includes(trimmedQuery)
    );

    // Matched Lyrics
    const mLyrics = tracks
      .map((t) => {
        if (!t.lyrics) return null;
        const lines = t.lyrics.split('\n');
        const matchedLine = lines.find((line) => {
          const textOnly = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim();
          return textOnly.toLowerCase().includes(trimmedQuery);
        });
        if (matchedLine) {
          const cleanText = matchedLine.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim();
          return { track: t, snippet: cleanText };
        }
        return null;
      })
      .filter((item): item is { track: Track; snippet: string } => item !== null);

    // Matched Artists
    const artistMap = new Map<string, { name: string; tracks: Track[]; coverUrl: string; genre: string }>();
    tracks.forEach((t) => {
      if (t.artist.toLowerCase().includes(trimmedQuery)) {
        if (!artistMap.has(t.artist)) {
          artistMap.set(t.artist, {
            name: t.artist,
            tracks: [t],
            coverUrl: t.coverUrl,
            genre: t.genre,
          });
        } else {
          artistMap.get(t.artist)!.tracks.push(t);
        }
      }
    });
    const mArtists = Array.from(artistMap.values());

    // Matched Albums
    const albumMap = new Map<string, { title: string; artist: string; coverUrl: string; year?: number; tracks: Track[] }>();
    tracks.forEach((t) => {
      if (t.album.toLowerCase().includes(trimmedQuery)) {
        if (!albumMap.has(t.album)) {
          albumMap.set(t.album, {
            title: t.album,
            artist: t.artist,
            coverUrl: t.coverUrl,
            year: t.year,
            tracks: [t],
          });
        } else {
          albumMap.get(t.album)!.tracks.push(t);
        }
      }
    });
    const mAlbums = Array.from(albumMap.values());

    // Matched Playlists
    const mPlaylists = playlists.filter(
      (p) =>
        p.name.toLowerCase().includes(trimmedQuery) ||
        p.description.toLowerCase().includes(trimmedQuery) ||
        p.tags.some((tag) => tag.toLowerCase().includes(trimmedQuery))
    );

    // Determine Best Match
    let bMatch: { type: 'track' | 'artist' | 'album'; data: any } | null = null;
    const exactArtist = mArtists.find((a) => a.name.toLowerCase() === trimmedQuery);
    if (exactArtist) {
      bMatch = { type: 'artist', data: exactArtist };
    } else {
      const exactTrack = mTracks.find((t) => t.title.toLowerCase() === trimmedQuery);
      if (exactTrack) {
        bMatch = { type: 'track', data: exactTrack };
      } else if (mTracks.length > 0) {
        bMatch = { type: 'track', data: mTracks[0] };
      } else if (mArtists.length > 0) {
        bMatch = { type: 'artist', data: mArtists[0] };
      }
    }

    return {
      matchedTracks: mTracks,
      matchedArtists: mArtists,
      matchedAlbums: mAlbums,
      matchedPlaylists: mPlaylists,
      matchedLyrics: mLyrics,
      bestMatch: bMatch,
    };
  }, [tracks, playlists, trimmedQuery]);

  // Helper format time
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const totalResultsCount =
    matchedTracks.length +
    scriptTracks.length +
    matchedArtists.length +
    matchedAlbums.length +
    matchedPlaylists.length +
    matchedLyrics.length;

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Top Search Banner & Input Header */}
      <div className="relative rounded-3xl overflow-hidden bg-white/5 border border-white/10 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-[-40%] right-[-10%] w-72 h-72 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none -z-0" />
        <div className="absolute bottom-[-40%] left-[-10%] w-72 h-72 bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none -z-0" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
            <Sparkles className="w-4 h-4" />
            <span>全能音乐搜索与发现中心</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-4">
            搜索你想听的任何旋律
          </h2>

          {/* Search Box Form */}
          <form onSubmit={handleFormSubmit} className="relative flex items-center mb-4">
            <div className="relative flex-1 flex items-center bg-white/10 border border-white/20 rounded-2xl px-4 py-3.5 backdrop-blur-xl focus-within:border-emerald-400/80 focus-within:ring-2 focus-within:ring-emerald-400/20 transition shadow-inner">
              <Search className="w-5 h-5 text-slate-300 mr-3 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索歌曲名（如：周杰伦 夜曲、晴天）、歌手、专辑、曲风..."
                className="bg-transparent border-none outline-none text-sm sm:text-base text-white placeholder:text-slate-400 w-full"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition mr-2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="ml-3 px-6 py-3.5 bg-white hover:bg-slate-100 text-black font-bold rounded-2xl shadow-xl shadow-white/10 transition transform active:scale-95 flex items-center gap-2 flex-shrink-0 text-sm"
            >
              <span>搜索</span>
            </button>
          </form>

          {/* Platform Source Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 font-medium mr-1">检索音源库:</span>
            <button
              type="button"
              onClick={() => setPlatform('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
                platform === 'all'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/15 border border-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>全网智能聚合</span>
            </button>

            <button
              type="button"
              onClick={() => setPlatform('kuwo')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
                platform === 'kuwo'
                  ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/20 font-bold'
                  : 'bg-white/10 text-cyan-200 hover:text-white hover:bg-white/15 border border-cyan-500/30'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>酷我音乐 (周杰伦原版/正版)</span>
            </button>

            <button
              type="button"
              onClick={() => setPlatform('netease')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
                platform === 'netease'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-white/10 text-rose-200 hover:text-white hover:bg-white/15 border border-rose-500/30'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>网易云音乐</span>
            </button>
          </div>
        </div>
      </div>

      {/* When NO query is entered: Show History, Trending Keywords & Genre Explore */}
      {!trimmedQuery ? (
        <div className="space-y-8">
          {/* Search History */}
          {history.length > 0 && (
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <History className="w-4 h-4 text-slate-400" />
                  <span>搜索历史</span>
                </div>
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition py-1 px-2 rounded-lg hover:bg-white/5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>清空历史</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {history.map((item) => (
                  <div
                    key={item}
                    onClick={() => handleSelectKeyword(item)}
                    className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    <span>{item}</span>
                    <button
                      onClick={(e) => handleRemoveHistoryItem(e, item)}
                      className="text-slate-500 group-hover:text-slate-300 hover:!text-rose-400 p-0.5 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hot Trending Searches */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Flame className="w-5 h-5 text-amber-400" />
                <span>热门搜索 · 大家都在搜</span>
              </div>
              <span className="text-xs text-slate-400">实时热度更新</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {HOT_SEARCHES.map((item, index) => (
                <div
                  key={item.keyword}
                  onClick={() => handleSelectKeyword(item.keyword)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-5 text-center font-mono font-bold text-xs ${
                        index < 3 ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-200 group-hover:text-emerald-300 truncate transition">
                      {item.keyword}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                        item.tag === 'HOT'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : item.tag === '飙升'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {item.tag}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono hidden xl:inline">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Genre Discovery Cards */}
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-base mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span>曲风与情绪分类探索</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {GENRE_CARDS.map((card) => (
                <div
                  key={card.name}
                  onClick={() => handleSelectKeyword(card.query)}
                  className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} border ${card.border} hover:scale-[1.02] transition cursor-pointer backdrop-blur-md flex flex-col justify-between h-28 shadow-lg group`}
                >
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                    {card.name}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>即刻探索</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-6">
          {/* Category Filter Chips & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'all', label: '全部', count: totalResultsCount },
                { id: 'songs', label: '内置单曲', count: matchedTracks.length },
                { id: 'scripts', label: 'JS自定义音源', count: scriptTracks.length },
                { id: 'artists', label: '歌手', count: matchedArtists.length },
                { id: 'albums', label: '专辑', count: matchedAlbums.length },
                { id: 'playlists', label: '歌单', count: matchedPlaylists.length },
                { id: 'lyrics', label: '歌词', count: matchedLyrics.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterCategory(tab.id as SearchFilterCategory)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    filterCategory === tab.id
                      ? 'bg-white text-black font-bold shadow-md shadow-white/10'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      filterCategory === tab.id ? 'bg-black/10 text-black' : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Total Results Summary */}
            <div className="text-xs text-slate-400 font-medium">
              共找到 <span className="text-emerald-400 font-bold">{totalResultsCount}</span> 条与 “{query}” 相关结果
            </div>
          </div>

          {/* Empty Results State */}
          {totalResultsCount === 0 ? (
            <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-12 text-center border border-white/10 shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">未找到与 “{query}” 相关的音乐</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                请检查输入拼写是否有误，或尝试搜索其他歌曲名、歌手姓名（如陈星、Luna Pulse）、曲风（如 City Pop、Lo-Fi）或歌词关键词。
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => setQuery('')}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-full border border-white/15 transition"
                >
                  清空搜索
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Best Match Hero Card (Shown in 'all' view if available) */}
              {filterCategory === 'all' && bestMatch && (
                <div className="bg-gradient-to-r from-emerald-950/40 via-white/5 to-white/5 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 border border-emerald-500/20 shadow-2xl">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> 最佳匹配推荐
                  </div>

                  {bestMatch.type === 'track' && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg ring-1 ring-white/10">
                          <ImageWithFallback
                            src={normalizeCoverUrl(bestMatch.data.coverUrl)}
                            alt={bestMatch.data.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              单曲
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{bestMatch.data.genre}</span>
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                            {bestMatch.data.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {bestMatch.data.artist} · 《{bestMatch.data.album}》
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onPlayTrack(bestMatch.data)}
                          className="px-5 py-2.5 bg-white hover:bg-slate-100 text-black font-bold text-xs rounded-full shadow-lg shadow-white/10 transition transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                          <span>立即播放</span>
                        </button>
                        <button
                          onClick={() => onOpenDownload?.(bestMatch.data)}
                          className="px-4 py-2.5 bg-white/10 hover:bg-emerald-500/20 text-white hover:text-emerald-300 font-medium text-xs rounded-full border border-white/15 hover:border-emerald-500/30 transition flex items-center gap-1.5"
                        >
                          <Download className="w-4 h-4" />
                          <span>下载</span>
                        </button>
                        <button
                          onClick={() => onAddToQueue(bestMatch.data)}
                          className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium text-xs rounded-full border border-white/15 transition flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>加入队列</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {bestMatch.type === 'artist' && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex-shrink-0 shadow-lg ring-2 ring-emerald-500/30">
                          <ImageWithFallback
                            src={normalizeCoverUrl(bestMatch.data.coverUrl)}
                            alt={bestMatch.data.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              音乐人 / 歌手
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{bestMatch.data.genre}</span>
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                            {bestMatch.data.name}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            收录作品 {bestMatch.data.tracks.length} 首
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onPlayAll(bestMatch.data.tracks)}
                        className="px-5 py-2.5 bg-white hover:bg-slate-100 text-black font-bold text-xs rounded-full shadow-lg shadow-white/10 transition transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                        <span>播放歌手全部单曲</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Single Tracks Section */}
              {(filterCategory === 'all' || filterCategory === 'songs') && matchedTracks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-bold text-base">
                      <Music className="w-4 h-4 text-emerald-400" />
                      <span>单曲结果 ({matchedTracks.length})</span>
                    </div>
                    {matchedTracks.length > 1 && (
                      <button
                        onClick={() => onPlayAll(matchedTracks)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>播放全部搜索单曲</span>
                      </button>
                    )}
                  </div>

                  <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="divide-y divide-white/5">
                      {matchedTracks.map((track, idx) => {
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
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
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
                                <div
                                  className={`text-sm font-semibold truncate ${
                                    isCurrent ? 'text-emerald-300' : 'text-white'
                                  }`}
                                >
                                  {track.title}
                                </div>
                                <div className="text-xs text-slate-400 truncate mt-0.5">
                                  {track.artist} · <span className="text-slate-500">{track.album}</span>
                                </div>
                              </div>
                            </div>

                            <div className="hidden md:block w-32 text-xs text-slate-400 truncate">
                              {track.genre}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
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
                                  onToggleFavorite(track.id);
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
              )}

              {/* JS Custom Script Sourced Tracks Section */}
              {(filterCategory === 'all' || filterCategory === 'scripts') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-bold text-base">
                      <FileCode className="w-4 h-4 text-emerald-400" />
                      <span>JS 自定义音源条目 ({scriptTracks.length})</span>
                      {isSearchingScripts && (
                        <span className="text-xs text-emerald-400 font-normal animate-pulse">
                          正在通过 JS 沙箱检索...
                        </span>
                      )}
                    </div>
                    {scriptTracks.length > 1 && (
                      <button
                        onClick={() => onPlayAll(scriptTracks)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>播放全部音源单曲</span>
                      </button>
                    )}
                  </div>

                  {scriptTracks.length === 0 ? (
                    filterCategory === 'scripts' && (
                      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 text-center border border-white/10 text-xs text-slate-400">
                        当前已启用的自定义 JS 脚本未匹配到 “{query}” 的相关条目。您可以在「音源扩展」页面检查脚本状态或测试检索。
                      </div>
                    )
                  ) : (
                    <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                      <div className="divide-y divide-white/5">
                        {scriptTracks.map((track) => {
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
                              {/* Left Track Info */}
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden flex-shrink-0 bg-neutral-900 border border-white/10 shadow-md">
                                  <ImageWithFallback
                                    src={normalizeCoverUrl(track.coverUrl)}
                                    alt={track.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                  />
                                  <div
                                    className={`absolute inset-0 bg-black/40 flex items-center justify-center transition ${
                                      isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                    }`}
                                  >
                                    {isCurrent && isPlaying ? (
                                      <Volume2 className="w-5 h-5 text-emerald-400 animate-pulse" />
                                    ) : (
                                      <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                                    )}
                                  </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-xs sm:text-sm font-semibold truncate ${
                                        isCurrent ? 'text-emerald-400' : 'text-white group-hover:text-emerald-300'
                                      } transition`}
                                    >
                                      {track.title}
                                    </span>
                                    {track.sourceName?.includes('酷我') || track.sourceKey === 'kw' ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex-shrink-0 flex items-center gap-0.5">
                                        <Music className="w-2.5 h-2.5" /> 酷我音乐
                                      </span>
                                    ) : track.sourceName?.includes('网易') || track.sourceKey === 'wy' ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex-shrink-0 flex items-center gap-0.5">
                                        <Headphones className="w-2.5 h-2.5" /> 网易云
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                                        {track.sourceName || '自定义音源'}
                                      </span>
                                    )}
                                    {track.bitrate && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0 hidden sm:inline-block">
                                        {track.bitrate}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 truncate">
                                    <span className="truncate">{track.artist}</span>
                                    <span>•</span>
                                    <span className="truncate">{track.album}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Action Icons */}
                              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
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
                                    onToggleFavorite(track.id);
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
                  )}
                </div>
              )}

              {/* Artists Section */}
              {(filterCategory === 'all' || filterCategory === 'artists') && matchedArtists.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold text-base">
                    <User className="w-4 h-4 text-indigo-400" />
                    <span>歌手 / 艺术家 ({matchedArtists.length})</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {matchedArtists.map((artist) => (
                      <div
                        key={artist.name}
                        onClick={() => onPlayAll(artist.tracks)}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-3xl p-4 text-center cursor-pointer transition backdrop-blur-xl group"
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
              )}

              {/* Albums Section */}
              {(filterCategory === 'all' || filterCategory === 'albums') && matchedAlbums.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold text-base">
                    <Disc className="w-4 h-4 text-pink-400" />
                    <span>专辑 ({matchedAlbums.length})</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {matchedAlbums.map((album) => (
                      <div
                        key={album.title}
                        onClick={() => onPlayAll(album.tracks)}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-3xl p-3.5 cursor-pointer transition backdrop-blur-xl group"
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
              )}

              {/* Playlists Section */}
              {(filterCategory === 'all' || filterCategory === 'playlists') && matchedPlaylists.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold text-base">
                    <ListMusic className="w-4 h-4 text-emerald-400" />
                    <span>精选歌单 ({matchedPlaylists.length})</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {matchedPlaylists.map((pl) => (
                      <div
                        key={pl.id}
                        onClick={() => onSelectPlaylist(pl)}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-3xl p-3.5 cursor-pointer transition backdrop-blur-xl group"
                      >
                        <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 ring-1 ring-white/10">
                          <ImageWithFallback
                            src={normalizeCoverUrl(pl.coverUrl)}
                            alt={pl.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition truncate">
                          {pl.name}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{pl.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lyrics Match Section */}
              {(filterCategory === 'all' || filterCategory === 'lyrics') && matchedLyrics.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold text-base">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>歌词包含匹配 ({matchedLyrics.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {matchedLyrics.map(({ track, snippet }) => (
                      <div
                        key={track.id}
                        onClick={() => onPlayTrack(track)}
                        className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition cursor-pointer backdrop-blur-xl flex items-center justify-between gap-3 group"
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
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
