const DEFAULT_ONLINE_API = 'http://dxcool.cn:3001';
const STORAGE_KEY = 'muse.backendBase';

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
}

export function getApiBase(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && /^https?:\/\//.test(saved)) return saved.replace(/\/+$/, '');
  } catch {
    /* ignore localStorage errors */
  }

  const host = window.location.hostname;
  const isLoopback =
    host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';

  // Vite dev server proxies /api -> localhost:3001.
  if (isLoopback && window.location.port === '3000') {
    return 'http://localhost:3001';
  }

  // Packaged shell (Tauri custom protocol, in-app local web server, Capacitor,
  // HarmonyOS ArkWeb rawfile) has no embedded backend — always talk online.
  const protocol = (window.location.protocol || '').toLowerCase();
  const isNativeShell =
    protocol !== 'http:' && protocol !== 'https:' && protocol.length > 0;
  if (isLoopback || isTauriRuntime() || isNativeShell) {
    return DEFAULT_ONLINE_API;
  }

  // Pure web deploy hosted on the API origin: same-origin /api (http://dxcool.cn:3001).
  if (host === 'dxcool.cn') {
    return '';
  }
  return DEFAULT_ONLINE_API;
}

export function setApiBase(base: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, base.trim());
  } catch {
    /* ignore */
  }
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  const clean = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${clean}` : clean;
}