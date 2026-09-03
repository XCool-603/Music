import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ command }) => {
  return {
    base: process.env.TAURI_BUILD === '1'
      ? './'
      : process.env.BUILD_TARGET === 'capacitor'
        ? '/'
        : command === 'build'
          ? '/music/'
          : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      frontendDist: "./dist",
      outDir: process.env.TAURI_BUILD === '1' ? 'dist-tauri' : 'dist',
      modulePreload: { polyfill: false },
    },
    server: {
      port: 3000,
      strictPort: false,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          // Local dev proxies to the local backend; override with API_PROXY_TARGET
          // (e.g. http://dxcool.cn:3001) to point at a remote deployment.
          target: process.env.API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
          timeout: 30000,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              console.error('[Proxy Error]', err.message);
              if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
              }
            });
          },
        },
      },
    },
  };
});
