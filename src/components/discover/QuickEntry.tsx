import React from 'react';
import { CalendarDays, Heart, ListMusic, Trophy } from 'lucide-react';

interface QuickEntryProps {
  onDailyRecommend: () => void;
  onNavigate: (path: string) => void;
  scrollToId: (id: string) => void;
}

const TILE_BASE =
  'relative flex items-center gap-3 rounded-2xl p-4 text-white font-semibold overflow-hidden transition transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer';

/**
 * Four quick-entry tiles: daily picks / toplist anchor / playlist anchor / favorites.
 */
export const QuickEntry: React.FC<QuickEntryProps> = ({ onDailyRecommend, onNavigate, scrollToId }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <button className={`${TILE_BASE} bg-gradient-to-br from-emerald-500/80 to-emerald-700/60 shadow-lg shadow-emerald-900/30`} onClick={onDailyRecommend}>
      <CalendarDays className="w-6 h-6 shrink-0" />
      <span>每日推荐</span>
      <span className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
    </button>
    <button className={`${TILE_BASE} bg-gradient-to-br from-amber-500/80 to-orange-700/60 shadow-lg shadow-amber-900/30`} onClick={() => scrollToId('discover-toplist')}>
      <Trophy className="w-6 h-6 shrink-0" />
      <span>排行榜</span>
      <span className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
    </button>
    <button className={`${TILE_BASE} bg-gradient-to-br from-indigo-500/80 to-violet-700/60 shadow-lg shadow-indigo-900/30`} onClick={() => scrollToId('discover-playlists')}>
      <ListMusic className="w-6 h-6 shrink-0" />
      <span>歌单</span>
      <span className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
    </button>
    <button className={`${TILE_BASE} bg-gradient-to-br from-pink-500/80 to-rose-700/60 shadow-lg shadow-pink-900/30`} onClick={() => onNavigate('/favorites')}>
      <Heart className="w-6 h-6 shrink-0" />
      <span>我的收藏</span>
      <span className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
    </button>
  </div>
);
