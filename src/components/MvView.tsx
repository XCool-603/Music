import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clapperboard, Search, PlayCircle, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { v2MvSearch, MvItem } from '../utils/apiV2';
import { MvPlayer } from './MvPlayer';

interface MvViewProps {
  initialQuery?: string;
}

export const MvView: React.FC<MvViewProps> = ({ initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [input, setInput] = useState(initialQuery || '');
  const [mvs, setMvs] = useState<MvItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 24;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [activeMv, setActiveMv] = useState<MvItem | null>(null);

  const doSearch = useCallback(async (q: string, p: number) => {
    if (!q.trim()) {
      setMvs([]);
      setTotal(0);
      setPage(1);
      return;
    }
    setLoading(true);
    const res = await v2MvSearch(q, p, pageSize);
    setMvs(res.mvs);
    setTotal(res.total);
    setPage(p);
    setLoading(false);
  }, []);

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      if (initialQuery.trim()) {
        setQuery(initialQuery);
        setInput(initialQuery);
        doSearch(initialQuery, 1);
      }
      return;
    }
  }, [initialQuery, doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setQuery(input.trim());
    doSearch(input.trim(), 1);
  };

  const formatCount = (n?: number) => {
    if (n == null) return '';
    if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`;
    if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
    return String(n);
  };

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-900/40">
          <Clapperboard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">MV 音乐视频</h2>
          <p className="text-xs text-slate-400">搜索并观看高清音乐视频 · 网易云音乐官方接口</p>
        </div>
      </div>

      {/* Search Box */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="搜索 MV,如:歌手名、歌曲名..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/60 focus:bg-white/10 transition"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>搜索</span>
        </button>
      </form>

      {/* Result Info */}
      {query.trim() && !loading && (
        <p className="text-xs text-slate-500">
          找到 <span className="text-indigo-400 font-semibold">{total}</span> 个 MV · 第 {page}/{totalPages} 页
        </p>
      )}

      {/* MV Grid */}
      {loading && mvs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <p className="text-sm">正在搜索 MV...</p>
        </div>
      ) : mvs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2 text-slate-500">
          <Clapperboard className="w-8 h-8 text-slate-600" />
          <p className="text-sm">{query ? '没有找到相关 MV,换个关键词试试' : '输入关键词搜索音乐视频'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {mvs.map((mv) => (
            <button
              key={mv.id}
              onClick={() => setActiveMv(mv)}
              className="group text-left rounded-2xl p-2.5 transition bg-white/5 hover:bg-white/10 cursor-pointer"
            >
              <div className="relative mb-2 aspect-video overflow-hidden rounded-xl bg-black/40">
                <img
                  src={mv.cover}
                  alt={mv.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/30">
                  <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
                </div>
                <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-medium tabular-nums text-slate-200">
                  {formatDuration(mv.durationMs)}
                </span>
                {typeof mv.playCount === 'number' && mv.playCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-slate-200">
                    ▶ {formatCount(mv.playCount)}
                  </span>
                )}
              </div>
              <p className="truncate text-sm font-semibold text-white">{mv.name}</p>
              <p className="truncate text-xs text-slate-400 mt-0.5">{mv.artist}</p>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => doSearch(query, page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-slate-300 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" /> 上一页
          </button>
          <span className="text-sm text-slate-400 tabular-nums">{page} / {totalPages}</span>
          <button
            onClick={() => doSearch(query, page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-slate-300 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            下一页 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Player */}
      <MvPlayer
        isOpen={Boolean(activeMv)}
        onClose={() => setActiveMv(null)}
        mvId={activeMv?.id || ''}
        title={activeMv?.name || ''}
        artist={activeMv?.artist}
      />
    </div>
  );
};
