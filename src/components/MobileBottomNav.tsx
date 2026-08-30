import React from 'react';
import { ActiveTab } from '../types';
import { Compass, Search, Library, User } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <nav className="h-16 bg-black/60 backdrop-blur-2xl border-t border-white/10 px-2 flex items-center justify-around z-30 select-none">
      <button
        onClick={() => onSelectTab('discover')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
          activeTab === 'discover' ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Compass className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">发现</span>
      </button>

      <button
        onClick={() => onSelectTab('search')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
          activeTab === 'search' ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Search className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">搜索</span>
      </button>

      <button
        onClick={() => onSelectTab('library')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
          activeTab === 'library' || activeTab === 'favorites' || activeTab === 'sources' || activeTab === 'local'
            ? 'text-emerald-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Library className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">曲库</span>
      </button>

      <button
        onClick={() => onSelectTab('mine')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
          activeTab === 'mine' ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <User className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">我的</span>
      </button>
    </nav>
  );
};
