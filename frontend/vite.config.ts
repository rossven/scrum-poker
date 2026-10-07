import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Geliştirmede API ve WebSocket istekleri Spring Boot'a (8080) yönlendirilir.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
  // Avatar kütüphanesi paketi büyütüyor; şimdilik tek dosya kabul edilebilir.
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 800 },
});
