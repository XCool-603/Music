/**
 * MUSE.AUDIO Multi-Platform Auto Updater
 * Checks GitHub Releases API for new versions, changelogs, and matching binary packages.
 */

export const APP_VERSION = '1.0.0';
export const GITHUB_REPO = 'XCool-603/Music';
export const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const RELEASES_PAGE_URL = `https://github.com/${GITHUB_REPO}/releases`;

export type PlatformType = 'windows' | 'android' | 'harmonyos' | 'linux' | 'ios' | 'web';

export interface ReleaseAsset {
  name: string;
  downloadUrl: string;
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
  assetName?: string;
  assetSize?: number;
  allAssets: ReleaseAsset[];
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
 * Returns:
 *   1 if v1 > v2 (v1 is newer)
 *  -1 if v1 < v2 (v1 is older)
 *   0 if v1 === v2
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
      // Prefer Setup .exe, then .msi
      return (
        assets.find(a => a.name.toLowerCase().endsWith('.exe')) ||
        assets.find(a => a.name.toLowerCase().endsWith('.msi'))
      );

    case 'android':
      // Universal or target .apk
      return (
        assets.find(a => a.name.toLowerCase().includes('android') && a.name.toLowerCase().endsWith('.apk')) ||
        assets.find(a => a.name.toLowerCase().endsWith('.apk'))
      );

    case 'harmonyos':
      // .hap file first, or fallback to apk
      return (
        assets.find(a => a.name.toLowerCase().endsWith('.hap')) ||
        assets.find(a => a.name.toLowerCase().endsWith('.apk'))
      );

    case 'linux':
      // Prefer .AppImage, then .deb
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
 * Fetch latest release from GitHub API and check if an update is available.
 * @param silent If true, ignores versions previously dismissed by the user.
 */
export async function checkForUpdates(silent = false): Promise<UpdateInfo | null> {
  try {
    const response = await fetch(LATEST_RELEASE_API, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn('[Updater] No release found on GitHub repository.');
        return null;
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const latestTag = (data.tag_name || '').trim();
    if (!latestTag) return null;

    const latestVersion = latestTag.replace(/^[vV]/, '');
    const hasUpdate = compareSemver(latestVersion, APP_VERSION) > 0;

    if (silent && hasUpdate && isVersionDismissed(latestVersion)) {
      // User chose to ignore this version during silent checks
      return null;
    }

    const platform = detectPlatform();

    interface RawAsset {
      name: string;
      browser_download_url: string;
      size: number;
    }

    const allAssets: ReleaseAsset[] = Array.isArray(data.assets)
      ? data.assets.map((a: RawAsset) => ({
          name: a.name,
          downloadUrl: a.browser_download_url,
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
      assetName: matchedAsset?.name,
      assetSize: matchedAsset?.size,
      allAssets,
    };
  } catch (error) {
    if (!silent) {
      console.error('[Updater] Failed to check for updates:', error);
    }
    return null;
  }
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
