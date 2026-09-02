import React from 'react';
import { Search } from 'lucide-react';
import { SuggestItem } from '../../utils/apiV2';

interface SuggestDropdownProps {
  open: boolean;
  suggestions: SuggestItem[];
  query: string;
  activeIndex: number;
  onSelect: (keyword: string) => void;
}

/** Highlight the matched prefix inside a suggestion keyword. */
function Highlight({ keyword, query }: { keyword: string; query: string }) {
  const q = query.trim().toLowerCase();
  const idx = q ? keyword.toLowerCase().indexOf(q) : -1;
  if (idx === -1) return <span>{keyword}</span>;
  return (
    <span>
      {keyword.slice(0, idx)}
      <span className="text-emerald-400 font-semibold">{keyword.slice(idx, idx + q.length)}</span>
      {keyword.slice(idx + q.length)}
    </span>
  );
}

/**
 * 官方搜索联想下拉。键盘 ↑↓/Enter 导航状态由容器维护（activeIndex）。
 */
export const SuggestDropdown: React.FC<SuggestDropdownProps> = ({
  open,
  suggestions,
  query,
  activeIndex,
  onSelect,
}) => {
  if (!open || suggestions.length === 0) return null;

  return (
    <div className="absolute left-0 right-16 top-full mt-2 z-30 rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
        {suggestions.map((item, idx) => (
          <button
            key={`${item.keyword}-${idx}`}
            type="button"
            onMouseDown={(e) => {
              // mousedown so the input doesn't blur before the click registers
              e.preventDefault();
              onSelect(item.keyword);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
              idx === activeIndex ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="text-sm text-slate-200 truncate flex-1">
              <Highlight keyword={item.keyword} query={query} />
            </span>
            {item.hint && (
              <span className="text-[10px] text-slate-500 font-mono flex-shrink-0 hidden sm:inline">{item.hint}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
