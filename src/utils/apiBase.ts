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

  // Explicit build-time override, e.g. VITE_API_BASE=https://api.example.com.
  const envBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  if (envBase && /^https?:\/\//.test(envBase)) {
    return envBase.replace(/\/+$/, '');
  }

  const protocol = (window.location.protocol || '').toLowerCase();
  const isNativeShell =
    protocol !== 'http:' && protocol !== 'https:' && protocol.length > 0;
  if (isTauriRuntime() || isNativeShell) {
    // Packaged shell (Tauri custom protocol, in-app local web server, Capacitor,
    // HarmonyOS ArkWeb rawfile) has no embedded backend — always talk online.
    return DEFAULT_ONLINE_API;
  }

  // Pure web deploy (any host served over http/https): use same-origin /api.
  // The backend is expected to be served from the same origin the frontend is
  // deployed on, so we must not hardcode a fixed domain.
  return '';
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