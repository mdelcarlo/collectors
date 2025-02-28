import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    // See vite.main.config.ts
    mainFields: ['browser', 'module', 'main'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      external: ['electron']
    }
  }
});