import React from 'react';
import { Play, Plus, Download, Sparkles } from 'lucide-react';
import { Track } from '../../types';
import { ImageWithFallback } from '../ImageWithFallback';
import { normalizeCoverUrl } from '../../utils/imageUtils';

export type BestMatch =
  | { type: 'track'; data: Track }
  | { type: 'artist'; data: { name: string; coverUrl: string; genre: string; tracks: Track[] } };

interface BestMatchHeroProps {
  bestMatch: BestMatch | null;
  onPlayTrack: (track: Track) => void;
  onPlayAll: (tracks: Track[]) => void;
  onAddToQueue: (track: Track) => void;
  onOpenDownload?: (track: Track) => void;
}

/**
 * 「最佳匹配推荐」英雄卡（自原 SearchView L652-746 原样抽取）。
 */
export const BestMatchHero: React.FC<BestMatchHeroProps> = ({
  bestMatch,
  onPlayTrack,
  onPlayAll,
  onAddToQueue,
  onOpenDownload,
}) => {
  if (!bestMatch) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-950/40 via-white/5 to-white/5 rounded-3xl p-5 sm:p-6 border border-emerald-500/20 shadow-2xl">
      <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" /> 最佳匹配推荐
      </div>

      {bestMatch.type === 'track' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg ring-1 ring-white/10">
              <ImageWithFallback
                src={normalizeCoverUrl(bestMatch.data.coverUrl)}
                alt={bestMatch.data.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  单曲
                </span>
                <span className="text-xs text-slate-400 font-mono">{bestMatch.data.genre}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mt-1">{bestMatch.data.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {bestMatch.data.artist} · 《{bestMatch.data.album}》
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onPlayTrack(bestMatch.data)}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 text-black font-bold text-xs rounded-full shadow-lg shadow-white/10 transition transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>立即播放</span>
            </button>
            <button
              onClick={() => onOpenDownload?.(bestMatch.data)}
              className="px-4 py-2.5 bg-white/10 hover:bg-emerald-500/20 text-white hover:text-emerald-300 font-medium text-xs rounded-full border border-white/15 hover:border-emerald-500/30 transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>下载</span>
            </button>
            <button
              onClick={() => onAddToQueue(bestMatch.data)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium text-xs rounded-full border border-white/15 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>加入队列</span>
            </button>
          </div>
        </div>
      )}

      {bestMatch.type === 'artist' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex-shrink-0 shadow-lg ring-2 ring-emerald-500/30">
              <ImageWithFallback
                src={normalizeCoverUrl(bestMatch.data.coverUrl)}
                alt={bestMatch.data.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  音乐人 / 歌手
                </span>
                <span className="text-xs text-slate-400 font-mono">{bestMatch.data.genre}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mt-1">{bestMatch.data.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">收录作品 {bestMatch.data.tracks.length} 首</p>
            </div>
          </div>

          <button
            onClick={() => onPlayAll(bestMatch.data.tracks)}
            className="px-5 py-2.5 bg-white hover:bg-slate-100 text-black font-bold text-xs rounded-full shadow-lg shadow-white/10 transition transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>播放歌手全部单曲</span>
          </button>
        </div>
      )}
    </div>
  );
};
