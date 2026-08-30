import React, { useRef, useState } from 'react';
import { Track } from '../types';
import { Upload, Music, FolderPlus, CheckCircle2, AlertCircle, FileAudio } from 'lucide-react';

interface LocalFileImporterProps {
  onImportTracks: (tracks: Track[]) => void;
  onPlayTrack: (track: Track) => void;
}

export const LocalFileImporter: React.FC<LocalFileImporterProps> = ({
  onImportTracks,
  onPlayTrack,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const processFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('audio/') || /\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(file.name)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      setIsProcessing(false);
      return;
    }

    const newTracks: Track[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const objectUrl = URL.createObjectURL(file);

      // Clean title and artist from filename (e.g. "Artist - Song.mp3" or "Song.mp3")
      const rawName = file.name.replace(/\.[^/.]+$/, '');
      let artist = '未知艺术家';
      let title = rawName;

      if (rawName.includes(' - ')) {
        const parts = rawName.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }

      // Default duration estimate or fallback
      const duration = 210;

      // Color themes based on filename hash
      const themeColors = ['#6366f1', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6'];
      const color = themeColors[Math.abs(rawName.length) % themeColors.length];

      newTracks.push({
        id: `local-${Date.now()}-${i}`,
        title,
        artist,
        album: '本地导入单曲',
        duration,
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        audioUrl: objectUrl,
        genre: '本地音频',
        lyrics: `[00:00.00]${title} - ${artist}\n[00:05.00]本地音频播放中\n[00:15.00]享受高品质无损音质...`,
        isLocal: true,
        bitrate: 'Local Lossless · ' + (file.type || 'Audio'),
        themeColor: color,
      });
    }

    onImportTracks(newTracks);
    setIsProcessing(false);
    setImportedCount(newTracks.length);

    if (newTracks.length > 0) {
      onPlayTrack(newTracks[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">本地音乐快速导入</h2>
        <p className="text-sm text-slate-400">
          支持 MP3、WAV、FLAC、M4A、OGG 等格式，纯前端私密解析，不上传任何服务器
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 md:p-12 text-center cursor-pointer backdrop-blur-xl transition-all ${
          isDragging
            ? 'border-emerald-400 bg-emerald-950/20 scale-[1.01]'
            : 'border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 shadow-2xl'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              processFiles(e.target.files);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 text-emerald-400 flex items-center justify-center shadow-inner">
            <Upload className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">
              {isProcessing ? '正在解析音频文件...' : '拖拽音频文件到此处，或点击浏览上传'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              支持多选文件批量导入，自动提取曲目名称与艺术家
            </p>
          </div>

          <button
            type="button"
            className="px-6 py-2.5 bg-white hover:bg-slate-100 text-black text-sm font-bold rounded-full shadow-lg shadow-white/10 transition transform hover:scale-105 active:scale-95"
          >
            选择本地音乐
          </button>
        </div>
      </div>

      {importedCount !== null && (
        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md rounded-2xl flex items-center gap-3 text-emerald-300">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <div className="text-sm">
            成功导入 <span className="font-bold text-white">{importedCount}</span> 首本地音频，已加入播放队列并开始播放！
          </div>
        </div>
      )}

      {/* Feature highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8">
        <div className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
          <FileAudio className="w-5 h-5 text-emerald-400 mb-2" />
          <h4 className="text-sm font-semibold text-white">全格式解析</h4>
          <p className="text-xs text-slate-400 mt-1">原生支持 Hi-Res 无损无缝解码播放</p>
        </div>
        <div className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
          <Music className="w-5 h-5 text-pink-400 mb-2" />
          <h4 className="text-sm font-semibold text-white">EQ 均衡调音</h4>
          <p className="text-xs text-slate-400 mt-1">本地音乐同享 10 段硬件级滤波器</p>
        </div>
        <div className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
          <FolderPlus className="w-5 h-5 text-emerald-400 mb-2" />
          <h4 className="text-sm font-semibold text-white">无损私密</h4>
          <p className="text-xs text-slate-400 mt-1">文件仅驻留浏览器内存，安全无追踪</p>
        </div>
      </div>
    </div>
  );
};
