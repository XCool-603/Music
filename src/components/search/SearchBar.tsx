import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClear: () => void;
}

/**
 * 搜索输入框。仅负责展示与输入事件。
 */
export const SearchBar: React.FC<SearchBarProps> = ({ value, inputRef, onChange, onSubmit, onClear }) => (
  <form onSubmit={onSubmit} className="relative flex items-center mb-4">
    <div className="relative flex-1 flex items-center bg-white/10 border border-white/20 rounded-2xl px-4 py-3.5 backdrop-blur-xl focus-within:border-emerald-400/80 focus-within:ring-2 focus-within:ring-emerald-400/20 transition shadow-inner">
      <Search className="w-5 h-5 text-slate-300 mr-3 flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索歌曲名（如：周杰伦 夜曲、晴天）、歌手、专辑、曲风..."
        className="bg-transparent border-none outline-none text-sm sm:text-base text-white placeholder:text-slate-400 w-full"
        autoComplete="off"
        autoFocus
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
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
);
