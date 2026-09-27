/**
 * MUSE.AUDIO Multi-Platform Auto Updater
 * Checks GitHub Releases API / Backend System API for new versions, changelogs, and matching binary packages.
 * Supports in-app one-click update for Web, Android APK, and Desktop environments.
 */

import { apiUrl } from './apiBase';

export const APP_VERSION = '1.0.0';
export const GITHUB_REPO = 'XCool-603/Music';
export const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const MIRROR_RELEASE_API = `https://ghfast.top/https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const RELEASES_PAGE_URL = `https://github.com/${GITHUB_REPO}/releases`;

export type PlatformType = 'windows' | 'android' | 'harmonyos' | 'linux' | 'ios' | 'web';

export interface ReleaseAsset {
  name: string;
  downloadUrl: string;
  mirrorDownloadUrl: string;
  size: number;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName: string;
  releaseNotes: string;
  releaseUrl: string;
  publishedAt: string;
  platform: PlatformType;
  downloadUrl?: string;
  mirrorDownloadUrl?: string;
  assetName?: string;
  assetSize?: number;
  allAssets: ReleaseAsset[];
  isDocker?: boolean;
}

/**
 * Detect runtime platform reliably across Web, Electron, Tauri, Capacitor, and HarmonyOS ArkWeb.
 */
export function detectPlatform(): PlatformType {
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '';

  // 1. HarmonyOS / ArkWeb check
  if (/OpenHarmony|ArkWeb|HarmonyOS/i.test(ua)) {
    return 'harmonyos';
  }

  // 2. Capacitor native check
  const cap = typeof window !== 'undefined' ? (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor : undefined;
  if (cap && typeof cap.getPlatform === 'function') {
    const p = cap.getPlatform();
    if (p === 'android') return 'android';
    if (p === 'ios') return 'ios';
  }

  // 3. User agent checks for mobile
  if (/Android/i.test(ua)) {
    return 'android';
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'ios';
  }

  // 4. Desktop OS checks (Tauri or Browser)
  if (/Windows|Win32|Win64/i.test(ua)) {
    return 'windows';
  }
  if (/Linux/i.test(ua)) {
    return 'linux';
  }

  return 'web';
}

/**
 * Compare two semver strings (e.g., '1.0.1' vs '1.0.0' or 'v1.2.0' vs 'v1.1.9').
 */
export function compareSemver(v1: string, v2: string): number {
  const clean1 = v1.replace(/^[vV]/, '').trim();
  const clean2 = v2.replace(/^[vV]/, '').trim();

  const parts1 = clean1.split(/[-+.]/).map(p => parseInt(p, 10) || 0);
  const parts2 = clean2.split(/[-+.]/).map(p => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Match the optimal installation asset for the given platform from the GitHub Release assets.
 */
export function matchPlatformAsset(
  assets: ReleaseAsset[],
  platform: PlatformType
): ReleaseAsset | undefined {
  if (!assets || assets.length === 0) return undefined;

  switch (platform) {
    case 'windows':
      return (
        assets.find(a => a.name.toLowerCase().endsWith('.exe')) ||
        assets.find(a => a.name.toLowerCase().endsWith('.msi'))
      );

    case 'android':
      return (
        assets.find(a => a.name.toLowerCase().includes('android') && a.name.toLowerCase().endsWith('.apk')) ||
        assets.find(a => a.name.toLowerCase().endsWith('.apk'))
      );

    case 'harmonyos':
      return (
        assets.find(a => a.name.toLowerCase().endsWith('.hap')) ||
        assets.find(a => a.name.toLowerCase().endsWith('.apk'))
      );

    case 'linux':
      return (
        assets.find(a => a.name.toLowerCase().endsWith('.appimage')) ||
        assets.find(a => a.name.toLowerCase().endsWith('.deb'))
      );

    case 'ios':
      return assets.find(a => a.name.toLowerCase().endsWith('.ipa'));

    case 'web':
    default:
      return undefined;
  }
}

const STORAGE_KEY_DISMISSED_VERSION = 'muse_dismissed_update_version';

export function isVersionDismissed(version: string): boolean {
  try {
    const dismissed = localStorage.getItem(STORAGE_KEY_DISMISSED_VERSION);
    return dismissed === version.replace(/^[vV]/, '').trim();
  } catch {
    return false;
  }
}

export function dismissVersion(version: string): void {
  try {
    localStorage.setItem(
      STORAGE_KEY_DISMISSED_VERSION,
      version.replace(/^[vV]/, '').trim()
    );
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Fetch latest release from Backend API or GitHub Mirrors and check if an update is available.
 * @param silent If true, ignores versions previously dismissed by the user.
 */
export async function checkForUpdates(silent = false): Promise<UpdateInfo | null> {
  const platform = detectPlatform();

  // Step 1: Try backend system API (fast, handles CORS, proxies GitHub)
  try {
    const checkEndpoint = apiUrl('/api/system/check-update');
    const res = await fetch(checkEndpoint, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.latestVersion) {
        const latestVersion = (data.latestVersion || '').replace(/^[vV]/, '').trim();
        const hasUpdate = compareSemver(latestVersion, APP_VERSION) > 0;

        if (silent && hasUpdate && isVersionDismissed(latestVersion)) {
          return null;
        }

        const allAssets: ReleaseAsset[] = Array.isArray(data.assets)
          ? data.assets.map((a: any) => ({
              name: a.name,
              downloadUrl: a.downloadUrl,
              mirrorDownloadUrl: a.mirrorDownloadUrl || `https://ghfast.top/${a.downloadUrl}`,
              size: a.size || 0,
            }))
          : [];

        const matchedAsset = matchPlatformAsset(allAssets, platform);

        return {
          currentVersion: APP_VERSION,
          latestVersion,
          hasUpdate,
          releaseName: data.releaseName || `v${latestVersion}`,
          releaseNotes: data.releaseNotes || '',
          releaseUrl: data.releaseUrl || RELEASES_PAGE_URL,
          publishedAt: new Date().toISOString(),
          platform,
          downloadUrl: matchedAsset ? matchedAsset.downloadUrl : (data.releaseUrl || RELEASES_PAGE_URL),
          mirrorDownloadUrl: matchedAsset ? matchedAsset.mirrorDownloadUrl : (data.releaseUrl || RELEASES_PAGE_URL),
          assetName: matchedAsset?.name,
          assetSize: matchedAsset?.size,
          allAssets,
          isDocker: !!data.isDocker,
        };
      }
    }
  } catch {
    // Fallback to direct client-side GitHub query
  }

  // Step 2: Fallback to GitHub API (Domestic mirror first, then direct)
  const candidateUrls = [MIRROR_RELEASE_API, LATEST_RELEASE_API];
  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/vnd.github.v3+json' },
        cache: 'no-cache',
      });

      if (!response.ok) continue;

      const data = await response.json();
      const latestTag = (data.tag_name || '').trim();
      if (!latestTag) continue;

      const latestVersion = latestTag.replace(/^[vV]/, '');
      const hasUpdate = compareSemver(latestVersion, APP_VERSION) > 0;

      if (silent && hasUpdate && isVersionDismissed(latestVersion)) {
        return null;
      }

      interface RawAsset {
        name: string;
        browser_download_url: string;
        size: number;
      }

      const allAssets: ReleaseAsset[] = Array.isArray(data.assets)
        ? data.assets.map((a: RawAsset) => ({
            name: a.name,
            downloadUrl: a.browser_download_url,
            mirrorDownloadUrl: `https://ghfast.top/${a.browser_download_url}`,
            size: a.size,
          }))
        : [];

      const matchedAsset = matchPlatformAsset(allAssets, platform);

      return {
        currentVersion: APP_VERSION,
        latestVersion,
        hasUpdate,
        releaseName: data.name || latestTag,
        releaseNotes: data.body || '',
        releaseUrl: data.html_url || RELEASES_PAGE_URL,
        publishedAt: data.published_at || new Date().toISOString(),
        platform,
        downloadUrl: matchedAsset ? matchedAsset.downloadUrl : (data.html_url || RELEASES_PAGE_URL),
        mirrorDownloadUrl: matchedAsset ? matchedAsset.mirrorDownloadUrl : (data.html_url || RELEASES_PAGE_URL),
        assetName: matchedAsset?.name,
        assetSize: matchedAsset?.size,
        allAssets,
      };
    } catch {
      // Continue to next mirror
    }
  }

  return null;
}

/**
 * Triggers backend Git update (pull latest code on server).
 */
export async function executeServerUpdate(): Promise<{
  success: boolean;
  message: string;
  isDocker?: boolean;
  updated?: boolean;
}> {
  try {
    const res = await fetch(apiUrl('/api/system/update'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      return { success: false, message: `服务端响应错误: ${res.status}` };
    }
    return await res.json();
  } catch (err: any) {
    return { success: false, message: `请求服务端更新失败: ${err?.message || err}` };
  }
}

/**
 * Clears Service Worker, CacheStorage, and reload page with timestamp to bust all web caches.
 */
export async function clearWebCacheAndReload(): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map(k => window.caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
      localStorage.removeItem('muse_dismissed_update_version');
    }
  } catch (e) {
    console.warn('[Updater] Clear cache error:', e);
  }

  // Force reload
  const cleanPath = window.location.pathname;
  const cleanHash = window.location.hash;
  window.location.href = `${window.location.origin}${cleanPath}?_t=${Date.now()}${cleanHash}`;
}

/**
 * In-app file downloader with real-time percentage progress and automatic mirror fallback.
 */
export async function downloadAssetFile(
  url: string,
  filename: string,
  useMirror = true,
  onProgress?: (percent: number, loaded: number, total: number) => void
): Promise<void> {
  const downloadTargetUrl = useMirror && url.startsWith('https://github.com/')
    ? `https://ghfast.top/${url}`
    : url;

  let response: Response;
  try {
    response = await fetch(downloadTargetUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    // If mirror or direct failed, attempt the other
    const fallbackUrl = downloadTargetUrl.includes('ghfast.top')
      ? url
      : `https://ghfast.top/${url}`;
    response = await fetch(fallbackUrl);
    if (!response.ok) {
      throw new Error(`下载失败: HTTP ${response.status}`);
    }
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;

  const reader = response.body?.getReader();
  if (!reader) {
    // Fallback: direct blob download
    const blob = await response.blob();
    triggerBlobDownload(blob, filename);
    return;
  }

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      if (total > 0 && onProgress) {
        const percent = Math.min(100, Math.round((loaded / total) * 100));
        onProgress(percent, loaded, total);
      }
    }
  }

  const blob = new Blob(chunks);
  triggerBlobDownload(blob, filename);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
}

/**
 * Format bytes to readable string (e.g. 78.4 MB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '未知大小';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
