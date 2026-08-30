import React, { useState } from 'react';
import { Playlist, Track } from '../types';
import { Plus, X, ListPlus, Music, Check } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { normalizeCoverUrl } from '../utils/imageUtils';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePlaylist: (playlist: Omit<Playlist, 'id'>) => void;
  existingPlaylists: Playlist[];
  currentTrackToAddTo?: Track | null;
  onAddTrackToPlaylist?: (playlistId: string, trackId: string) => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreatePlaylist,
  existingPlaylists,
  currentTrackToAddTo,
  onAddTrackToPlaylist,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'add'>(
    currentTrackToAddTo ? 'add' : 'create'
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedCover, setSelectedCover] = useState(
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80'
  );

  if (!isOpen) return null;

  const covers = [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagInput
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    onCreatePlaylist({
      name: name.trim(),
      description: description.trim() || '自建专属歌单',
      coverUrl: selectedCover,
      trackIds: currentTrackToAddTo ? [currentTrackToAddTo.id] : [],
      tags: tags.length > 0 ? tags : ['我的收藏'],
      isCustom: true,
      createdAt: new Date().toLocaleDateString(),
    });

    setName('');
    setDescription('');
    setTagInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-lg">
              {currentTrackToAddTo ? '添加到歌单' : '新建音乐歌单'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentTrackToAddTo && (
          <div className="flex gap-2 my-4 p-1 bg-neutral-800/80 rounded-xl">
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                activeTab === 'add' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              加入已有歌单
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                activeTab === 'create' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              新建并添加
            </button>
          </div>
        )}

        {activeTab === 'add' && currentTrackToAddTo ? (
          <div className="space-y-2 max-h-64 overflow-y-auto mt-2">
            <div className="text-xs text-neutral-400 mb-2">
              正在添加: <span className="text-white font-medium">{currentTrackToAddTo.title}</span>
            </div>
            {existingPlaylists.map((pl) => {
              const alreadyHas = pl.trackIds.includes(currentTrackToAddTo.id);
              return (
                <div
                  key={pl.id}
                  onClick={() => {
                    if (!alreadyHas && onAddTrackToPlaylist) {
                      onAddTrackToPlaylist(pl.id, currentTrackToAddTo.id);
                      onClose();
                    }
                  }}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                    alreadyHas
                      ? 'bg-neutral-800/40 border-neutral-800/50 opacity-60 cursor-default'
                      : 'bg-neutral-800/80 border-neutral-700/50 hover:bg-neutral-800 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ImageWithFallback
                      src={normalizeCoverUrl(pl.coverUrl)}
                      alt={pl.name}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div>
                      <div className="text-sm font-medium text-white">{pl.name}</div>
                      <div className="text-xs text-neutral-400">{pl.trackIds.length} 首歌曲</div>
                    </div>
                  </div>
                  {alreadyHas ? (
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> 已存在
                    </span>
                  ) : (
                    <span className="text-xs text-indigo-400 font-medium">点击添加</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                歌单名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如: 深夜敲代码灵感、晨跑元气歌单"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">歌单描述</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="写点什么介绍这个歌单吧..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">封面选择</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {covers.map((imgUrl, i) => (
                  <ImageWithFallback
                    key={i}
                    src={imgUrl}
                    alt="cover choice"
                    onClick={() => setSelectedCover(imgUrl)}
                    className={`w-12 h-12 rounded-xl object-cover cursor-pointer border-2 transition ${
                      selectedCover === imgUrl
                        ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-500/30'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">标签 (用逗号分隔)</label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="治愈, 流行, 电子"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition"
              >
                立即创建
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
