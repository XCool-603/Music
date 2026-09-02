import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams, Routes, Route, Navigate } from 'react-router-dom';
import {
  Track,
  Playlist,
  PlaybackMode,
  ActiveTab,
  AudioSettings,
  StreamQuality,
  CustomSourceScript,
} from './types';
import { audioEngine, EQ_PRESETS } from './utils/audioEngine';
import { setPlaybackState, initNativePlayback } from './utils/nativeAudio';
import { getNativeSnapshot } from './utils/nativeAudio';
import { apiUrl } from './utils/apiBase';
import {
  parseScriptMetadata,
  SourceScriptRunner,
  DEFAULT_OPEN_SOURCE_SCRIPT,
  DEFAULT_LOFI_SOURCE_SCRIPT,
} from './utils/sourceScriptEngine';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DiscoverView } from './components/DiscoverView';
import { SearchView } from './components/SearchView';
import { PlaylistDetailView } from './components/PlaylistDetailView';
import { LibraryView } from './components/LibraryView';
import { LocalFileImporter } from './components/LocalFileImporter';
import { SourceScriptManagerView } from './components/SourceScriptManagerView';
import { BottomPlayerBar } from './components/BottomPlayerBar';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { EqualizerModal } from './components/EqualizerModal';
import { QueueDrawer } from './components/QueueDrawer';
import { SleepTimerModal } from './components/SleepTimerModal';
import { PlaylistModal } from './components/PlaylistModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MyView } from './components/MyView';
import { DownloadModal } from './components/DownloadModal';
import { DownloadToastNotification } from './components/DownloadToastNotification';
import { downloadBatchTracks } from './utils/downloadManager';

const TAB_TO_PATH: Record<string, string> = {
  discover: '/',
  search: '/search',
  sources: '/sources',
  'playlist-detail': '/playlist',
  library: '/library',
  favorites: '/favorites',
  local: '/local',
  mine: '/mine',
};

const PATH_TO_TAB: Record<string, string> = {
  '/': 'discover',
  '/search': 'search',
  '/sources': 'sources',
  '/playlist': 'playlist-detail',
  '/library': 'library',
  '/favorites': 'favorites',
  '/local': 'local',
  '/mine': 'mine',
};

function PlaylistDetailRoute(
  props: Omit<React.ComponentProps<typeof PlaylistDetailView>, 'playlist'> & { playlists: Playlist[] }
) {
  const { playlists, ...viewProps } = props;
  const { id } = useParams();
  const playlist = playlists.find((p) => p.id === id);
  if (!playlist) {
    return <div className="p-8 text-sm text-slate-400">歌单不存在或已被删除</div>;
  }
  return <PlaylistDetailView {...viewProps} playlist={playlist} />;
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  // --- Persistent & Core State ---
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load discovery data from .NET backend on mount
  useEffect(() => {
    async function loadDiscovery() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(apiUrl('/api/discovery'), { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();

        const apiTracks: Track[] = data.trendingTracks || [];
        const apiPlaylists: Playlist[] = data.playlists || [];

        // Merge with user-imported local tracks from localStorage
        const saved = localStorage.getItem('wavesound_local_tracks');
        const localTracks: Track[] = saved ? (() => { try { return JSON.parse(saved); } catch { return []; } })() : [];
        setTracks([...apiTracks, ...localTracks]);

        // Merge with user-created playlists from localStorage
        const savedPl = localStorage.getItem('wavesound_custom_playlists');
        const customPlaylists: Playlist[] = savedPl ? (() => { try { return JSON.parse(savedPl); } catch { return []; } })() : [];
        setPlaylists([...apiPlaylists, ...customPlaylists]);

        setDataLoaded(true);
      } catch (err) {
        clearTimeout(timeout);
        console.error('Failed to load discovery data:', err);
        // Fallback: try loading from localStorage only
        const saved = localStorage.getItem('wavesound_local_tracks');
        if (saved) { try { setTracks(JSON.parse(saved)); } catch {} }
        const savedPl = localStorage.getItem('wavesound_custom_playlists');
        if (savedPl) { try { setPlaylists(JSON.parse(savedPl)); } catch {} }
        setDataLoaded(true);
      }
    }
    loadDiscovery();
  }, []);

  // Initialize currentTrack and queue once tracks are loaded
  useEffect(() => {
    if (dataLoaded && tracks.length > 0 && !currentTrack) {
      setCurrentTrack(tracks[0]);
      setQueue(tracks);
    }
  }, [dataLoaded, tracks]);

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('wavesound_favorites');
    return saved ? JSON.parse(saved) : ['kw_118980', 'kw_228908'];
  });

  const [recentHistory, setRecentHistory] = useState<string[]>(['kw_118980', 'kw_93157']);

  // --- Custom Source Scripts (LX Music Compatible) ---
  const [customScripts, setCustomScripts] = useState<CustomSourceScript[]>(() => {
    const saved = localStorage.getItem('muse_custom_source_scripts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: CustomSourceScript) => {
            if (s.id === 'default_open_audio_script') {
              return { ...s, rawCode: DEFAULT_OPEN_SOURCE_SCRIPT };
            }
            if (s.id === 'default_lofi_source_script') {
              return { ...s, rawCode: DEFAULT_LOFI_SOURCE_SCRIPT };
            }
            return s;
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Default initial scripts
    const meta1 = parseScriptMetadata(DEFAULT_OPEN_SOURCE_SCRIPT);
    const script1: CustomSourceScript = {
      id: 'default_open_audio_script',
      name: meta1.name || '洛雪开放公共音源扩展',
      version: meta1.version || '1.2.0',
      author: meta1.author || 'LX-Community',
      description: meta1.description || '支持开放公共音频库检索与多音质播放',
      enabled: true,
      rawCode: DEFAULT_OPEN_SOURCE_SCRIPT,
      sources: ['wy', 'tx', 'kw', 'ambient'],
      qualities: ['128k', '320k', 'flac', 'flac24bit'],
      homepage: 'https://github.com/lyswhut/lx-music-desktop',
      importedAt: '系统内置',
      status: 'ready',
    };

    const meta2 = parseScriptMetadata(DEFAULT_LOFI_SOURCE_SCRIPT);
    const script2: CustomSourceScript = {
      id: 'default_lofi_source_script',
      name: meta2.name || '极简 Lo-Fi & 自然疗愈音源',
      version: meta2.version || '1.0.4',
      author: meta2.author || 'SoundHealer',
      description: meta2.description || '专注与睡眠设计的音频流聚合脚本',
      enabled: true,
      rawCode: DEFAULT_LOFI_SOURCE_SCRIPT,
      sources: ['lofi'],
      qualities: ['320k', 'flac'],
      homepage: 'https://github.com',
      importedAt: '系统内置',
      status: 'ready',
    };

    return [script1, script2];
  });

  // Save custom source scripts
  useEffect(() => {
    try {
      localStorage.setItem('muse_custom_source_scripts', JSON.stringify(customScripts));
    } catch (e) {
      console.error(e);
    }
  }, [customScripts]);

  // --- Audio State ---
  const [nativeDiag, setNativeDiag] = useState<{ engaged: boolean; ticks: number } | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('sequence');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [queue, setQueue] = useState<Track[]>([]);

  // --- Audio Settings (EQ / Bass / 3D / DSP Suite) ---
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => {
    try {
      const saved = localStorage.getItem('muse_audio_settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      playbackSpeed: 1.0,
      quality: 'high',
      bassBoost: 0,
      trebleAir: 0,
      vocalClarity: 0,
      surround3D: false,
      spatialMode: 'off',
      stereoWidth: 100,
      tubeWarmth: 0,
      compressorEnabled: true,
      preampGain: 0,
      isBypassed: false,
      bandsMode: '10',
      eqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      selectedPreset: 'flat',
    };
  });

  // Save Audio Settings to localStorage & sync with audioEngine on boot
  useEffect(() => {
    try {
      localStorage.setItem('muse_audio_settings', JSON.stringify(audioSettings));
      audioEngine.applySettings(audioSettings);
    } catch (e) {
      console.error(e);
    }
  }, [audioSettings]);

  // --- Navigation & Modal UI State ---
  const activeTab = (PATH_TO_TAB[location.pathname] || 'discover') as ActiveTab;
  const searchQueryFromState = (location.state as { q?: string } | null)?.q;
  const selectedPlaylistId = location.pathname.startsWith('/playlist/')
    ? location.pathname.split('/')[2] || null
    : null;

  const goTab = useCallback((tab: ActiveTab) => {
    navigate(TAB_TO_PATH[tab] || '/');
  }, [navigate]);

  const goPlaylist = useCallback((pl: Playlist) => {
    navigate(`/playlist/${encodeURIComponent(pl.id)}`);
  }, [navigate]);

  const [searchQuery, setSearchQuery] = useState('野花野草');
  const [isFullScreenPlayerOpen, setIsFullScreenPlayerOpen] = useState(false);
  const [isEQModalOpen, setIsEQModalOpen] = useState(false);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false);
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<Track | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [trackToDownload, setTrackToDownload] = useState<Track | null>(null);

  const handleOpenDownload = useCallback((track: Track) => {
    setTrackToDownload(track);
    setIsDownloadModalOpen(true);
  }, []);

  const handleBatchDownload = useCallback(async (tracksToDownload: Track[]) => {
    await downloadBatchTracks(tracksToDownload, customScripts);
  }, [customScripts]);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('wavesound_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Latest-state refs so the audio element's onended handler (bound at loadTrack time)
  // always executes up-to-date loop mode / queue / current track logic.
  const playbackModeRef = useRef(playbackMode);
  const queueRef = useRef(queue);
  const currentTrackRef = useRef(currentTrack);
  const handlePlayTrackRef = useRef<(track: Track) => void>(() => {});
  const handleNextRef = useRef<() => void>(() => {});
  const handlePrevRef = useRef<() => void>(() => {});
  useEffect(() => { playbackModeRef.current = playbackMode; }, [playbackMode]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  const audioSettingsRef = useRef(audioSettings);
  useEffect(() => { audioSettingsRef.current = audioSettings; }, [audioSettings]);

  // Handle track playback loop on end
  const handleTrackEnded = useCallback(() => {
    const mode = playbackModeRef.current;
    const q = queueRef.current;
    const track = currentTrackRef.current;

    if (mode === 'repeat-one') {
      // Reload the current track to guarantee a clean restart for streamed audio.
      if (track) {
        handlePlayTrackRef.current(track);
      }
      return;
    }

    if (q.length === 0) {
      setIsPlaying(false);
      return;
    }

    let nextIndex = 0;
    const currentIndex = q.findIndex((t) => t.id === track?.id);

    if (mode === 'shuffle') {
      nextIndex = Math.floor(Math.random() * q.length);
    } else if (mode === 'repeat-all') {
      nextIndex = (currentIndex + 1) % q.length;
    } else {
      // Sequence
      if (currentIndex < q.length - 1) {
        nextIndex = currentIndex + 1;
      } else {
        setIsPlaying(false);
        return;
      }
    }

    const nextTrack = q[nextIndex];
    if (nextTrack) {
      handlePlayTrackRef.current(nextTrack);
    }
  }, []);

  // Load and play track
  const handlePlayTrack = useCallback(
    async (track: Track) => {
      let resolvedTrack = track;

      // 1. If track is specifically bound to a custom user script
      const specificScript = track.sourceScriptId ? customScripts.find((s) => s.id === track.sourceScriptId) : null;

      if (specificScript && specificScript.enabled) {
        try {
          const runner = new SourceScriptRunner(specificScript);
          const initRes = await runner.init();
          if (initRes.success) {
            const url = await runner.resolveAudioUrl(track);
            const lyric = await runner.resolveLyric(track);
            if (typeof url === 'string' && url.trim() && !url.includes('itunes.apple.com')) {
              resolvedTrack = {
                ...track,
                audioUrl: url.trim(),
                lyrics: typeof lyric === 'string' && lyric.trim() ? lyric : track.lyrics,
                sourceScriptId: specificScript.id,
                sourceName: specificScript.name,
              };
            }
          }
        } catch (e) {
          console.error('Failed resolving track from custom source script runner:', e);
        }
      }

      // 2. If track needs full real dynamic synchronized LRC
      if (
        resolvedTrack.sourceRawInfo?.id &&
        (!resolvedTrack.lyrics || resolvedTrack.lyrics.includes('正在同步声学动态频谱') || resolvedTrack.lyrics.length < 50)
      ) {
        try {
          const songId = resolvedTrack.sourceRawInfo.id;
          const lrcRes = await fetch(
            apiUrl(`/api/music/lyric?source=${resolvedTrack.sourceKey || 'netease'}&id=${encodeURIComponent(
              songId
            )}&rid=${encodeURIComponent(songId)}`)
          );
          if (lrcRes.ok) {
            const lrcData = await lrcRes.json();
            if (lrcData && lrcData.lrc) {
              resolvedTrack.lyrics = lrcData.lrc;
            }
          }
        } catch (lrcErr) {
          console.log('Fetch lrc error:', lrcErr);
        }
      }

      setCurrentTrack(resolvedTrack);
      setCurrentTime(0);
      setDuration(resolvedTrack.duration);

      // Add to queue if not present
      setQueue((prev) => {
        if (prev.some((t) => t.id === resolvedTrack.id)) return prev;
        return [resolvedTrack, ...prev];
      });

      // Add to history
      setRecentHistory((prev) => [resolvedTrack.id, ...prev.filter((id) => id !== resolvedTrack.id)].slice(0, 30));

      // Apply user-selected stream quality tier to API-backed audio URLs.
      // Prefer the direct official/CDN link (single-bandwidth) so playback does
      // not relay twice through the backend. The WebAudio DSP graph (EQ etc.)
      // requires the media to be CORS-accessible or it outputs silence, so we
      // probe the CDN link first: on success play it directly; on CORS/network
      // failure fall back to the backend proxied stream (which sends ACAO:* and
      // always produces sound).
      const q = audioSettingsRef.current.quality || 'high';
      let finalAudioUrl = resolvedTrack.audioUrl;

      if (resolvedTrack.audioUrl.includes('/api/music/stream')) {
        const src = resolvedTrack.sourceKey || (resolvedTrack.id.startsWith('ne_') ? 'netease' : 'kuwo');
        const rid =
          resolvedTrack.sourceRawInfo?.id ||
          resolvedTrack.sourceRawInfo?.songmid ||
          resolvedTrack.id.replace(/^(kw_|ne_|tx_)/, '');
        try {
          const r = await fetch(
            apiUrl(`/api/music/stream-url?source=${src}&id=${encodeURIComponent(rid)}&rid=${encodeURIComponent(rid)}&level=${q}`)
          );
          if (r.ok) {
            const data = await r.json();
            if (data && data.url) {
              // Probe CORS: HEAD/GET through fetch. If Ok, the CDN exposes
              // cross-origin audio that MediaElementSource can decode.
              try {
                const probe = await fetch(data.url, { method: 'HEAD', mode: 'cors' });
                if (probe.ok) {
                  finalAudioUrl = data.url;
                } else {
                  console.debug('[Audio] CDN direct blocked (no CORS), using proxied stream:', probe.status);
                }
              } catch (probeErr) {
                console.debug('[Audio] CDN direct unreachable, using proxied stream:', probeErr);
              }
            }
          }
        } catch (err) {
          console.warn('Direct stream-url resolve failed, using proxied stream:', err);
        }
        if (finalAudioUrl.includes('/api/music/stream')) {
          finalAudioUrl =
            finalAudioUrl.replace(/(level=)[^&]*/, `$1${q}`) +
            (finalAudioUrl.includes('level=') ? '' : `&level=${q}`);
        }
      }

      audioEngine.setPlaybackRate(playbackSpeed);
      // Wait for loadTrack to finish setting the source (native or HTML5)
      // before starting playback, avoiding a play-before-source race.
      await audioEngine.loadTrack(
        finalAudioUrl,
        handleTrackEnded,
        (err) => console.log('Handling stream fallback with Web Audio...')
      );
      audioEngine.play();
      setIsPlaying(true);
    },
    [handleTrackEnded, playbackSpeed, customScripts, audioSettings.quality]
  );

  // Keep the latest handlePlayTrack accessible to the stable onended callback.
  useEffect(() => {
    handlePlayTrackRef.current = handlePlayTrack;
  }, [handlePlayTrack]);

  // Periodic time update listener
  useEffect(() => {
    let animId: number;
    const update = () => {
      if (isPlaying) {
        const cur = audioEngine.getCurrentTime();
        const dur = audioEngine.getDuration();
        setCurrentTime(cur);
        if (dur > 0) setDuration(dur);
      }
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Screen Wake Lock — prevent screen from sleeping while playing
  useEffect(() => {
    if (!isPlaying) return;
    let wakeLock: WakeLockSentinel | null = null;
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then((wl) => {
        wakeLock = wl;
      }).catch(() => {});
    }
    return () => {
      wakeLock?.release();
    };
  }, [isPlaying]);

  // Keep-alive → native: keep the WebView process awake so playback continues
  // with the screen off (Android foreground media service + partial wake lock).
  useEffect(() => {
    try {
      const tauri = (window as any).__TAURI_INTERNALS__;
      if (!tauri?.invoke) return;
      tauri.invoke('set_keep_alive', {
        playing: isPlaying,
        title: currentTrack?.title ?? 'MUSE.AUDIO',
        artist: currentTrack?.artist ?? '',
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, [isPlaying, currentTrack]);

  // Native background-audio bridge (iOS): activate AVAudioSession playback,
  // keep lock-screen Now Playing metadata in sync. No-op in browser/desktop.
  useEffect(() => {
    setPlaybackState({
      playing: isPlaying,
      title: currentTrack?.title ?? 'MUSE.AUDIO',
      artist: currentTrack?.artist ?? '',
      album: currentTrack?.album ?? undefined,
      duration: duration > 0 ? duration : undefined,
      position: currentTime,
      streamUrl: currentTrack?.audioUrl ?? undefined,
    });
  }, [isPlaying, currentTrack, duration, currentTime]);

  // Initialize native (iOS AVPlayer) playback on mount. On success, all
  // subsequent play/pause/seek/loadTrack calls are routed through the native
  // plugin so audio keeps running with the screen off. If native playback is
  // unavailable (browser / desktop) the engine silently stays on HTML5 audio.
  useEffect(() => {
    initNativePlayback({
      onEnded: handleTrackEnded,
      onRemoteCommand: (cmd) => {
        if (cmd === 'next') handleNextRef.current();
        if (cmd === 'prev') handlePrevRef.current();
      },
      onPlaybackError: () => {
        console.warn('[App] native playback error — falling back to HTML5 for this session');
        audioEngine.setNativeMode(false);
      },
    }).then((ok) => {
      if (ok) {
        audioEngine.setNativeMode(true);
        console.log('[App] native playback ENGAGED (AVPlayer) — background playback active');
      } else {
        console.warn('[App] native playback unavailable — using HTML5 audio (background may stop)');
        setNativeDiag({ engaged: false, ticks: 0 });
        return;
      }
      setNativeDiag({ engaged: true, ticks: 0 });
      const iv = window.setInterval(() => {
        setNativeDiag((d) => (d && d.engaged ? { engaged: true, ticks: d.ticks + 1 } : d));
        const snap = getNativeSnapshot();
        // Surface a screen-visible marker so runtime backend is obvious without consoles.
        document.title = snap.playing
          ? `▶ AV ${snap.position.toFixed(0)}s`
          : `▮▮ AV`;
      }, 1000);
      return () => window.clearInterval(iv);
    }).catch((e) => {
      console.warn('[App] initNativePlayback threw:', e);
    });
  }, [handleTrackEnded]);

  // Navigation back-stack tracking (for the edge-swipe back gesture).
  const locationRef = useRef(location);
  locationRef.current = location;
  const navStackRef = useRef<string[]>([]);

  useEffect(() => {
    const key = location.pathname + location.search;
    const s = navStackRef.current;
    if (s[s.length - 1] !== key) {
      s.push(key);
      if (s.length > 50) s.splice(0, s.length - 50);
    }
  }, [location]);

  // Edge-swipe back gesture for touch devices (iOS style). Closes the
  // full-screen player first; otherwise navigates back in app history, or to
  // the home page when there is nothing to go back to.
  useEffect(() => {
    if (!window.matchMedia?.('(pointer: coarse)')?.matches) return;

    const g = { active: false, decided: false, back: false, startX: 0, startY: 0, startT: 0 };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || e.clientX > 28) return;
      g.active = true;
      g.decided = false;
      g.back = false;
      g.startX = e.clientX;
      g.startY = e.clientY;
      g.startT = performance.now();
    };
    const onMove = (e: PointerEvent) => {
      if (!g.active || e.pointerType !== 'touch') return;
      if (g.decided) {
        if (g.back) {
          try { e.preventDefault(); } catch { /* noop */ }
        }
        return;
      }
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      if (dx > 0 && dx > Math.abs(dy) * 1.15) {
        g.decided = true;
        g.back = true;
        try { e.preventDefault(); } catch { /* noop */ }
      } else {
        g.decided = true;
        g.back = false;
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!g.active) return;
      g.active = false;
      if (!g.back) return;
      const dx = e.clientX - g.startX;
      const dt = performance.now() - g.startT;
      if (dx < 55 && !(dx >= 40 && dt < 260)) return;

      if (isFullScreenPlayerOpen) {
        setIsFullScreenPlayerOpen(false);
        return;
      }
      const cur = locationRef.current.pathname + locationRef.current.search;
      const s = navStackRef.current;
      const idx = s.lastIndexOf(cur);
      if (idx > 0) {
        s.length = idx;
        navigate(-1);
      } else if (locationRef.current.pathname !== '/') {
        navigate('/', { replace: true });
      }
    };
    const onCancel = () => {
      g.active = false;
    };

    window.addEventListener('pointerdown', onDown, { passive: false });
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [isFullScreenPlayerOpen, setIsFullScreenPlayerOpen, navigate]);

  // Play / Pause Toggle
  const handleTogglePlay = () => {
    if (!currentTrack) {
      if (tracks.length > 0) handlePlayTrack(tracks[0]);
      return;
    }

    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.play();
      setIsPlaying(true);
    }
  };

  // Next Track
  const handleNext = () => {
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id);
    let nextIndex = 0;

    if (playbackMode === 'shuffle') {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
    }

    handlePlayTrack(queue[nextIndex]);
  };

  // Previous Track
  const handlePrev = () => {
    if (currentTime > 3) {
      handleSeek(0);
      return;
    }
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id);
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    handlePlayTrack(queue[prevIndex]);
  };

  // Seek
  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    audioEngine.seek(seconds);
  };

  // Keep latest handleNext / handlePrev accessible to native remote-command handlers.
  useEffect(() => {
    handleNextRef.current = handleNext;
    handlePrevRef.current = handlePrev;
  }, [handleNext, handlePrev]);

  // Volume
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    audioEngine.setVolume(newVol);
  };

  // Mute Toggle
  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioEngine.setVolume(volume || 0.85);
    } else {
      setIsMuted(true);
      audioEngine.setVolume(0);
    }
  };

  // Playback Mode Toggle
  const handleTogglePlaybackMode = () => {
    const modes: PlaybackMode[] = ['sequence', 'repeat-all', 'repeat-one', 'shuffle'];
    const nextIdx = (modes.indexOf(playbackMode) + 1) % modes.length;
    setPlaybackMode(modes[nextIdx]);
  };

  // Playback Speed
  const handleChangePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    setAudioSettings((prev) => ({ ...prev, playbackSpeed: speed }));
    audioEngine.setPlaybackRate(speed);
  };

  // Stream Quality
  const handleChangeQuality = (quality: StreamQuality) => {
    setAudioSettings((prev) => ({ ...prev, quality }));
    // Keep ref in sync so the immediate reload below sees the new tier
    audioSettingsRef.current = { ...audioSettingsRef.current, quality };
    // Re-load the current track so the new bitrate takes effect immediately
    if (currentTrack) {
      handlePlayTrack(currentTrack);
    }
  };

  // Favorites Toggle
  const handleToggleFavorite = (track: Track) => {
    setFavorites((prev) =>
      prev.includes(track.id) ? prev.filter((id) => id !== track.id) : [...prev, track.id]
    );
  };

  // Queue Operations
  const handleAddToQueue = (track: Track) => {
    setQueue((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      return [...prev, track];
    });
  };

  const handleRemoveFromQueue = (trackId: string) => {
    setQueue((prev) => prev.filter((t) => t.id !== trackId));
  };

  const handleClearQueue = () => {
    setQueue([]);
  };

  const handlePlayAll = (trackList: Track[]) => {
    if (trackList.length === 0) return;
    setQueue(trackList);
    handlePlayTrack(trackList[0]);
  };

  const handleShuffleAll = (trackList: Track[]) => {
    if (trackList.length === 0) return;
    const shuffled = [...trackList].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setPlaybackMode('shuffle');
    handlePlayTrack(shuffled[0]);
  };

  // Sleep Timer Handler
  const handleSetSleepTimer = (minutes: number | null) => {
    setSleepTimerMinutes(minutes);
    if (minutes !== null) {
      setTimeout(() => {
        audioEngine.pause();
        setIsPlaying(false);
        setSleepTimerMinutes(null);
      }, minutes * 60 * 1000);
    }
  };

  // Local Import
  const handleImportLocalTracks = (newTracks: Track[]) => {
    setTracks((prev) => [...newTracks, ...prev]);
    setQueue((prev) => [...newTracks, ...prev]);
    // Save to local storage
    const existingLocal = JSON.parse(localStorage.getItem('wavesound_local_tracks') || '[]');
    localStorage.setItem(
      'wavesound_local_tracks',
      JSON.stringify([...newTracks, ...existingLocal])
    );
  };

  // Playlist Management
  const handleCreatePlaylist = (newPl: Omit<Playlist, 'id'>) => {
    const created: Playlist = {
      ...newPl,
      id: `custom-pl-${Date.now()}`,
    };
    const updated = [created, ...playlists];
    setPlaylists(updated);
    const customList = updated.filter((p) => p.isCustom);
    localStorage.setItem('wavesound_custom_playlists', JSON.stringify(customList));
    navigate(`/playlist/${encodeURIComponent(created.id)}`);
  };

  const handleAddTrackToPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId && !pl.trackIds.includes(trackId)) {
          return { ...pl, trackIds: [...pl.trackIds, trackId] };
        }
        return pl;
      })
    );
  };

  const handleRemoveTrackFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          return { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId) };
        }
        return pl;
      })
    );
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(0, currentTime - 5));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(duration, currentTime + 5));
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        handleVolumeChange(Math.min(1, volume + 0.05));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleVolumeChange(Math.max(0, volume - 0.05));
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        setIsFullScreenPlayerOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, volume, isPlaying, currentTrack]);

  if (!dataLoaded) {
    return (
        <div className="h-screen w-screen bg-[#08080c] text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm px-6">
          <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">正在加载音乐数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#08080c] text-slate-100 flex flex-col font-sans antialiased overflow-hidden select-none relative pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Debug backend banner (temporary; remove after iOS background audio is verified) */}
      {nativeDiag && (
        <div className="absolute top-1 left-1 z-50 px-2 py-0.5 rounded text-[10px] font-bold pointer-events-none" style={{ backgroundColor: nativeDiag.engaged ? 'rgba(16,185,129,0.85)' : 'rgba(244,63,94,0.85)', color: '#fff' }}>
          {nativeDiag.engaged ? `AVP ▸ ${nativeDiag.ticks}s` : 'HTML5 *'}
        </div>
      )}
      {/* Ambient Frosted Background Glowing Orbs */}
      <div className="absolute top-[-10%] left-[10%] w-[450px] h-[450px] bg-indigo-600/20 rounded-full blur-[130px] pointer-events-none -z-0" />
      <div className="absolute bottom-[-5%] right-[5%] w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none -z-0" />
      <div className="absolute top-[20%] right-[-5%] w-[350px] h-[350px] bg-fuchsia-600/15 rounded-full blur-[110px] pointer-events-none -z-0" />
      <div className="absolute bottom-[25%] left-[-5%] w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-0" />

      {/* Main App Workspace */}
      <div className="flex-1 flex overflow-hidden z-10">
        {/* Desktop / Tablet Sidebar (Hidden on mobile) */}
        <div className="hidden md:flex flex-shrink-0 h-full">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={goTab}
            playlists={playlists}
            selectedPlaylistId={selectedPlaylistId}
            onSelectPlaylist={goPlaylist}
            onOpenCreatePlaylist={() => {
              setTrackToAddToPlaylist(null);
              setIsPlaylistModalOpen(true);
            }}
            onOpenEQ={() => setIsEQModalOpen(true)}
            onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
            favoritesCount={favorites.length}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onOpenFullScreen={() => setIsFullScreenPlayerOpen(true)}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full bg-black/10 backdrop-blur-md overflow-hidden">
          {/* Header */}
          <Header
            tracks={tracks}
            onPlayTrack={handlePlayTrack}
            onOpenEQ={() => setIsEQModalOpen(true)}
            onNavigateToSearch={(q) => {
              if (q !== undefined) setSearchQuery(q);
              navigate('/search');
            }}
          />

          {/* Dynamic Viewport Scroller */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 scrollbar-thin">
            <Routes>
              <Route
                path="/"
                element={
                  <DiscoverView
                    tracks={tracks}
                    playlists={playlists}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    favorites={favorites}
                    onPlayTrack={handlePlayTrack}
                    onPlayAll={handlePlayAll}
                    onShuffleAll={handleShuffleAll}
                    onAddToQueue={handleAddToQueue}
                    onToggleFavorite={handleToggleFavorite}
                    onSelectPlaylist={goPlaylist}
                    onOpenAddToPlaylistModal={(track) => {
                      setTrackToAddToPlaylist(track);
                      setIsPlaylistModalOpen(true);
                    }}
                    onOpenDownload={handleOpenDownload}
                  />
                }
              />

              <Route
                path="/search"
                element={
                  <SearchView
                    tracks={tracks}
                    playlists={playlists}
                    scripts={customScripts}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    favorites={favorites}
                    initialQuery={searchQueryFromState ?? searchQuery}
                    onPlayTrack={handlePlayTrack}
                    onPlayAll={handlePlayAll}
                    onAddToQueue={handleAddToQueue}
                    onToggleFavorite={handleToggleFavorite}
                    onSelectPlaylist={goPlaylist}
                    onOpenAddToPlaylistModal={(track) => {
                      setTrackToAddToPlaylist(track);
                      setIsPlaylistModalOpen(true);
                    }}
                    onOpenDownload={handleOpenDownload}
                  />
                }
              />

              <Route
                path="/sources"
                element={
                  <SourceScriptManagerView
                    scripts={customScripts}
                    onUpdateScripts={setCustomScripts}
                    onPlayTrack={handlePlayTrack}
                  />
                }
              />

              <Route
                path="/playlist/:id"
                element={
                  <PlaylistDetailRoute
                    playlists={playlists}
                    allTracks={tracks}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    favorites={favorites}
                    onPlayTrack={handlePlayTrack}
                    onPlayAll={handlePlayAll}
                    onShuffleAll={handleShuffleAll}
                    onAddToQueue={handleAddToQueue}
                    onToggleFavorite={handleToggleFavorite}
                    onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
                    onBack={() => navigate('/')}
                    onOpenDownload={handleOpenDownload}
                    onBatchDownload={handleBatchDownload}
                  />
                }
              />

              <Route
                path="/library"
                element={
                  <LibraryView
                    tracks={tracks}
                    playlists={playlists}
                    favorites={favorites}
                    recentHistory={recentHistory}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    onPlayTrack={handlePlayTrack}
                    onPlayAll={handlePlayAll}
                    onSelectPlaylist={goPlaylist}
                    onOpenCreatePlaylist={() => {
                      setTrackToAddToPlaylist(null);
                      setIsPlaylistModalOpen(true);
                    }}
                    onToggleFavorite={handleToggleFavorite}
                    onAddToQueue={handleAddToQueue}
                    onOpenLocalImport={() => navigate('/local')}
                    onOpenDownload={handleOpenDownload}
                    defaultSubTab="favorites"
                  />
                }
              />

              <Route
                path="/favorites"
                element={
                  <LibraryView
                    tracks={tracks}
                    playlists={playlists}
                    favorites={favorites}
                    recentHistory={recentHistory}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    onPlayTrack={handlePlayTrack}
                    onPlayAll={handlePlayAll}
                    onSelectPlaylist={goPlaylist}
                    onOpenCreatePlaylist={() => {
                      setTrackToAddToPlaylist(null);
                      setIsPlaylistModalOpen(true);
                    }}
                    onToggleFavorite={handleToggleFavorite}
                    onAddToQueue={handleAddToQueue}
                    onOpenLocalImport={() => navigate('/local')}
                    onOpenDownload={handleOpenDownload}
                    defaultSubTab="favorites"
                  />
                }
              />

              <Route
                path="/local"
                element={
                  <LocalFileImporter
                    onImportTracks={handleImportLocalTracks}
                    onPlayTrack={handlePlayTrack}
                  />
                }
              />

              <Route
                path="/mine"
                element={
                  <MyView
                    favoritesCount={favorites.length}
                    queueCount={queue.length}
                    scriptsCount={customScripts.length}
                    onNavigateFavorites={() => navigate('/favorites')}
                    onOpenQueue={() => setIsQueueDrawerOpen(true)}
                    onNavigateSources={() => navigate('/sources')}
                    onOpenEQ={() => setIsEQModalOpen(true)}
                    onNavigateLocalImport={() => navigate('/local')}
                    onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
                  />
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

              {/* Bottom Sticky Player Bar (Desktop/Tablet/Mobile) — hidden while full-screen player is open */}
              {!isFullScreenPlayerOpen && (
              <BottomPlayerBar
                track={currentTrack}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                isMuted={isMuted}
                playbackMode={playbackMode}
                playbackSpeed={playbackSpeed}
                quality={audioSettings.quality}
                isFavorite={currentTrack ? favorites.includes(currentTrack.id) : false}
                onTogglePlay={handleTogglePlay}
                onPrev={handlePrev}
                onNext={handleNext}
                onSeek={handleSeek}
                onVolumeChange={handleVolumeChange}
                onToggleMute={handleToggleMute}
                onTogglePlaybackMode={handleTogglePlaybackMode}
                onChangePlaybackSpeed={handleChangePlaybackSpeed}
                onChangeQuality={handleChangeQuality}
                onToggleFavorite={handleToggleFavorite}
                onOpenEQ={() => setIsEQModalOpen(true)}
                onOpenQueue={() => setIsQueueDrawerOpen(true)}
                onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
                onOpenFullScreen={() => setIsFullScreenPlayerOpen(true)}
                onOpenDownload={handleOpenDownload}
              />
              )}

              {/* Mobile Bottom Navigation Bar (Visible on mobile view) */}
              <div className="md:hidden">
                <MobileBottomNav
                  activeTab={activeTab}
                  onSelectTab={goTab}
                />
              </div>
            </div>
          </div>

      {/* --- Modals & Overlays --- */}

      {/* Full-Screen Immersive Player Modal */}
      <FullScreenPlayer
        isOpen={isFullScreenPlayerOpen}
        onClose={() => setIsFullScreenPlayerOpen(false)}
        track={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        playbackMode={playbackMode}
        playbackSpeed={playbackSpeed}
        quality={audioSettings.quality}
        isFavorite={currentTrack ? favorites.includes(currentTrack.id) : false}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onTogglePlaybackMode={handleTogglePlaybackMode}
        onChangePlaybackSpeed={handleChangePlaybackSpeed}
        onChangeQuality={handleChangeQuality}
        onToggleFavorite={handleToggleFavorite}
        onOpenEQ={() => setIsEQModalOpen(true)}
        onOpenQueue={() => setIsQueueDrawerOpen(true)}
        onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
        onOpenDownload={handleOpenDownload}
      />

      {/* 10-Band EQ Modal */}
      <EqualizerModal
        isOpen={isEQModalOpen}
        onClose={() => setIsEQModalOpen(false)}
        audioSettings={audioSettings}
        setAudioSettings={setAudioSettings}
      />

      {/* Queue Drawer */}
      <QueueDrawer
        isOpen={isQueueDrawerOpen}
        onClose={() => setIsQueueDrawerOpen(false)}
        queue={queue}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onSelectTrack={handlePlayTrack}
        onRemoveTrack={handleRemoveFromQueue}
        onClearQueue={handleClearQueue}
      />

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={isSleepTimerOpen}
        onClose={() => setIsSleepTimerOpen(false)}
        timerMinutes={sleepTimerMinutes}
        onSetTimer={handleSetSleepTimer}
      />

      {/* Playlist Creation / Add Track Modal */}
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => {
          setIsPlaylistModalOpen(false);
          setTrackToAddToPlaylist(null);
        }}
        onCreatePlaylist={handleCreatePlaylist}
        existingPlaylists={playlists}
        currentTrackToAddTo={trackToAddToPlaylist}
        onAddTrackToPlaylist={handleAddTrackToPlaylist}
      />

      {/* High-Quality Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => {
          setIsDownloadModalOpen(false);
          setTrackToDownload(null);
        }}
        track={trackToDownload || currentTrack}
        customScripts={customScripts}
        quality={audioSettings.quality}
        onOpenLocalImporter={() => navigate('/local')}
      />

      {/* Floating Download Toast / Queue Notification */}
      <DownloadToastNotification />
    </div>
  );
}
