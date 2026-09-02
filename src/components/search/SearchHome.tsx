import React from 'react';
import { History, Trash2, Flame, TrendingUp, X, ArrowRight } from 'lucide-react';
import { HotKeyword } from '../../utils/apiV2';
import { GENRE_CARDS, HOT_SEARCH_FALLBACK } from './hotSearchFallback';

interface SearchHomeProps {
  hotKeywords: HotKeyword[];
  history: string[];
  onSelectKeyword: (keyword: string) => void;
  onClearHistory: () => void;
  onRemoveHistoryItem: (e: React.MouseEvent, item: string) => void;
}

/**
 * 无查询时的搜索首页：历史 chips + 官方热搜榜（降级本地常量）+ 曲风探索卡。
 */
export const SearchHome: React.FC<SearchHomeProps> = ({
  hotKeywords,
  history,
  onSelectKeyword,
  onClearHistory,
  onRemoveHistoryItem,
}) => {
  const hotItems = hotKeywords.length > 0
    ? hotKeywords.slice(0, 8).map((k) => ({
        keyword: k.keyword,
        tag: k.tag || 'HOT',
        count: k.score || '',
      }))
    : HOT_SEARCH_FALLBACK;

  return (
    <div className="space-y-8">
      {/* 搜索历史 */}
      {history.length > 0 && (
        <div className="bg-white/5 rounded-3xl p-5 sm:p-6 border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <History className="w-4 h-4 text-slate-400" />
              <span>搜索历史</span>
            </div>
            <button
              onClick={onClearHistory}
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
                onClick={() => onSelectKeyword(item)}
                className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-slate-300 hover:text-white transition cursor-pointer"
              >
                <span>{item}</span>
                <button
                  onClick={(e) => onRemoveHistoryItem(e, item)}
                  className="text-slate-500 group-hover:text-slate-300 hover:!text-rose-400 p-0.5 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 热门搜索 */}
      <div className="bg-white/5 rounded-3xl p-5 sm:p-6 border border-white/10 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Flame className="w-5 h-5 text-amber-400" />
            <span>热门搜索 · 大家都在搜</span>
          </div>
          <span className="text-xs text-slate-400">实时热度更新</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {hotItems.map((item, index) => (
            <div
              key={`${item.keyword}-${index}`}
              onClick={() => onSelectKeyword(item.keyword)}
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
                {item.tag && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                      item.tag === 'HOT'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {item.tag}
                  </span>
                )}
                {item.count && (
                  <span className="text-[10px] text-slate-500 font-mono hidden xl:inline">{item.count}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 曲风探索 */}
      <div>
        <div className="flex items-center gap-2 text-white font-bold text-base mb-4">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <span>曲风与情绪分类探索</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {GENRE_CARDS.map((card) => (
            <div
              key={card.name}
              onClick={() => onSelectKeyword(card.query)}
              className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} border ${card.border} hover:scale-[1.02] transition cursor-pointer flex flex-col justify-between h-28 shadow-lg group`}
            >
              <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition">{card.name}</div>
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>即刻探索</span>
                <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
