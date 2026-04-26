import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Windows 上 Vite 默认只绑定 IPv6 (::1)，但 Electron/Chromium 解析 localhost 优先走 IPv4，
  // 会导致 loadURL('http://localhost:5173/') 报 ERR_CONNECTION_REFUSED。显式绑定 127.0.0.1。
  server: {
    host: '127.0.0.1',
    strictPort: true
  },
  build: {
    outDir: '.vite/renderer/main_window'
  }
});
