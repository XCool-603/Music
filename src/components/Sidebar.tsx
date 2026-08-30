import React from 'react';
import { ActiveTab, Playlist, Track } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { normalizeCoverUrl } from '../utils/imageUtils';
import {
  Compass,
  Search,
  Library,
  Heart,
  Upload,
  Sliders,
  Moon,
  Plus,
  Music,
  Sparkles,
  ListMusic,
  Headphones,
  FileCode,
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenCreatePlaylist: () => void;
  onOpenEQ: () => void;
  onOpenSleepTimer: () => void;
  favoritesCount: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  onOpenFullScreen: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  playlists,
  selectedPlaylistId,
  onSelectPlaylist,
  onOpenCreatePlaylist,
  onOpenEQ,
  onOpenSleepTimer,
  favoritesCount,
  currentTrack,
  isPlaying,
  onOpenFullScreen,
}) => {
  const mainNavItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    { id: 'discover', label: '发现音乐', icon: <Compass className="w-4 h-4" /> },
    { id: 'search', label: '搜索中心', icon: <Search className="w-4 h-4" /> },
    { id: 'sources', label: '音源扩展 (JS)', icon: <FileCode className="w-4 h-4" /> },
    { id: 'library', label: '我的音乐库', icon: <Library className="w-4 h-4" /> },
    { id: 'favorites', label: '我喜欢的音乐', icon: <Heart className="w-4 h-4" />, badge: favoritesCount },
    { id: 'local', label: '本地音乐导入', icon: <Upload className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-60 xl:w-64 bg-black/20 backdrop-blur-xl border-r border-white/5 flex flex-col h-full select-none flex-shrink-0">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('discover')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 text-black flex items-center justify-center shadow-lg shadow-indigo-500/20 font-bold">
            <Headphones className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              MUSE.AUDIO
            </h1>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Multi-End Hi-Fi</p>
          </div>
        </div>
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin">
        {/* Navigation Group */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
            在线发现
          </div>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const isActive = activeTab === item.id && !selectedPlaylistId;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-white/10 text-white border border-white/10 backdrop-blur-md shadow-sm'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-transparent'}`} />
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (typeof item.badge === 'number' ? item.badge > 0 : Boolean(item.badge)) && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Audio Tools Group */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
            音质与实验室
          </div>
          <div className="space-y-1">
            <button
              onClick={onOpenEQ}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-sm text-slate-400 hover:bg-white/5 hover:text-slate-100 transition"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-transparent" />
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>10段 EQ 均衡器</span>
            </button>
            <button
              onClick={onOpenSleepTimer}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-sm text-slate-400 hover:bg-white/5 hover:text-slate-100 transition"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-transparent" />
              <Moon className="w-4 h-4 text-purple-400" />
              <span>睡眠倒计时</span>
            </button>
          </div>
        </div>

        {/* Playlists Group */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              我的歌单
            </span>
            <button
              onClick={onOpenCreatePlaylist}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="新建歌单"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {playlists.map((playlist) => {
              const isSelected = selectedPlaylistId === playlist.id;
              return (
                <button
                  key={playlist.id}
                  onClick={() => onSelectPlaylist(playlist)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition truncate ${
                    isSelected
                      ? 'bg-white/10 text-white border border-white/10 backdrop-blur-md shadow-sm'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                  }`}
                >
                  <ImageWithFallback
                    src={normalizeCoverUrl(playlist.coverUrl)}
                    alt={playlist.name}
                    className="w-6 h-6 rounded-lg object-cover flex-shrink-0"
                  />
                  <span className="truncate">{playlist.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-device Sync Banner */}
        <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl backdrop-blur-sm">
          <p className="text-xs text-indigo-300 font-medium">多设备无缝同步</p>
          <p className="text-[10px] text-indigo-300/70 mt-0.5">跨桌面、平板与移动端 Hi-Fi 串流</p>
        </div>
      </div>

      {/* Mini Playing preview at bottom of sidebar */}
      {currentTrack && (
        <div
          onClick={onOpenFullScreen}
          className="p-3 m-3 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 hover:border-white/20 backdrop-blur-md transition group"
        >
          <div className="flex items-center gap-2.5">
            <ImageWithFallback
              src={normalizeCoverUrl(currentTrack.coverUrl)}
              alt={currentTrack.title}
              className={`w-9 h-9 rounded-xl object-cover flex-shrink-0 ring-1 ring-white/10 ${
                isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate group-hover:text-emerald-300 transition">
                {currentTrack.title}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {currentTrack.artist}
              </div>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 opacity-80" />
          </div>
        </div>
      )}
    </aside>
  );
};
