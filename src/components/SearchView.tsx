import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Track, Playlist, CustomSourceScript } from '../types';
import { searchAggregatedOnlineMusic } from '../utils/sourceScriptEngine';
import { Search, Sparkles, Music, Headphones, Loader2 } from 'lucide-react';
import { v2Search, v2Suggest, v2HotSearch, HotKeyword } from '../utils/apiV2';
import { SearchBar } from './search/SearchBar';
import { SuggestDropdown } from './search/SuggestDropdown';
import { SearchHome } from './search/SearchHome';
import { ResultTabs, SearchFilterTab, ResultTab } from './search/ResultTabs';
import { ComprehensiveTab } from './search/ComprehensiveTab';
import { BestMatch } from './search/BestMatchHero';
import { TrackResultList } from './search/TrackResultList';
import {
  ArtistGrid,
  AlbumGrid,
  PlaylistGrid,
  LyricMatchList,
  MatchedArtist,
  MatchedAlbum,
  MatchedLyric,
} from './search/SearchResultGroups';

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
  onToggleFavorite: (track: Track) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenAddToPlaylistModal: (track: Track) => void;
  onOpenDownload?: (track: Track) => void;
}

type MusicPlatform = 'all' | 'kuwo' | 'netease';

const STORAGE_KEY_SEARCH_HISTORY = 'muse_search_history';
const ONLINE_PAGE_SIZE = 30;
const SUGGEST_DEBOUNCE_MS = 300;

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
  // ── 核心状态机：inputValue 驱动联想；committedQuery 驱动全文搜索与历史 ──
  const [inputValue, setInputValue] = useState(initialQuery || '');
  const [committedQuery, setCommittedQuery] = useState(initialQuery || '');
  const [platform, setPlatform] = useState<MusicPlatform>('all');
  const [filterTab, setFilterTab] = useState<SearchFilterTab>('all');

  const [suggestions, setSuggestions] = useState<{ keyword: string }[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestActive, setSuggestActive] = useState(-1);

  const [hotKeywords, setHotKeywords] = useState<HotKeyword[]>([]);

  const [onlineTracks, setOnlineTracks] = useState<Track[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineHasMore, setOnlineHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);


  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SEARCH_HISTORY);
      return saved ? JSON.parse(saved) : ['周杰伦 夜曲', '晴天', '夜间漫游', 'Synthwave'];
    } catch {
      return ['周杰伦 夜曲', '晴天', '夜间漫游', 'Synthwave'];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestSeqRef = useRef(0);
  const onlineSeqRef = useRef(0);
  const onlinePageRef = useRef(1);
  const userTypedRef = useRef(false);

  // ── 历史记录 ────────────────────────────────────────────────────────
  const saveSearchKeyword = useCallback((keyword: string) => {
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
  }, []);

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

  // ── 提交搜索（Enter / 按钮 / 联想 / 历史 / 热搜统一入口）──────────────
  const commitSearch = useCallback(
    (keyword: string) => {
      const trimmed = (keyword || '').trim();
      setInputValue(trimmed);
      setSuggestOpen(false);
      setSuggestActive(-1);
      setFilterTab('all');
      onlinePageRef.current = 1;
      if (trimmed) saveSearchKeyword(trimmed);
      setCommittedQuery(trimmed);
      inputRef.current?.blur();
    },
    [saveSearchKeyword]
  );

  // Sync initial query if changed from parent (e.g. 首页热搜/曲风跳转)
  useEffect(() => {
    if (initialQuery !== undefined && initialQuery !== committedQuery) {
      commitSearch(initialQuery || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // ── 官方热搜榜（失败静默降级本地常量，由 SearchHome 处理）────────────
  useEffect(() => {
    let isMounted = true;
    v2HotSearch('netease')
      .then((kw) => {
        if (isMounted) setHotKeywords(kw);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // ── 联想：300ms 防抖 + 序号防竞态（官方 suggest，空结果降级 v2Search）──
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggestActive(-1);
      // 输入被完全清空 → 回到搜索首页
      setCommittedQuery((prev) => (prev ? '' : prev));
      return;
    }
    // 仅响应用户真实键入；跳过挂载/程序化赋值，避免进页即弹联想
    if (!userTypedRef.current) return;

    let isMounted = true;
    const seq = ++suggestSeqRef.current;
    const timer = window.setTimeout(async () => {
      try {
        const src = platform === 'netease' ? 'netease' : 'kuwo';
        let items = await v2Suggest(trimmed, src, 8);
        if (items.length === 0) {
          const fallback = await v2Search(trimmed, 1, 8, platform === 'all' ? 'all' : platform);
          items = fallback.map((t) => ({ keyword: `${t.title} - ${t.artist}` }));
        }
        if (isMounted && seq === suggestSeqRef.current) {
          setSuggestions(items);
          setSuggestOpen(items.length > 0);
          setSuggestActive(-1);
        }
      } catch {
        /* 联想失败静默 */
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, platform]);

  // ── 在线全文搜索（仅提交后触发；v2/v1 由聚合器内部按开关选择）─────────
  useEffect(() => {
    const q = committedQuery.trim();
    if (!q) {
      setOnlineTracks([]);
      setOnlineHasMore(false);
      setIsSearchingOnline(false);
      return;
    }

    let isMounted = true;
    const seq = ++onlineSeqRef.current;
    onlinePageRef.current = 1;
    setIsSearchingOnline(true);

    (async () => {
      try {
        const activeScripts = (scripts || []).filter((s) => s.enabled);
        const results = await searchAggregatedOnlineMusic(q, activeScripts, platform, 1);
        if (isMounted && seq === onlineSeqRef.current) {
          setOnlineTracks(results);
          setOnlineHasMore(platform !== 'all' && results.length >= ONLINE_PAGE_SIZE);
          setIsSearchingOnline(false);
        }
      } catch (err) {
        console.error('Online search error:', err);
        if (isMounted && seq === onlineSeqRef.current) {
          setOnlineTracks([]);
          setIsSearchingOnline(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [committedQuery, platform, scripts]);

  const handleLoadMore = useCallback(async () => {
    const q = committedQuery.trim();
    if (!q || isLoadingMore || platform === 'all') return;
    const next = onlinePageRef.current + 1;
    setIsLoadingMore(true);
    try {
      const activeScripts = (scripts || []).filter((s) => s.enabled);
      const results = await searchAggregatedOnlineMusic(q, activeScripts, platform, next);
      setOnlineTracks((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...results.filter((t) => !seen.has(t.id))];
      });
      onlinePageRef.current = next;
      setOnlineHasMore(results.length >= ONLINE_PAGE_SIZE);
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [committedQuery, isLoadingMore, platform, scripts]);

  // 注：洛雪 / JS 音源结果已由 searchAggregatedOnlineMusic 合并进 onlineTracks，
  // 并在单曲列表顶部优先展示（脚本优先 + 后台兜底 + 去重），不再单独发起脚本检索。

  // ── 本机曲库匹配（原 L244-361 逻辑，触发键 committedQuery）────────────
  const trimmedQuery = committedQuery.trim().toLowerCase();

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
        matchedTracks: [] as Track[],
        matchedArtists: [] as MatchedArtist[],
        matchedAlbums: [] as MatchedAlbum[],
        matchedPlaylists: [] as Playlist[],
        matchedLyrics: [] as MatchedLyric[],
        bestMatch: null as BestMatch | null,
      };
    }

    const mTracks = tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(trimmedQuery) ||
        t.artist.toLowerCase().includes(trimmedQuery) ||
        t.album.toLowerCase().includes(trimmedQuery) ||
        t.genre.toLowerCase().includes(trimmedQuery)
    );

    const mLyrics: MatchedLyric[] = tracks
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
      .filter((item): item is MatchedLyric => item !== null);

    const artistMap = new Map<string, MatchedArtist>();
    tracks.forEach((t) => {
      if (t.artist.toLowerCase().includes(trimmedQuery)) {
        const existing = artistMap.get(t.artist);
        if (existing) {
          existing.tracks.push(t);
        } else {
          artistMap.set(t.artist, {
            name: t.artist,
            tracks: [t],
            coverUrl: t.coverUrl,
            genre: t.genre,
          });
        }
      }
    });
    const mArtists = Array.from(artistMap.values());

    const albumMap = new Map<string, MatchedAlbum>();
    tracks.forEach((t) => {
      if (t.album.toLowerCase().includes(trimmedQuery)) {
        const existing = albumMap.get(t.album);
        if (existing) {
          existing.tracks.push(t);
        } else {
          albumMap.set(t.album, {
            title: t.album,
            artist: t.artist,
            coverUrl: t.coverUrl,
            year: t.year,
            tracks: [t],
          });
        }
      }
    });
    const mAlbums = Array.from(albumMap.values());

    const mPlaylists = playlists.filter(
      (p) =>
        p.name.toLowerCase().includes(trimmedQuery) ||
        p.description.toLowerCase().includes(trimmedQuery) ||
        p.tags.some((tag) => tag.toLowerCase().includes(trimmedQuery))
    );

    let bMatch: BestMatch | null = null;
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

  const totalResultsCount =
    onlineTracks.length +
    matchedTracks.length +
    matchedArtists.length +
    matchedAlbums.length +
    matchedPlaylists.length +
    matchedLyrics.length;

  // ── 联想键盘导航 ─────────────────────────────────────────────────────
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestActive((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestActive((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      if (suggestActive >= 0 && suggestions[suggestActive]) {
        e.preventDefault();
        commitSearch(suggestions[suggestActive].keyword);
      }
    } else if (e.key === 'Escape') {
      setSuggestOpen(false);
    }
  };

  const handleInputChange = (value: string) => {
    userTypedRef.current = true;
    setInputValue(value);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const safeQuery = (inputValue || '').trim();
    commitSearch(safeQuery);
  };

  // ── Tabs ─────────────────────────────────────────────────────────────
  const tabs: ResultTab[] = [
    { id: 'all', label: '综合', count: totalResultsCount },
    { id: 'songs', label: '单曲', count: onlineTracks.length + matchedTracks.length },
    { id: 'playlists', label: '歌单', count: matchedPlaylists.length },
    { id: 'artists', label: '歌手', count: matchedArtists.length },
    { id: 'albums', label: '专辑', count: matchedAlbums.length },
    { id: 'lyrics', label: '歌词', count: matchedLyrics.length },
  ];

  // 共享的 TrackRow 回调
  const trackRowHandlers = {
    currentTrack,
    isPlaying,
    favorites,
    onPlayTrack,
    onToggleFavorite,
    onAddToQueue,
    onAddToPlaylist: onOpenAddToPlaylistModal,
    onDownload: onOpenDownload,
  };

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* 顶部搜索区 */}
      <div className="relative rounded-3xl overflow-hidden bg-white/5 border border-white/10 p-6 sm:p-8 shadow-2xl">
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

          <div className="relative">
            <SearchBar
              value={inputValue}
              inputRef={inputRef}
              onChange={handleInputChange}
              onSubmit={handleFormSubmit}
              onClear={() => {
                setInputValue('');
                setCommittedQuery('');
                setSuggestions([]);
                setSuggestOpen(false);
                inputRef.current?.focus();
              }}
              onKeyDown={handleInputKeyDown}
            />
            <SuggestDropdown
              open={suggestOpen}
              suggestions={suggestions}
              query={inputValue}
              activeIndex={suggestActive}
              onSelect={commitSearch}
            />
          </div>

          {/* 音源选择 */}
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
              <span>酷我音乐 (官方接口)</span>
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

      {/* 无查询 → 搜索首页（历史 / 热搜 / 曲风） */}
      {!committedQuery.trim() ? (
        <SearchHome
          hotKeywords={hotKeywords}
          history={history}
          onSelectKeyword={commitSearch}
          onClearHistory={handleClearHistory}
          onRemoveHistoryItem={handleRemoveHistoryItem}
        />
      ) : (
        <div className="space-y-6">
          <ResultTabs
            tabs={tabs}
            active={filterTab}
            total={totalResultsCount}
            query={committedQuery}
            onChange={setFilterTab}
          />

          {/* 空结果状态 */}
          {totalResultsCount === 0 && !isSearchingOnline ? (
            <div className="bg-white/5 rounded-3xl p-12 text-center border border-white/10 shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">未找到与 “{committedQuery}” 相关的音乐</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                请检查输入拼写是否有误，或尝试搜索其他歌曲名、歌手姓名、曲风（如 City Pop、Lo-Fi）或歌词关键词。
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => {
                    setInputValue('');
                    setCommittedQuery('');
                  }}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-full border border-white/15 transition"
                >
                  清空搜索
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 搜索中（无任何结果时） */}
              {isSearchingOnline && totalResultsCount === 0 && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在搜索 “{committedQuery}” ...</span>
                </div>
              )}

              {/* 综合 */}
              {(filterTab === 'all' && (totalResultsCount > 0 || isSearchingOnline)) && (
                <ComprehensiveTab
                  bestMatch={bestMatch}
                  onlineTracks={onlineTracks}
                  localTracks={matchedTracks}
                  matchedArtists={matchedArtists}
                  matchedAlbums={matchedAlbums}
                  matchedPlaylists={matchedPlaylists}
                  matchedLyrics={matchedLyrics}
                  {...trackRowHandlers}
                  onPlayAll={onPlayAll}
                  onSelectPlaylist={onSelectPlaylist}
                  onShowMoreSongs={() => setFilterTab('songs')}
                />
              )}

              {/* 单曲 */}
              {filterTab === 'songs' && (
                <div className="space-y-6">
                  {isSearchingOnline && onlineTracks.length === 0 && (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>正在搜索 “{committedQuery}” ...</span>
                    </div>
                  )}
                  <TrackResultList
                    tracks={onlineTracks}
                    title={`在线单曲 (${onlineTracks.length})`}
                    titleIcon={<Music className="w-4 h-4 text-emerald-400" />}
                    showSourceBadge
                    {...trackRowHandlers}
                  />
                  {onlineHasMore && (
                    <div className="flex justify-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="px-6 py-2.5 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-xs font-semibold rounded-full border border-white/15 transition flex items-center gap-2"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>加载中...</span>
                          </>
                        ) : (
                          <span>加载更多</span>
                        )}
                      </button>
                    </div>
                  )}
                  {platform === 'all' && onlineTracks.length >= ONLINE_PAGE_SIZE && (
                    <div className="text-center text-xs text-slate-500">
                      聚合模式跨页可能重复，切换到酷我 / 网易云可查看更多
                    </div>
                  )}
                  <TrackResultList
                    tracks={matchedTracks}
                    title={`本机曲库匹配 (${matchedTracks.length})`}
                    titleIcon={<Music className="w-4 h-4 text-indigo-400" />}
                    {...trackRowHandlers}
                  />
                </div>
              )}

              {/* 歌手 */}
              {filterTab === 'artists' && (
                <ArtistGrid artists={matchedArtists} onPlayAll={onPlayAll} />
              )}

              {/* 专辑 */}
              {filterTab === 'albums' && (
                <AlbumGrid albums={matchedAlbums} onPlayAll={onPlayAll} />
              )}

              {/* 歌单 */}
              {filterTab === 'playlists' && (
                <PlaylistGrid playlists={matchedPlaylists} onSelectPlaylist={onSelectPlaylist} />
              )}

              {/* 歌词 */}
              {filterTab === 'lyrics' && (
                <LyricMatchList items={matchedLyrics} onPlayTrack={onPlayTrack} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
