import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Windows 上 Vite 默认只绑定 IPv6 (::1)，但 Electron/Chromium 解析 localhost 优先走 IPv4，
  // 会导致 load URL 报 ERR_CONNECTION_REFUSED。显式绑定 127.0.0.1。
  // 部分环境下默认 5173 会出现 listen EACCES，改用非常用端口并允许占用时自动递增（plugin-vite 会注入实际 URL）。
  server: {
    host: '127.0.0.1',
    port: 5180,
    strictPort: false
  },
  build: {
    outDir: '.vite/renderer/main_window'
  }
});
