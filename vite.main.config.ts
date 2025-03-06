import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    // Some libs that can run in both Web and Node.js, the Node.js version is preferred by default
    // Give browser version priority
    mainFields: ['browser', 'module', 'main'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      external: [
        'electron',
        'electron-devtools-installer',
      ]
    }
  }
});