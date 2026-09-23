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
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/src-tauri/**', '**/harmonyos/**', '**/builds/**', '**/dist/**', '**/dist-tauri/**', '**/api-publish2/**'],
      },
      proxy: {
        '/api': {
          target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001',
          changeOrigin: true,
          timeout: 30000,
        },
      },
    },
  };
});
