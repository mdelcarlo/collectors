// main.ts

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { VideoMatcher } from './main/services/videoMatcher';
import Store from 'electron-store';
import { MetaGenerator } from './main/services/metaGenerator';
import { MediaProcessor } from './main/services/mediaProcesor';
import { VideoStatus } from './types';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const ENV = process.env.NODE_ENV

// Initialize store for persistent data
const store = new Store({
  name: `video-pairs-data__v1__${ENV}`,
  defaults: {
    pairs: [],
    unpairedVideos: [],
  }
});

function clearStore() {
  store.clear();
  store.set({
    pairs: [],
    unpairedVideos: [],
  });
}

clearStore()

const updateVideoState = (mainWindow: BrowserWindow) => (video) => {
  console.log('Updating video state:', video);
  const pairs = store.get('pairs') as any[];

  const updatedPairs = pairs.map(pair => ({
    ...pair,
    video1: pair.video1.id === video.id ? video : pair.video1,
    video2: pair.video2.id === video.id ? video : pair.video2
  }));
  console.log('updatedPairs: ', updatedPairs);

  store.set('pairs', updatedPairs);

  mainWindow.webContents.send('videos-updated', {
    pairs: updatedPairs,
    unpairedVideos: store.get('unpairedVideos')
  });
}

const loadProcessingVideos = async (mainWindow: BrowserWindow) => {
  try {
    console.log('Loading status of processing videos...');
    const existingPairs = store.get('pairs') as any[];

    const videosToProcess = existingPairs.flatMap(p => [{ ...p.video1, pairId: p.id }, { ...p.video2, pairId: p.id }]).filter(video => video.status === 'processing');
    console.log('videosToProcess: ', videosToProcess);

    const videoIds = videosToProcess.map(v => v.id);

    // const startTime = Date.now();
    let updatedPairs = existingPairs.map(pair => ({
      ...pair,
      video1: {
        ...pair.video1,
        ...videoIds.includes(pair.video1.id) ? {
          status: 'processing',
          startProcessingTime: undefined,
        } : {},
      },
      video2: {
        ...pair.video2,
        ...videoIds.includes(pair.video2.id) ? {
          status: 'processing',
          startProcessingTime: undefined,
        } : {},
      }
    }));

    store.set('pairs', updatedPairs);

    // Notify renderer about the updates
    mainWindow.webContents.send('videos-updated', {
      pairs: store.get('pairs'),
      unpairedVideos: store.get('unpairedVideos')
    });

    const updateVideoCallback = updateVideoState(mainWindow)
    // Process videos with the new MediaProcessor
    const videosToProcessGroupedByPair = videosToProcess.reduce((acc, video) => {
      if (!acc[video.pairId]) {
        acc[video.pairId] = [];
      }
      acc[video.pairId].push(video);
      return acc;
    }, {});
    for (const videos of Object.values(videosToProcessGroupedByPair)) {
      const results = await mediaProcessor.processBatch(videos, updateVideoCallback);
    
      // Mark processed videos
      results.forEach(result => {
        result.status = 'processed';
      });
    
      updatedPairs = store.get('pairs').map(pair => ({
        ...pair,
        video1: results.find(r => r.id === pair.video1.id) || pair.video1,
        video2: results.find(r => r.id === pair.video2.id) || pair.video2
      }));
    
      store.set('pairs', updatedPairs);
    
      // Notify renderer about the updates
      mainWindow.webContents.send('media-processed', results);
      mainWindow.webContents.send('videos-updated', {
        pairs: store.get('pairs'),
        unpairedVideos: store.get('unpairedVideos')
      });
    }

    store.set('pairs', updatedPairs);

    // Notify renderer about the updates
    mainWindow.webContents.send('media-processed', results);
    mainWindow.webContents.send('videos-updated', {
      pairs: store.get('pairs'),
      unpairedVideos: store.get('unpairedVideos')
    });

  } catch (err) {
    console.error('Failed to load status of processed videos:', err);
  }
}


// Initialize services
const metaGenerator = new MetaGenerator();
const videoMatcher = new VideoMatcher();
const mediaProcessor = new MediaProcessor();

const isDev = ENV === 'development';

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security to allow local resource loading
    },
  });
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../../dist/renderer/index.html"));
  }

  return mainWindow;
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling
try {
  // Only relevant on Windows
  if (process.platform === 'win32') {
    const squirrelStartup = require('electron-squirrel-startup');
    if (squirrelStartup) {
      app.quit();
      process.exit(0);
    }
  }
} catch (error) {
  console.log('Squirrel startup check failed, likely not on Windows:', error.message);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  const mainWindow = createWindow();

  // Set up IPC handlers
  setupIpcHandlers(mainWindow);

  loadProcessingVideos(mainWindow);

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Set up all IPC handlers
function setupIpcHandlers(mainWindow: BrowserWindow) {
  // Handle video upload
  ipcMain.handle('upload-videos', async (_, autoMatchVideos = false) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Videos', extensions: ['mp4', 'avi', 'mov', 'mkv', 'insv'] }]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      // Get existing data
      const existingPairs = store.get('pairs') as any[];
      const existingUnpaired = store.get('unpairedVideos') as any[];

      // Process new videos
      const newVideos = await Promise.all(
        result.filePaths.map(async (filePath) => {
          const stats = await fs.stat(filePath);
          return {
            id: path.basename(filePath),
            path: filePath,
            name: path.basename(filePath),
            createdAt: stats.birthtime,
            paired: false,
            pairId: null,
            size: stats.size,
            status: 'idle' as VideoStatus
          };
        })
      );

      // Generate metadata for new videos
      const videosWithMeta = await metaGenerator.generateBatch(newVideos);


      if (!autoMatchVideos) {
        const remainingUnpaired = [...existingUnpaired, ...videosWithMeta];
        store.set('unpairedVideos', remainingUnpaired);

        // Notify renderer
        mainWindow.webContents.send('videos-updated', {
          pairs: existingPairs,
          unpairedVideos: remainingUnpaired
        });

        return { pairs: existingPairs, unpaired: remainingUnpaired };
      }


      // Only try to match new videos with existing unpaired videos
      const { pairs: newPairs, unpaired: remainingUnpaired } = await videoMatcher.matchVideos(
        [...existingUnpaired, ...videosWithMeta]
      );

      // Combine existing pairs with new pairs
      const updatedPairs = [...existingPairs, ...newPairs];

      // Update store
      store.set('pairs', updatedPairs);
      store.set('unpairedVideos', remainingUnpaired);

      // Notify renderer
      mainWindow.webContents.send('videos-updated', {
        pairs: updatedPairs,
        unpairedVideos: remainingUnpaired
      });

      return { pairs: updatedPairs, unpaired: remainingUnpaired };
    }

    return null;
  });

  ipcMain.handle('process-media', async (_, videoIds) => {
    console.log('Processing media:', videoIds);
    try {
      const pairs = store.get('pairs') as any[];
      const unpaired = store.get('unpairedVideos') as any[];
      const allVideos = [
        ...pairs.flatMap(p => [{...p.video1, pairId: p.id}, {...p.video2, pairId: p.id}]).map(video => ({
          ...video,
          status: videoIds.includes(video.id) ? 'processing' : video.status
        })),
        ...unpaired
      ];

      let updatedPairs = pairs.map(pair => ({
        ...pair,
        video1: {
          ...pair.video1,
          ...videoIds.includes(pair.video1.id) ? {
            status: 'processing',
            // startProcessingTime: startTime,
          } : {},
        },
        video2: {
          ...pair.video2,
          ...videoIds.includes(pair.video2.id) ? {
            status: 'processing',
            // startProcessingTime: startTime,
          } : {},
        }
      }));

      store.set('pairs', updatedPairs);

      // Notify renderer about the updates
      mainWindow.webContents.send('videos-updated', {
        pairs: store.get('pairs'),
        unpairedVideos: store.get('unpairedVideos')
      });



      // Filter to only process requested videos
      const videosToProcess = allVideos.filter(v => videoIds.includes(v.id));

      const updateVideoCallback = updateVideoState(mainWindow)
      // Process videos with the new MediaProcessor
      const videosToProcessGroupedByPair = videosToProcess.reduce((acc, video) => {
        if (!acc[video.pairId]) {
          acc[video.pairId] = [];
        }
        acc[video.pairId].push(video);
        return acc;
      }, {});
      console.log('videosToProcessGroupedByPair: ', videosToProcessGroupedByPair);
      for (const videos of Object.values(videosToProcessGroupedByPair)) {
        const results = await mediaProcessor.processBatch(videos, updateVideoCallback);
        console.log('--------results: ', results);
      
        // Mark processed videos
        results.forEach(result => {
          result.status = 'processed';
        });
      
        updatedPairs = store.get('pairs').map(pair => ({
          ...pair,
          video1: results.find(r => r.id === pair.video1.id) || pair.video1,
          video2: results.find(r => r.id === pair.video2.id) || pair.video2
        }));
      
        store.set('pairs', updatedPairs);
      
        // Notify renderer about the updates
        mainWindow.webContents.send('media-processed', results);
        mainWindow.webContents.send('videos-updated', {
          pairs: store.get('pairs'),
          unpairedVideos: store.get('unpairedVideos')
        });
      }
    } catch (error) {
      console.error('Error processing media:', error);
      mainWindow.webContents.send('processing-error', {
        type: 'media',
        error: error.message
      });
      return [];
    }
  });

  // Handle manual video pairing
  ipcMain.handle('pair-videos', async (_, video1Id, video2Id) => {
    const unpaired = store.get('unpairedVideos') as any[];
    const video1 = unpaired.find(v => v.id === video1Id);
    const video2 = unpaired.find(v => v.id === video2Id);

    if (!video1 || !video2) {
      return { success: false, error: 'Videos not found' };
    }

    // Create new pair
    const newPair = {
      id: `${video1.id}-${video2.id}`,
      video1,
      video2,
      createdAt: new Date(),
    };

    // Update pairs in store
    const pairs = store.get('pairs') as any[];
    store.set('pairs', [...pairs, newPair]);

    // Remove paired videos from unpaired list
    const updatedUnpaired = unpaired.filter(v => v.id !== video1Id && v.id !== video2Id);
    store.set('unpairedVideos', updatedUnpaired);

    // Notify renderer
    mainWindow.webContents.send('videos-updated', {
      pairs: store.get('pairs'),
      unpairedVideos: store.get('unpairedVideos')
    });

    return { success: true, pair: newPair };
  });

  // Handle unpairing videos
  ipcMain.handle('unpair-videos', async (_, pairId) => {
    const pairs = store.get('pairs') as any[];
    const pairIndex = pairs.findIndex(p => p.id === pairId);

    if (pairIndex === -1) {
      return { success: false, error: 'Pair not found' };
    }

    // Get the pair to be removed
    const pair = pairs[pairIndex];

    // Remove the pair
    const updatedPairs = pairs.filter((_, i) => i !== pairIndex);
    store.set('pairs', updatedPairs);

    // Add videos back to unpaired list
    const unpaired = store.get('unpairedVideos') as any[];
    store.set('unpairedVideos', [
      ...unpaired,
      { ...pair.video1, paired: false, pairId: null },
      { ...pair.video2, paired: false, pairId: null }
    ]);

    // Notify renderer
    mainWindow.webContents.send('videos-updated', {
      pairs: store.get('pairs'),
      unpairedVideos: store.get('unpairedVideos')
    });

    return { success: true };
  });

  // Get all videos data
  ipcMain.handle('get-all-videos', async () => {
    return {
      pairs: store.get('pairs'),
      unpairedVideos: store.get('unpairedVideos'),
      extractedAudios: store.get('extractedAudios')
    };
  });
}