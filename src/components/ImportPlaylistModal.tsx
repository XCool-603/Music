import React, { useState } from 'react';
import { X, Download, AlertCircle, CheckCircle2, Loader2, Link2 } from 'lucide-react';
import { importExternalPlaylist, ImportedPlaylistResult } from '../utils/playlistImporter';
import { Playlist, Track } from '../types';

interface ImportPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (newPlaylist: Playlist, tracks: Track[]) => void;
}

export const ImportPlaylistModal: React.FC<ImportPlaylistModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [parsedResult, setParsedResult] = useState<ImportedPlaylistResult | null>(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!urlInput.trim()) {
      setErrorMsg('请输入歌单链接或纯数字歌单 ID');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    setParsedResult(null);

    try {
      const result = await importExternalPlaylist(urlInput);
      setParsedResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || '歌单解析失败，请检查网络或链接是否有效');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedResult) return;

    const newPlaylist: Playlist = {
      id: `imported_${Date.now()}`,
      name: parsedResult.name,
      description: parsedResult.description,
      coverUrl: parsedResult.coverUrl,
      trackIds: parsedResult.tracks.map((t) => t.id),
      isCustom: true,
      tags: ['导入歌单'],
      createdAt: new Date().toISOString(),
    };

    onImportSuccess(newPlaylist, parsedResult.tracks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">导入外部歌单</h2>
              <p className="text-xs text-slate-400">支持网易云音乐、QQ音乐歌单分享链接或歌单 ID 一键导入</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Input Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
              歌单链接或 ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="例如：https://music.163.com/playlist?id=3778678 或纯数字 3778678"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                className="flex-1 px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <button
                onClick={handleParse}
                disabled={isLoading || !urlInput.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-900/20"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '解析'}
              </button>
            </div>
          </div>

          {/* Error notice */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Result Card */}
          {parsedResult && (
            <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3.5">
                <img
                  src={parsedResult.coverUrl}
                  alt={parsedResult.name}
                  className="w-16 h-16 rounded-lg object-cover shadow-md border border-slate-700 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded font-medium">
                      解析成功
                    </span>
                    <span className="text-xs text-slate-400">共 {parsedResult.trackCount} 首歌曲</span>
                  </div>
                  <h3 className="text-sm font-bold text-white truncate mt-1">{parsedResult.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{parsedResult.description}</p>
                </div>
              </div>

              {/* Tracks preview list */}
              <div className="border-t border-slate-700/60 pt-2.5">
                <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex justify-between">
                  <span>曲目预览 (前 5 首)</span>
                  <span className="text-emerald-400">全部 {parsedResult.trackCount} 首均将导入</span>
                </div>
                <div className="space-y-1">
                  {parsedResult.tracks.slice(0, 5).map((track, i) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-700/30"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] text-slate-500 w-4">{i + 1}</span>
                        <span className="text-slate-200 truncate">{track.title}</span>
                        <span className="text-[10px] text-slate-500 truncate">- {track.artist}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-950 border-t border-slate-800/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
          >
            取消
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!parsedResult}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition flex items-center gap-1.5 shadow-lg shadow-emerald-900/30"
          >
            <CheckCircle2 className="w-4 h-4" />
            一键导入本地歌单
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportPlaylistModal;
