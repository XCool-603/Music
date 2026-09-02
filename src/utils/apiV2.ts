import { apiUrl, getApiBase } from './apiBase';
import { normalizeCoverUrl } from './imageUtils';
import type { StreamQuality, Track } from '../types';

/**
 * v2 API client — talks to the /api/v2/* endpoint group backed by OFFICIAL
 * Kuwo / NetEase upstreams.
 *
 * ROLLBACK SWITCH: set `localStorage.muse.apiVersion = 'v1'` and every helper
 * below transparently falls back to the old /api/music/* endpoints. Delete the
 * key (or set 'v2') to switch back. v1 endpoints are untouched by the v2 work.
 */
export const API_V2 = (() => {
  try {
    return localStorage.getItem('muse.apiVersion') !== 'v1';
  } catch {
    return true;
  }
})();

export function getApiVersion(): 'v1' | 'v2' {
  return API_V2 ? 'v2' : 'v1';
}

// ── Mapping (same shape contract as sourceScriptEngine.ts) ──────────

function primarySourceName(sourceKey: string, fallback?: string): string {
  if (fallback) return fallback;
  return sourceKey === 'wy' || sourceKey === 'netease' ? '网易云音乐' : '酷我音乐';
}

function normalizeSourceKey(sourceKey: string): string {
  return sourceKey === 'wy' ? 'wy' : sourceKey === 'netease' ? 'wy' : 'kw';
}

/** Map a backend TrackInfo (v1 or v2 shape) to the frontend Track type. */
export function mapBackendTrack(item: any, sourceScriptId?: string): Track {
  const sourceKey = normalizeSourceKey(item.sourceKey || (item.id?.startsWith('ne_') ? 'wy' : 'kw'));
  const cover = normalizeCoverUrl(item.coverUrl);
  return {
    id: item.id,
    title: item.title || '未知单曲',
    artist: item.artist || '未知歌手',
    album: item.album || '单曲合辑',
    duration: item.duration || 240,
    coverUrl: cover,
    audioUrl: item.audioUrl || '',
    genre: item.genre || '流行音乐',
    lyrics: '', // 播放时自动流式请求真实完整 LRC
    bitrate: item.bitrate || '320kbps / 无损全长',
    sourceScriptId,
    sourceName: primarySourceName(sourceKey, item.sourceName),
    sourceKey,
    sourceRawInfo: {
      id: item.rid || item.id,
      songmid: item.rid || item.id,
      name: item.title,
      singer: item.artist,
      albumName: item.album,
      interval: item.duration,
      img: cover,
    },
  };
}

/** Rewrite the quality query param of a v2 song/url link at play time. */
export function applyV2Quality(audioUrl: string, quality: StreamQuality): string {
  if (!audioUrl.includes('/api/v2/song/url')) return audioUrl;
  return audioUrl.includes('quality=')
    ? audioUrl.replace(/(quality=)[^&]*/, `$1${quality}`)
    : `${audioUrl}&quality=${quality}`;
}

async function fetchJson(url: string, timeoutMs = 15000): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── Search ──────────────────────────────────────────────────────────

/**
 * Search tracks. `source` is kuwo | netease | all.
 * v2 → /api/v2/search (official upstreams). v1 → /api/music/search.
 */
export async function v2Search(
  q: string,
  page = 1,
  limit = 30,
  source: 'all' | 'kuwo' | 'netease' = 'all'
): Promise<Track[]> {
  const query = (q || '').trim();
  if (!query) return [];

  if (API_V2) {
    const data = await fetchJson(
      apiUrl(`/api/v2/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}&source=${source}`)
    );
    if (data && Array.isArray(data.tracks)) return data.tracks.map((t: any) => mapBackendTrack(t));
    return [];
  }

  // v1 rollback path
  const data = await fetchJson(
    apiUrl(`/api/music/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}&source=${source}`)
  );
  if (data && Array.isArray(data.list) && data.list.length > 0) {
    return data.list.map((item: any) => mapBackendTrack(item));
  }
  return [];
}

/** Paginated variant of the raw backend payloads (used to know hasMore). */
export async function v2SearchRaw(
  q: string,
  page = 1,
  limit = 30,
  source: 'all' | 'kuwo' | 'netease' = 'all'
): Promise<{ tracks: Track[]; total: number | null }> {
  const query = (q || '').trim();
  if (!query) return { tracks: [], total: null };

  if (API_V2) {
    const data = await fetchJson(
      apiUrl(`/api/v2/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}&source=${source}`)
    );
    if (data && Array.isArray(data.tracks)) {
      return {
        tracks: data.tracks.map((t: any) => mapBackendTrack(t)),
        total: typeof data.total === 'number' ? data.total : null,
      };
    }
    return { tracks: [], total: null };
  }

  const data = await fetchJson(
    apiUrl(`/api/music/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}&source=${source}`)
  );
  if (data && Array.isArray(data.list)) {
    return {
      tracks: data.list.map((item: any) => mapBackendTrack(item)),
      total: typeof data.total === 'number' ? data.total : null,
    };
  }
  return { tracks: [], total: null };
}

// ── Hot search keywords ─────────────────────────────────────────────

export interface HotKeyword {
  rank: number;
  keyword: string;
  score?: string | null;
  tag?: string | null;
}

/** Official hot search words. v1 mode returns [] (caller shows local fallback). */
export async function v2HotSearch(source: 'kuwo' | 'netease' = 'netease'): Promise<HotKeyword[]> {
  if (!API_V2) return [];
  const data = await fetchJson(apiUrl(`/api/v2/search/hot?source=${source}`));
  if (data && Array.isArray(data.keywords)) return data.keywords;
  return [];
}

// ── Search suggestions ──────────────────────────────────────────────

export interface SuggestItem {
  keyword: string;
  type?: string | null;
  hint?: string | null;
}

/** Official suggest. v1 mode returns [] (caller can fall back to v2Search). */
export async function v2Suggest(
  q: string,
  source: 'kuwo' | 'netease' = 'kuwo',
  limit = 8
): Promise<SuggestItem[]> {
  const query = (q || '').trim();
  if (!query) return [];
  if (!API_V2) return [];
  const data = await fetchJson(
    apiUrl(`/api/v2/search/suggest?q=${encodeURIComponent(query)}&source=${source}&limit=${limit}`)
  );
  if (data && Array.isArray(data.suggestions)) return data.suggestions;
  return [];
}

// ── Toplist ─────────────────────────────────────────────────────────

export type ToplistCategory = 'hot' | 'new' | 'rise';

/**
 * Official toplist tracks (hot | new | rise).
 * v1 rollback: derive a similar list from /api/discovery.
 */
export async function v2Toplist(
  source: 'kuwo' | 'netease',
  category: ToplistCategory = 'hot',
  limit = 10
): Promise<Track[]> {
  if (API_V2) {
    const data = await fetchJson(
      apiUrl(`/api/v2/toplist?source=${source}&category=${category}&limit=${limit}`)
    );
    if (data && Array.isArray(data.tracks)) return data.tracks.map((t: any) => mapBackendTrack(t));
    return [];
  }

  // v1 rollback path: discovery trending as a toplist stand-in.
  const data = await fetchJson(apiUrl('/api/discovery'));
  const list: any[] = Array.isArray(data?.trendingTracks)
    ? data.trendingTracks
    : Array.isArray(data?.heroTracks)
      ? data.heroTracks
      : [];
  return list.slice(0, limit).map((item) => mapBackendTrack(item));
}

// ── Lyric ───────────────────────────────────────────────────────────

/** Lyric with translation. Returns the same shape on v1 and v2. */
export async function v2Lyric(
  source: string,
  id: string
): Promise<{ lrc: string; translation: string }> {
  const sid = encodeURIComponent(id || '');
  if (API_V2) {
    const data = await fetchJson(apiUrl(`/api/v2/song/lyric?source=${source}&id=${sid}`));
    if (data && typeof data.lrc === 'string' && data.lrc.length > 0) {
      return { lrc: data.lrc, translation: typeof data.translation === 'string' ? data.translation : '' };
    }
    // v2 empty → try v1 channel before giving up (backend-independent fallback).
    const v1 = await fetchJson(apiUrl(`/api/music/lyric?source=${source}&id=${sid}&rid=${sid}`));
    if (v1 && typeof v1.lrc === 'string' && v1.lrc.length > 0) {
      return { lrc: v1.lrc, translation: typeof v1.tlyric === 'string' ? v1.tlyric : '' };
    }
    return { lrc: '', translation: '' };
  }

  const v1 = await fetchJson(apiUrl(`/api/music/lyric?source=${source}&id=${sid}&rid=${sid}`));
  if (v1 && typeof v1.lrc === 'string') {
    return { lrc: v1.lrc, translation: typeof v1.tlyric === 'string' ? v1.tlyric : '' };
  }
  return { lrc: '', translation: '' };
}

// ── Dev helpers ─────────────────────────────────────────────────────

/** One-click rollback to the legacy API channel (persists). */
export function rollbackToV1(): void {
  try {
    localStorage.setItem('muse.apiVersion', 'v1');
  } catch {
    /* ignore */
  }
}

export function switchToV2(): void {
  try {
    localStorage.removeItem('muse.apiVersion');
  } catch {
    /* ignore */
  }
}

/** Base URL used by v2 (exported for diagnostics). */
export const v2BackendBase = getApiBase;
