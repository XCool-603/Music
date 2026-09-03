import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Track, CustomSourceScript } from '../types';
import { searchAggregatedOnlineMusic } from '../utils/sourceScriptEngine';
import { Search, Sparkles, Music, Headphones, Loader2, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { v2HotSearch, HotKeyword } from '../utils/apiV2';
import { SearchBar } from './search/SearchBar';
import { SearchHome } from './search/SearchHome';
import { TrackResultList } from './search/TrackResultList';

interface SearchViewProps {
  scripts?: CustomSourceScript[];
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: string[];
  initialQuery?: string;
  onPlayTrack: (track: Track) => void;
  onPlayAll: (tracks: Track[]) => void;
  onAddToQueue: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  onOpenAddToPlaylistModal: (track: Track) => void;
  onOpenDownload?: (track: Track) => void;
}

type MusicPlatform = 'all' | 'kuwo' | 'netease';

const STORAGE_KEY_SEARCH_HISTORY = 'muse_search_history';
const ONLINE_PAGE_SIZE = 30;

export const SearchView: React.FC<SearchViewProps> = ({
  scripts = [],
  currentTrack,
  isPlaying,
  favorites,
  initialQuery = '',
  onPlayTrack,
  onPlayAll,
  onAddToQueue,
  onToggleFavorite,
  onOpenAddToPlaylistModal,
  onOpenDownload,
}) => {
  // ── 核心状态机：inputValue 为输入框当前值；committedQuery 驱动全文搜索与历史 ──
  const [inputValue, setInputValue] = useState(initialQuery || '');
  const [committedQuery, setCommittedQuery] = useState(initialQuery || '');
  const [platform, setPlatform] = useState<MusicPlatform>('all');

  const [hotKeywords, setHotKeywords] = useState<HotKeyword[]>([]);

  const [onlineTracks, setOnlineTracks] = useState<Track[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlinePage, setOnlinePage] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);

  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SEARCH_HISTORY);
      return saved ? JSON.parse(saved) : ['周杰伦 夜曲', '晴天', '夜间漫游', 'Synthwave'];
    } catch {
      return ['周杰伦 夜曲', '晴天', '夜间漫游', 'Synthwave'];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const onlineSeqRef = useRef(0);

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

  // ── 提交搜索（Enter / 按钮 / 历史 / 热搜统一入口）────────────────────
  const commitSearch = useCallback(
    (keyword: string) => {
      const trimmed = (keyword || '').trim();
      setInputValue(trimmed);
      setOnlinePage(1);
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

  // ── 输入被完全清空 → 回到搜索首页 ───────────────────────────────────
  useEffect(() => {
    if (!inputValue.trim()) {
      setCommittedQuery((prev) => (prev ? '' : prev));
    }
  }, [inputValue]);

  // ── 在线搜索：新查询 / 切换音源 → 回到第 1 页 ────────────────────────
  useEffect(() => {
    const q = committedQuery.trim();
    if (!q) {
      setOnlineTracks([]);
      setIsSearchingOnline(false);
      return;
    }

    let isMounted = true;
    const seq = ++onlineSeqRef.current;
    setIsSearchingOnline(true);

    (async () => {
      try {
        const activeScripts = (scripts || []).filter((s) => s.enabled);
        const results = await searchAggregatedOnlineMusic(q, activeScripts, platform, 1);
        if (isMounted && seq === onlineSeqRef.current) {
          setOnlineTracks(results);
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

  // ── 翻页：整页替换（非追加），与主流音乐软件一致 ──────────────────────
  const handleGoPage = useCallback(
    async (nextPage: number) => {
      const q = committedQuery.trim();
      if (!q || nextPage < 1 || isPageLoading || isSearchingOnline) return;
      if (nextPage > 1 && onlineTracks.length < ONLINE_PAGE_SIZE) return; // 已是末页

      const seq = ++onlineSeqRef.current;
      setIsPageLoading(true);
      try {
        const activeScripts = (scripts || []).filter((s) => s.enabled);
        const results = await searchAggregatedOnlineMusic(q, activeScripts, platform, nextPage);
        if (seq === onlineSeqRef.current) {
          setOnlineTracks(results);
          setOnlinePage(nextPage);
        }
      } catch (err) {
        console.error('Page navigation error:', err);
      } finally {
        if (seq === onlineSeqRef.current) setIsPageLoading(false);
      }
    },
    [committedQuery, isPageLoading, isSearchingOnline, onlineTracks.length, platform, scripts]
  );

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const safeQuery = (inputValue || '').trim();
    commitSearch(safeQuery);
  };

  const isLastPage = onlineTracks.length < ONLINE_PAGE_SIZE;
  const hasQuery = !!committedQuery.trim();

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto animate-in fade-in duration-300">
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
                inputRef.current?.focus();
              }}
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
      {!hasQuery ? (
        <SearchHome
          hotKeywords={hotKeywords}
          history={history}
          onSelectKeyword={commitSearch}
          onClearHistory={handleClearHistory}
          onRemoveHistoryItem={handleRemoveHistoryItem}
        />
      ) : (
        <div className="space-y-4">
          {/* 搜索中 */}
          {isSearchingOnline && onlineTracks.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>正在搜索 “{committedQuery}” ...</span>
            </div>
          )}

          {/* 空结果 */}
          {!isSearchingOnline && onlineTracks.length === 0 && (
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
          )}

          {/* 在线单曲列表 + 分页 */}
          {onlineTracks.length > 0 && (
            <>
              <TrackResultList
                tracks={onlineTracks}
                title={`单曲结果 ${onlineTracks.length < ONLINE_PAGE_SIZE ? onlineTracks.length : `${(onlinePage - 1) * ONLINE_PAGE_SIZE + 1}-${onlinePage * ONLINE_PAGE_SIZE}`}`}
                titleIcon={<Music className="w-4 h-4 text-emerald-400" />}
                showSourceBadge
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                favorites={favorites}
                onPlayTrack={onPlayTrack}
                onToggleFavorite={onToggleFavorite}
                onAddToQueue={onAddToQueue}
                onAddToPlaylist={onOpenAddToPlaylistModal}
                onDownload={onOpenDownload}
                startIndex={(onlinePage - 1) * ONLINE_PAGE_SIZE}
                action={
                  <button
                    onClick={() => onPlayAll(onlineTracks)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/25 transition"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>播放本页</span>
                  </button>
                }
              />

              {/* 分页控件 */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => handleGoPage(onlinePage - 1)}
                  disabled={onlinePage <= 1 || isPageLoading}
                  className="flex items-center gap-1 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/10 text-white text-xs font-semibold border border-white/15 transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>上一页</span>
                </button>

                <span className="text-xs text-slate-400 tabular-nums min-w-16 text-center">
                  {isPageLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  ) : (
                    <>第 {onlinePage} 页{isLastPage ? ' · 末页' : ''}</>
                  )}
                </span>

                <button
                  onClick={() => handleGoPage(onlinePage + 1)}
                  disabled={isLastPage || isPageLoading}
                  className="flex items-center gap-1 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/10 text-white text-xs font-semibold border border-white/15 transition"
                >
                  <span>下一页</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
