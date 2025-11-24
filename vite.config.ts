import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Critical for Vercel deployment to find assets
  server: {
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});