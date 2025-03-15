import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
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
        'electron-squirrel-startup', // Add this line
        // Add native modules and Node.js APIs
        'fs',
        'path',
        'child_process',
        'worker_threads',
        'util',
        'fluent-ffmpeg',
        '@ffmpeg-installer/ffmpeg',
        '@ffmpeg-installer/darwin-arm64',
        '@ffmpeg-installer/darwin-x64',
        '@ffmpeg-installer/linux-x64',
        '@ffmpeg-installer/win32-x64'
      ]
    }
  },
  // Define constants for builds
  define: {
    'process.env.FLUENTFFMPEG_COV': false,
    'process.env.PUBLIC_SCALE_URL': JSON.stringify('https://remotasks.com')
    // 'process.env.PUBLIC_SCALE_URL': JSON.stringify('http://localhost:3002')
  }
});