import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4178,
    proxy: {
      '/api': { target: 'http://127.0.0.1:4108', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:4108', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:4108', changeOrigin: true, ws: true },
    },
  },
});
