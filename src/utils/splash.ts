/**
 * Fade out and remove the startup splash defined in index.html.
 * Safe to call multiple times — only the first call has any effect.
 */
let dismissed = false;
export function dismissSplash(): void {
  if (dismissed || typeof document === 'undefined') return;
  const el = document.getElementById('splash');
  dismissed = true;
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => el.remove(), 400);
}
