import { Track } from '../types';

export interface ImportedPlaylistResult {
  name: string;
  coverUrl: string;
  description: string;
  trackCount: number;
  tracks: Track[];
}

/**
 * 从文本中提取歌单 ID（支持完整 URL、短链接或纯数字）
 */
export function extractPlaylistId(input: string): { id: string; platform: 'netease' | 'qq' } | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  // 纯数字格式
  if (/^\d{4,12}$/.test(trimmed)) {
    return { id: trimmed, platform: 'netease' };
  }

  // 网易云音乐链接：包含 id=123456 或 /playlist/123456
  const neMatch = trimmed.match(/id=(\d+)/i) || trimmed.match(/playlist\/(\d+)/i) || trimmed.match(/playlist\?id=(\d+)/i);
  if (neMatch) {
    return { id: neMatch[1], platform: 'netease' };
  }

  // QQ 音乐链接
  const qqMatch = trimmed.match(/id=(\d+)/i) || trimmed.match(/taoge\.html\?id=(\d+)/i) || trimmed.match(/playsquare\/(\w+)/i);
  if (qqMatch) {
    return { id: qqMatch[1], platform: 'qq' };
  }

  return null;
}

/**
 * 抓取并解析外部歌单
 */
export async function importExternalPlaylist(input: string): Promise<ImportedPlaylistResult> {
  const parsed = extractPlaylistId(input);
  if (!parsed) {
    throw new Error('未能识别到有效的歌单链接或 ID，请输入网易云/QQ 歌单分享链接或纯数字 ID');
  }

  const { id } = parsed;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    // 1. 尝试开放公网 API (支持 CORS，全端免鉴权直连)
    const apiUrl = `https://music-api.gdstudio.xyz/api.php?types=playlist&id=${id}`;
    let res = await fetch(apiUrl, { signal: ctrl.signal });
    let data: any = null;

    if (res.ok) {
      data = await res.json();
    }

    // 2. 兜底尝试网易官方开放端点 (在 App/Tauri 或有反代环境下直接通过)
    if (!data || !data.playlist) {
      try {
        const officialUrl = `https://music.163.com/api/playlist/detail?id=${id}`;
        const offRes = await fetch(officialUrl, { signal: ctrl.signal });
        if (offRes.ok) {
          const offData = await offRes.json();
          if (offData && (offData.result || offData.playlist)) {
            data = { playlist: offData.result || offData.playlist };
          }
        }
      } catch {
        // ignore
      }
    }

    const playlist = data?.playlist;
    if (!playlist) {
      throw new Error('歌单解析失败，请检查歌单 ID 是否正确或歌单是否设为了私密');
    }

    const plName = playlist.name || '导入歌单';
    const plCover = playlist.coverImgUrl || playlist.picUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
    const plDesc = playlist.description || `导入自外部音乐歌单 (共 ${playlist.trackCount || playlist.tracks?.length || 0} 首)`;

    const rawTracks: any[] = Array.isArray(playlist.tracks) ? playlist.tracks : [];
    const tracks: Track[] = rawTracks.map((item: any, idx: number) => {
      const trackId = String(item.id || `import_${idx}`);
      const title = item.name || '未知曲目';
      const artist = Array.isArray(item.ar)
        ? item.ar.map((a: any) => a.name).join(' / ')
        : Array.isArray(item.artists)
          ? item.artists.map((a: any) => a.name).join(' / ')
          : (item.artist || '未知歌手');
      const album = item.al?.name || item.album?.name || '精选专辑';
      const duration = Math.round((item.dt || item.duration || 240000) / 1000);
      const cover = item.al?.picUrl || item.album?.picUrl || plCover;
      const audioUrl = `https://music.163.com/song/media/outer/url?id=${trackId}.mp3`;

      return {
        id: `ne_${trackId}`,
        title,
        artist,
        album,
        duration,
        coverUrl: cover,
        audioUrl,
        genre: '流行音乐',
        lyrics: '',
        bitrate: '320kbps / 官方原声',
        sourceScriptId: undefined,
        sourceName: '网易云音乐',
        sourceKey: 'wy',
        sourceRawInfo: {
          id: trackId,
          songmid: trackId,
          name: title,
          singer: artist,
          albumName: album,
          interval: duration,
          img: cover,
          audioUrl,
        },
      };
    });

    return {
      name: plName,
      coverUrl: plCover,
      description: plDesc,
      trackCount: tracks.length,
      tracks,
    };
  } finally {
    clearTimeout(timer);
  }
}
