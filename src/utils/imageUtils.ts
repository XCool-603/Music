import type { SyntheticEvent } from 'react';
import { getApiBase } from './apiBase';

/**
 * High-reliability cover image utilities & fallback assets
 */

export const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
];

export const DEFAULT_COVER = DEFAULT_COVERS[0];

/**
 * Normalizes any cover URL, upgrading http to https, fixing GDStudio pic endpoints,
 * removing invalid URLs, and returning a safe usable image URL.
 */
export function normalizeCoverUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return DEFAULT_COVER;
  }

  const trimmed = url.trim();

  // If it's a GDStudio pic endpoint that returns JSON, route it through our server proxy
  if (trimmed.includes('music-api.gdstudio.xyz/api.php?types=pic')) {
    const matchId = trimmed.match(/id=([^&]+)/);
    const matchSource = trimmed.match(/source=([^&]+)/);
    const id = matchId ? matchId[1] : '';
    const source = matchSource ? matchSource[1] : 'netease';
    return `${getApiBase()}/api/music/cover?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}`;
  }

  // Convert http to https to avoid Mixed Content blocks
  if (trimmed.startsWith('http://')) {
    return trimmed.replace('http://', 'https://');
  }

  // Kuwo short album cover format fix
  if (trimmed.startsWith('120/s') || trimmed.startsWith('500/s') || trimmed.startsWith('s4s') || trimmed.startsWith('s3s')) {
    const fullPath = trimmed.startsWith('120/')
      ? trimmed.replace('120/', '500/')
      : trimmed.startsWith('500/')
      ? trimmed
      : `500/${trimmed}`;
    return `https://img4.kuwo.cn/star/albumcover/${fullPath}`;
  }

  return trimmed;
}

/**
 * Safe image onError handler to replace broken images with a fallback
 */
export function handleImageError(e: SyntheticEvent<HTMLImageElement, Event>, fallbackUrl: string = DEFAULT_COVER) {
  const target = e.currentTarget;
  if (target.src !== fallbackUrl) {
    target.src = fallbackUrl;
  }
}
