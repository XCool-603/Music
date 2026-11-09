import { Track, CustomSourceScript, StreamQuality } from '../types';
import { SourceScriptRunner } from './sourceScriptEngine';
import { apiUrl } from './apiBase';
import { saveLocalAudioBlob } from './localTrackStore';

export interface DownloadTask {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  type: 'audio' | 'lrc' | 'cover' | 'bundle';
  progress: number; // 0 to 100
  status: 'pending' | 'downloading' | 'completed' | 'error';
  error?: string;
  filename: string;
  timestamp: number;
}

type DownloadListener = (tasks: DownloadTask[]) => void;
const listeners: Set<DownloadListener> = new Set();
let activeTasks: DownloadTask[] = [];

function notifyListeners() {
  listeners.forEach((fn) => fn([...activeTasks]));
}

export function subscribeDownloadTasks(fn: DownloadListener) {
  listeners.add(fn);
  fn([...activeTasks]);
  return () => {
    listeners.delete(fn);
  };
}

export function getActiveDownloadTasks(): DownloadTask[] {
  return [...activeTasks];
}

export function clearCompletedTasks() {
  activeTasks = activeTasks.filter((t) => t.status === 'downloading' || t.status === 'pending');
  notifyListeners();
}

/**
 * Sanitize filename to ensure safe cross-platform saving
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Trigger browser file save using a Blob
 */
export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFilename(filename);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}

/**
 * Trigger download via an anchor direct link
 */
export function triggerDirectDownload(url: string, filename: string) {
  const fullUrl = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') ? url : apiUrl(url);
  const a = document.createElement('a');
  a.href = fullUrl;
  a.download = sanitizeFilename(filename);
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 2000);
}

/**
 * Resolve the audio source URL for a track (handles LX source scripts, Kuwo/NetEase streams, or local files)
 */
export async function resolveTrackDownloadUrl(
  track: Track,
  customScripts: CustomSourceScript[] = [],
  quality: StreamQuality = 'high'
): Promise<string> {
  // 1. If it's already a local blob / data url
  if (track.audioUrl && (track.audioUrl.startsWith('blob:') || track.audioUrl.startsWith('data:'))) {
    return track.audioUrl;
  }

  // 2. If it's a direct external http(s) URL (not an internal /api/ endpoint)
  if (
    track.audioUrl &&
    (track.audioUrl.startsWith('http://') || track.audioUrl.startsWith('https://')) &&
    !track.audioUrl.includes('/api/')
  ) {
    return track.audioUrl;
  }

  // 3. If it's from a custom JS script
  if (track.sourceScriptId && track.sourceKey) {
    const script = customScripts.find((s) => s.id === track.sourceScriptId);
    if (script && script.enabled) {
      try {
        const runner = new SourceScriptRunner(script);
        await runner.init();
        const directUrl = await runner.resolveAudioUrl(track, quality === 'lossless' ? 'lossless' : '320k');
        if (directUrl && directUrl.startsWith('http') && !directUrl.includes('itunes.apple.com')) {
          return directUrl;
        }
      } catch (err) {
        console.warn('[Download] Script URL resolution failed:', err);
      }
    }
  }

  const rid = ridFrom(track);
  const source = ridSourceFrom(track);

  // 4. Resolve official v2 URL (/api/v2/song/url?format=json)
  if (rid) {
    try {
      const v2Url = apiUrl(
        `/api/v2/song/url?source=${source}&id=${encodeURIComponent(rid)}&quality=${quality}&format=json`
      );
      const res = await fetch(v2Url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        if (data && data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
          return data.url;
        }
      }
    } catch (err) {
      console.warn('[Download] v2 URL resolution failed:', err);
    }
  }

  // 5. Fallback v1 stream-url resolver
  if (rid) {
    try {
      const v1Url = apiUrl(
        `/api/music/stream-url?source=${source}&id=${encodeURIComponent(rid)}&rid=${encodeURIComponent(rid)}&level=${quality}`
      );
      const res = await fetch(v1Url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        if (data && data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
          return data.url;
        }
      }
    } catch (err) {
      console.warn('[Download] v1 stream-url resolution failed:', err);
    }
  }

  // 6. Absolute URL to backend stream proxy as guaranteed fallback
  return apiUrl(`/api/v2/song/url?source=${source}&id=${encodeURIComponent(rid)}&quality=${quality}`);
}

function ridFrom(track: Track): string {
  return (
    track.sourceRawInfo?.id ||
    track.sourceRawInfo?.songmid ||
    track.id.replace(/^(kw_|ne_|tx_)/, '')
  ) || '';
}

function ridSourceFrom(track: Track): string {
  return track.sourceKey || (track.id.startsWith('ne_') ? 'netease' : 'kuwo');
}

/**
 * Download Track Audio File (.mp3 / .flac — quality aware)
 */
export async function downloadTrackAudio(
  track: Track,
  customScripts: CustomSourceScript[] = [],
  quality: StreamQuality = 'high',
  onProgress?: (progress: number) => void
): Promise<boolean> {
  const taskId = `task_audio_${track.id}_${Date.now()}`;
  const baseFilename = sanitizeFilename(`${track.artist} - ${track.title}`);
  const ext = quality === 'lossless' ? 'flac' : 'mp3';
  const filename = `${baseFilename}.${ext}`;

  const task: DownloadTask = {
    id: taskId,
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    type: 'audio',
    progress: 10,
    status: 'downloading',
    filename,
    timestamp: Date.now(),
  };

  activeTasks = [task, ...activeTasks];
  notifyListeners();

  try {
    // 1. Resolve direct URL or backend download endpoint
    const resolvedUrl = await resolveTrackDownloadUrl(track, customScripts, quality);

    task.progress = 25;
    notifyListeners();
    onProgress?.(25);

    // If it's a local object url or base64 blob, download directly
    if (resolvedUrl.startsWith('blob:') || resolvedUrl.startsWith('data:')) {
      const resp = await fetch(resolvedUrl);
      const blob = await resp.blob();
      triggerBlobDownload(blob, filename);
      saveLocalAudioBlob(track.id, blob).catch(() => {});

      task.progress = 100;
      task.status = 'completed';
      notifyListeners();
      onProgress?.(100);
      return true;
    }

    // 2. Try direct CDN download first (single bandwidth). If the CDN does not
    //    allow CORS fetch, fall back to the backend download proxy below.
    if (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) {
      try {
        const directResp = await fetch(resolvedUrl, { mode: 'cors' });
        if (directResp.ok) {
          const directBlob = await directResp.blob();
          if (directBlob.size > 1024) {
            triggerBlobDownload(directBlob, filename);
            saveLocalAudioBlob(track.id, directBlob).catch(() => {});
            task.progress = 100;
            task.status = 'completed';
            notifyListeners();
            onProgress?.(100);
            return true;
          }
        }
      } catch (directErr) {
        console.warn('[Download] Direct CDN download blocked by CORS, using backend proxy:', directErr);
      }
    }

    // 3. Backend download proxy fallback with progress tracking
    const rid = ridFrom(track);
    const source = ridSourceFrom(track);

    const downloadApiUrl = apiUrl(
      `/api/music/download?url=${encodeURIComponent(resolvedUrl)}&filename=${encodeURIComponent(
        filename
      )}&source=${source}&id=${encodeURIComponent(rid)}&rid=${encodeURIComponent(rid)}&level=${quality}&artist=${encodeURIComponent(
        track.artist
      )}&title=${encodeURIComponent(track.title)}`
    );

    const response = await fetch(downloadApiUrl);
    if (!response.ok) {
      throw new Error(`服务器响应错误: HTTP ${response.status}`);
    }

    const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
    if (contentType.includes('text/') || contentType.includes('application/json')) {
      const errText = await response.text();
      throw new Error(`下载服务异常: ${errText.slice(0, 80)}`);
    }

    const contentLength = +(response.headers.get('Content-Length') || 0);
    const mimeType = filename.endsWith('.flac') ? 'audio/flac' : 'audio/mpeg';

    if (!response.body || contentLength === 0) {
      // Direct blob fallback
      const blob = await response.blob();
      triggerBlobDownload(blob, filename);
      saveLocalAudioBlob(track.id, blob).catch(() => {});
    } else {
      const reader = response.body.getReader();
      let receivedBytes = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.length;
        if (contentLength > 0) {
          const currentPercent = Math.min(95, Math.round(25 + (receivedBytes / contentLength) * 70));
          task.progress = currentPercent;
          notifyListeners();
          onProgress?.(currentPercent);
        }
      }

      const blob = new Blob(chunks, { type: mimeType });
      triggerBlobDownload(blob, filename);
      saveLocalAudioBlob(track.id, blob).catch(() => {});
    }

    task.progress = 100;
    task.status = 'completed';
    notifyListeners();
    onProgress?.(100);
    return true;
  } catch (err: any) {
    console.error(`[Download Audio Failed] for ${track.title}:`, err);
    task.status = 'error';
    task.error = err?.message || '下载失败';
    notifyListeners();

    // Fallback: try direct browser download popup
    try {
      const rid = ridFrom(track);
      const source = ridSourceFrom(track);
      const fallbackUrl = apiUrl(
        `/api/music/download?source=${source}&id=${encodeURIComponent(rid)}&filename=${encodeURIComponent(
          filename
        )}&level=${quality}`
      );
      triggerDirectDownload(fallbackUrl, filename);
    } catch {}

    return false;
  }
}

/**
 * Download Synchronized LRC Lyrics File (.lrc)
 */
export async function downloadTrackLyrics(track: Track): Promise<boolean> {
  const taskId = `task_lrc_${track.id}_${Date.now()}`;
  const baseFilename = sanitizeFilename(`${track.artist} - ${track.title}`);
  const filename = `${baseFilename}.lrc`;

  const task: DownloadTask = {
    id: taskId,
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    type: 'lrc',
    progress: 20,
    status: 'downloading',
    filename,
    timestamp: Date.now(),
  };

  activeTasks = [task, ...activeTasks];
  notifyListeners();

  try {
    let lrcContent = track.lyrics || '';

    // If lyrics are not stored locally in track, fetch from backend API
    if (!lrcContent || lrcContent.length < 10) {
      const rid = ridFrom(track);
      const source = ridSourceFrom(track);
      try {
        const v2Res = await fetch(apiUrl(`/api/v2/song/lyric?source=${source}&id=${encodeURIComponent(rid)}`));
        if (v2Res.ok) {
          const v2Data = await v2Res.json();
          if (v2Data && v2Data.lrc) {
            lrcContent = v2Data.lrc;
            if (v2Data.translation) {
              lrcContent += `\n${v2Data.translation}`;
            }
          }
        }
      } catch {}

      if (!lrcContent) {
        const res = await fetch(apiUrl(`/api/music/lyric?source=${source}&id=${rid}&rid=${rid}`));
        const data = await res.json();
        if (data && data.lrc) {
          lrcContent = data.lrc;
        }
      }
    }

    if (!lrcContent) {
      lrcContent = `[ti:${track.title}]\n[ar:${track.artist}]\n[al:${track.album}]\n[by:MUSE.AUDIO Hi-Fi Music Player]\n[00:00.00]${track.title} - ${track.artist}\n`;
    } else if (!lrcContent.includes('[ti:')) {
      lrcContent = `[ti:${track.title}]\n[ar:${track.artist}]\n[al:${track.album}]\n[by:MUSE.AUDIO Music Player]\n${lrcContent}`;
    }

    const blob = new Blob([lrcContent], { type: 'text/plain;charset=utf-8' });
    triggerBlobDownload(blob, filename);

    task.progress = 100;
    task.status = 'completed';
    notifyListeners();
    return true;
  } catch (err: any) {
    task.status = 'error';
    task.error = err?.message || '歌词下载失败';
    notifyListeners();
    return false;
  }
}

/**
 * Download Album Cover Art (.jpg)
 */
export async function downloadTrackCover(track: Track): Promise<boolean> {
  const taskId = `task_cover_${track.id}_${Date.now()}`;
  const baseFilename = sanitizeFilename(`${track.artist} - ${track.title}`);
  const filename = `${baseFilename}_cover.jpg`;

  const task: DownloadTask = {
    id: taskId,
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    type: 'cover',
    progress: 30,
    status: 'downloading',
    filename,
    timestamp: Date.now(),
  };

  activeTasks = [task, ...activeTasks];
  notifyListeners();

  try {
    if (!track.coverUrl) {
      throw new Error('未找到封面图片');
    }

    const response = await fetch(track.coverUrl);
    const blob = await response.blob();
    triggerBlobDownload(blob, filename);

    task.progress = 100;
    task.status = 'completed';
    notifyListeners();
    return true;
  } catch (err: any) {
    task.status = 'error';
    task.error = err?.message || '封面下载失败';
    notifyListeners();
    // Fallback: try opening in new tab as last resort
    try {
      triggerDirectDownload(track.coverUrl, filename);
    } catch {}
    return false;
  }
}

/**
 * Download Complete Music Bundle (Audio + Lyrics + Cover Art)
 */
export async function downloadTrackBundle(
  track: Track,
  customScripts: CustomSourceScript[] = [],
  quality: StreamQuality = 'high'
): Promise<boolean> {
  const res1 = await downloadTrackAudio(track, customScripts, quality);
  await new Promise((r) => setTimeout(r, 400));
  const res2 = await downloadTrackLyrics(track);
  await new Promise((r) => setTimeout(r, 400));
  const res3 = await downloadTrackCover(track);
  return res1 && res2 && res3;
}

/**
 * Batch Download an array of tracks with sequential pacing
 */
export async function downloadBatchTracks(
  tracks: Track[],
  customScripts: CustomSourceScript[] = [],
  onProgress?: (completedCount: number, totalCount: number) => void,
  quality: StreamQuality = 'high'
): Promise<{ successCount: number; failCount: number }> {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    try {
      const ok = await downloadTrackAudio(track, customScripts, quality);
      if (ok) successCount++;
      else failCount++;
    } catch {
      failCount++;
    }
    onProgress?.(i + 1, tracks.length);
    // Short pause between multiple files to avoid browser popup spam throttle
    if (i < tracks.length - 1) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  return { successCount, failCount };
}
