import React from 'react';

export type SearchFilterTab = 'all' | 'songs' | 'playlists' | 'artists' | 'albums' | 'lyrics' | 'scripts';

export interface ResultTab {
  id: SearchFilterTab;
  label: string;
  count: number;
}

interface ResultTabsProps {
  tabs: ResultTab[];
  active: SearchFilterTab;
  total: number;
  query: string;
  onChange: (tab: SearchFilterTab) => void;
}

/**
 * 结果分类过滤 chips（综合|单曲|歌单|歌手|专辑|歌词|JS音源）。
 */
export const ResultTabs: React.FC<ResultTabsProps> = ({ tabs, active, total, query, onChange }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
            active === tab.id
              ? 'bg-white text-black font-bold shadow-md shadow-white/10'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
          }`}
        >
          <span>{tab.label}</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              active === tab.id ? 'bg-black/10 text-black' : 'bg-white/10 text-slate-400'
            }`}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>

    <div className="text-xs text-slate-400 font-medium">
      共找到 <span className="text-emerald-400 font-bold">{total}</span> 条与 “{query}” 相关结果
    </div>
  </div>
);
