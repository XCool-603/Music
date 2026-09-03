import React from 'react';
import { Heart, ListMusic, FileCode, Sliders, Upload, Moon, User } from 'lucide-react';

interface MyViewProps {
  favoritesCount: number;
  queueCount: number;
  scriptsCount: number;
  onNavigateFavorites: () => void;
  onOpenQueue: () => void;
  onNavigateSources: () => void;
  onOpenEQ: () => void;
  onNavigateLocalImport: () => void;
  onOpenSleepTimer: () => void;
}

export const MyView: React.FC<MyViewProps> = ({
  favoritesCount,
  queueCount,
  scriptsCount,
  onNavigateFavorites,
  onOpenQueue,
  onNavigateSources,
  onOpenEQ,
  onNavigateLocalImport,
  onOpenSleepTimer,
}) => {
  const tools = [
    {
      icon: <Heart className="w-6 h-6" />,
      label: '我的喜爱',
      desc: `${favoritesCount} 首收藏`,
      color: 'text-pink-400 bg-pink-500/15 border-pink-500/25',
      onClick: onNavigateFavorites,
    },
    {
      icon: <ListMusic className="w-6 h-6" />,
      label: '播放队列',
      desc: `${queueCount} 首待播`,
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25',
      onClick: onOpenQueue,
    },
    {
      icon: <FileCode className="w-6 h-6" />,
      label: '音源管理',
      desc: `${scriptsCount} 个脚本`,
      color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/25',
      onClick: onNavigateSources,
    },
    {
      icon: <Sliders className="w-6 h-6" />,
      label: 'EQ 均衡器',
      desc: '音质调音',
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/25',
      onClick: onOpenEQ,
    },
    {
      icon: <Upload className="w-6 h-6" />,
      label: '本地导入',
      desc: '导入本地音乐',
      color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/25',
      onClick: onNavigateLocalImport,
    },
    {
      icon: <Moon className="w-6 h-6" />,
      label: '睡眠定时',
      desc: '定时关闭播放',
      color: 'text-purple-400 bg-purple-500/15 border-purple-500/25',
      onClick: onOpenSleepTimer,
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Profile Header */}
      <div className="relative rounded-3xl overflow-hidden bg-white/5 border border-white/10 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-[-30%] right-[-10%] w-80 h-80 bg-indigo-600/20 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-[-30%] left-[-10%] w-80 h-80 bg-emerald-500/15 rounded-full blur-[110px] pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <User className="w-8 h-8 text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">我的</h2>
            <p className="text-xs text-slate-400 mt-0.5">个人收藏、音源与播放工具</p>
          </div>
        </div>
      </div>

      {/* Tool Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tools.map((tool) => (
          <button
            key={tool.label}
            onClick={tool.onClick}
            className={`flex flex-col items-center gap-2.5 p-5 rounded-2xl border transition active:scale-95 hover:brightness-110 ${tool.color}`}
          >
            {tool.icon}
            <div className="text-center">
              <div className="text-sm font-bold text-white">{tool.label}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{tool.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
