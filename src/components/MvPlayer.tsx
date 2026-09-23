import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, Loader2 } from 'lucide-react';
import { v2MvUrl } from '../utils/apiV2';
import { apiUrl } from '../utils/apiBase';
import { formatTime } from '../utils/lyricsParser';

interface MvPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  mvId: string;
  title: string;
  artist?: string;
}

const STORAGE_KEY = 'muse.mv.res';

function readSavedRes(): number | null {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

function saveRes(r: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(r));
  } catch {
    /* ignore */
  }
}

export const MvPlayer: React.FC<MvPlayerProps> = ({ isOpen, onClose, mvId, title, artist }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [ended, setEnded] = useState(false);
  const [resolutions, setResolutions] = useState<number[]>([]);
  const [selectedRes, setSelectedRes] = useState<number | null>(() => readSavedRes() ?? 720);
  const [resMenuOpen, setResMenuOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<number | null>(null);

  // Official MV CDNs (vod.126.net & friends) reject hotlinked embeds / demand a
  // Referer, so stream through the backend video proxy (Range passthrough,
  // correct Referer, ACAO:*) — same-origin for the WebView, no 403.
  const toPlayableUrl = useCallback((raw: string): string => {
    if (!raw) return '';
    if (raw.startsWith('/api/') || raw.includes('/api/proxy/video')) return raw;
    return apiUrl(`/api/proxy/video?url=${encodeURIComponent(raw)}`);
  }, []);

  const applyUrl = useCallback(
    (r: { url: string; resolutions: number[] }) => {
      setSrc(toPlayableUrl(r.url));
      setResolutions(r.resolutions.length ? r.resolutions : [720]);
    },
    [toPlayableUrl]
  );

  // Load the initial play URL + available resolutions (respect saved preference).
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setSrc('');
    setEnded(false);
    setCurrentTime(0);
    setDuration(0);
    setResMenuOpen(false);
    const res = readSavedRes() ?? 720;
    setSelectedRes(res);
    v2MvUrl(mvId, res).then((r) => {
      if (cancelled) return;
      setLoading(false);
      if (r.url) {
        applyUrl(r);
      } else {
        setError(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, mvId, applyUrl]);

  // Autoplay once a source is ready.
  useEffect(() => {
    if (!isOpen) return;
    if (!src) return;
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {
      /* autoplay may be blocked; user can tap play */
    });
  }, [isOpen, src]);

  const changeQuality = useCallback(
    (res: number) => {
      if (!isOpen) return;
      saveRes(res);
      setSelectedRes(res);
      setResMenuOpen(false);
      setLoading(true);
      setError(false);
      const keepTime = videoRef.current?.currentTime ?? 0;
      v2MvUrl(mvId, res).then((r) => {
        setLoading(false);
        if (r.url) {
          applyUrl(r);
          // Try to resume around the previous position after the source swaps.
          requestAnimationFrame(() => {
            const v = videoRef.current;
            if (v) {
              if (keepTime > 0 && keepTime < v.duration) v.currentTime = keepTime;
              v.play().catch(() => {});
            }
          });
        } else {
          setError(true);
        }
      });
    },
    [isOpen, mvId, applyUrl]
  );

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (ended) {
      v.currentTime = 0;
      setEnded(false);
      v.play().catch(() => {});
      return;
    }
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [ended]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    setCurrentTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }, []);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    const v = videoRef.current;
    if (v) {
      v.volume = vol;
      v.muted = false;
      setIsMuted(false);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!document.fullscreenElement) {
      v.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // Auto-hide the control bar while idle (mouse still / not interacting).
  const wakeControls = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      return;
    }
    window.addEventListener('mousemove', wakeControls);
    window.addEventListener('keydown', wakeControls);
    return () => {
      window.removeEventListener('mousemove', wakeControls);
      window.removeEventListener('keydown', wakeControls);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [isOpen, wakeControls]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setResMenuOpen(false);
        onClose();
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, togglePlay]);

  if (!isOpen) return null;

  const controlsVisible = showControls || loading || error || ended;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black text-slate-100 overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      onMouseMove={wakeControls}
      onClick={wakeControls}
    >
      {/* Top Bar */}
      <div
        className={`flex items-center justify-between px-4 md:px-8 py-4 border-b border-white/10 flex-shrink-0 backdrop-blur-md bg-black/50 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
          aria-label="关闭 MV"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0 text-center px-4">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          {artist && <p className="truncate text-xs text-slate-400">{artist}</p>}
        </div>
        <div className="w-10" />
      </div>

      {/* Video Stage */}
      <div
        className="flex-1 flex items-center justify-center min-h-0 p-4 md:p-8 cursor-pointer"
        onClick={() => {
          if (!loading && !error && src) wakeControls();
        }}
      >
        <div className="relative w-full max-w-5xl">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
              <p className="text-sm">正在加载 MV...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-slate-400 gap-3">
              <p className="text-sm">抱歉，该 MV 暂时无法播放</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-medium transition"
              >
                关闭
              </button>
            </div>
          )}
          {src && !error && (
            <video
              ref={videoRef}
              src={src}
              playsInline
              className="w-full aspect-video bg-black rounded-xl border border-white/10 shadow-2xl shadow-black/50"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              onPlay={() => {
                setIsPlaying(true);
                setEnded(false);
              }}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
              onLoadedMetadata={(e) => {
                const v = e.target as HTMLVideoElement;
                setDuration(v.duration);
                v.volume = volume;
              }}
              onVolumeChange={(e) => setIsMuted((e.target as HTMLVideoElement).muted)}
              onEnded={() => {
                setIsPlaying(false);
                setEnded(true);
              }}
            />
          )}

          {/* Center overlay: play/pause, replay-on-end */}
          {src && !error && !loading && (
            <>
              {ended && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/40 text-white"
                >
                  <span className="p-4 bg-white text-black rounded-full shadow-2xl hover:bg-slate-200 transition active:scale-95 flex items-center justify-center">
                    <RotateCcw className="w-7 h-7" />
                  </span>
                  <span className="text-sm font-medium">重新播放</span>
                </button>
              )}
              {!ended && !isPlaying && !loading && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className={`absolute inset-0 z-10 flex items-center justify-center bg-black/20 transition-opacity duration-300 ${
                    controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <span className="p-4 bg-white/90 text-black rounded-full shadow-2xl hover:bg-white transition active:scale-95 flex items-center justify-center">
                    <Play className="w-7 h-7 fill-current ml-1" />
                  </span>
                </button>
              )}
            </>
          )}

          {/* Bottom Control Bar */}
          {src && !error && !loading && (
            <div
              className={`absolute bottom-0 inset-x-0 px-3 sm:px-4 py-3 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent rounded-bl-xl rounded-br-xl transition-opacity duration-300 ${
                controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={togglePlay}
                className="p-2 bg-white text-black rounded-full shadow-lg hover:bg-slate-200 transition active:scale-95 flex items-center justify-center"
                aria-label={isPlaying ? '暂停' : '播放'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              <span className="text-xs text-slate-300 tabular-nums hidden sm:inline w-20">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.5}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 accent-indigo-500"
                aria-label="进度"
              />
              <span className="text-xs text-slate-300 tabular-nums sm:hidden w-16 text-right">
                {formatTime(currentTime)}
              </span>

              {/* Mute + Volume */}
              <button onClick={toggleMute} className="p-2 text-slate-200 hover:text-white rounded-full hover:bg-white/10 transition" aria-label="静音">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolume}
                className="w-16 sm:w-24 accent-indigo-500"
                aria-label="音量"
              />

              {/* Resolution switcher */}
              {resolutions.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setResMenuOpen((v) => !v)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 transition"
                  >
                    {selectedRes}p
                  </button>
                  {resMenuOpen && (
                    <div className="absolute bottom-full mb-2 right-0 min-w-28 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-xl">
                      {resolutions.map((r) => (
                        <button
                          key={r}
                          onClick={() => changeQuality(r)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition ${
                            r === selectedRes
                              ? 'bg-indigo-500/40 text-white font-bold'
                              : 'text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {r}p
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button onClick={toggleFullscreen} className="p-2 text-slate-200 hover:text-white rounded-full hover:bg-white/10 transition" aria-label="全屏">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MvPlayer;