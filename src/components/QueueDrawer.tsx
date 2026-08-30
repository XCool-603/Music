import React from 'react';
import { Track } from '../types';
import { ListMusic, Trash2, Play, Volume2, X, Music } from 'lucide-react';
import { formatTime } from '../utils/lyricsParser';
import { ImageWithFallback } from './ImageWithFallback';
import { normalizeCoverUrl } from '../utils/imageUtils';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onSelectTrack: (track: Track) => void;
  onRemoveTrack: (trackId: string) => void;
  onClearQueue: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  queue,
  currentTrack,
  isPlaying,
  onSelectTrack,
  onRemoveTrack,
  onClearQueue,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">当前播放队列</h3>
            <span className="text-xs bg-indigo-600/20 text-indigo-300 px-2 py-0.5 rounded-full font-medium">
              {queue.length} 首
            </span>
          </div>
          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={onClearQueue}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-red-400 transition px-2 py-1 rounded hover:bg-neutral-800"
              >
                <Trash2 className="w-3.5 h-3.5" />
                清空
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
              <Music className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">播放队列为空</p>
              <p className="text-xs text-neutral-600 mt-1">点击任意歌曲加入播放队列</p>
            </div>
          ) : (
            queue.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => onSelectTrack(track)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                    isCurrent
                      ? 'bg-indigo-600/15 border border-indigo-500/30 text-white'
                      : 'hover:bg-neutral-800/80 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-center text-xs font-mono text-neutral-500">
                      {isCurrent ? (
                        isPlaying ? (
                          <Volume2 className="w-3.5 h-3.5 text-indigo-400 animate-pulse mx-auto" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-indigo-400 mx-auto" />
                        )
                      ) : (
                        idx + 1
                      )}
                    </span>

                    <ImageWithFallback
                      src={normalizeCoverUrl(track.coverUrl)}
                      alt={track.title}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-sm"
                    />

                    <div className="min-w-0">
                      <div className={`text-sm font-medium truncate ${isCurrent ? 'text-indigo-300 font-semibold' : 'text-neutral-200'}`}>
                        {track.title}
                      </div>
                      <div className="text-xs text-neutral-400 truncate">
                        {track.artist}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-mono text-neutral-500">
                      {formatTime(track.duration)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTrack(track.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 rounded transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
