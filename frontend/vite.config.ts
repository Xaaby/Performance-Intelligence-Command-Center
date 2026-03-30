import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Repo root (parent of `frontend/`) so root `.env` is picked up for `VITE_PROXY_TARGET`. */
const envDir = path.resolve(__dirname, '..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '');
  // Dev-only: browser calls `/api/*` → forwarded to the Nest process. Production builds use `VITE_API_URL`
  // (see `getApiBaseUrl()`); do not point this proxy at `VITE_API_URL` — that breaks local dev.
  const proxyTarget =
    process.env.VITE_PROXY_TARGET || env.VITE_PROXY_TARGET || 'http://localhost:3001';

  return {
    plugins: [react(), tailwindcss()],
    envDir,
    server: {
      host: '0.0.0.0',
      port: 5173,
      watch: {
        usePolling: true,
      },
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
