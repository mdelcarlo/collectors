// main.ts

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { VideoMatcher } from './main/services/videoMatcher';
import Store from 'electron-store';
import { MetaGenerator } from './main/services/metaGenerator';
import { MediaProcessor } from './main/services/mediaProcesor';
import { VideoStatus } from './types';

// Error handling setup
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const ENV = process.env.NODE_ENV
const isDev = ENV === 'development';

// Initialize store for persistent data
class StoreManager {
  private store: Store;

  constructor(env: string) {
    this.store = new Store({
      name: `video-pairs-data__v1__${env}`,
      defaults: {
        pairs: [],
        unpairedVideos: [],
      }
    });
    this.clear(); // Clear store on startup
  }

  clear() {
    this.store.clear();
    this.store.set({
      pairs: [],
      unpairedVideos: [],
    });
  }

  get(key: string): any {
    return this.store.get(key);
  }

  set(key: string, value: any) {
    this.store.set(key, value);
  }

  getPairs(): any[] {
    return this.store.get('pairs') as any[];
  }

  getUnpairedVideos(): any[] {
    return this.store.get('unpairedVideos') as any[];
  }

  updatePairs(pairs: any[]) {
    this.store.set('pairs', pairs);
  }

  updateUnpairedVideos(unpaired: any[]) {
    this.store.set('unpairedVideos', unpaired);
  }
}

// Application data manager
class DataManager {
  private storeManager: StoreManager;
  private mainWindow: BrowserWindow;
  private metaGenerator: MetaGenerator;
  private videoMatcher: VideoMatcher;
  private mediaProcessor: MediaProcessor;

  constructor(storeManager: StoreManager, mainWindow: BrowserWindow) {
    this.storeManager = storeManager;
    this.mainWindow = mainWindow;
    this.metaGenerator = new MetaGenerator();
    this.videoMatcher = new VideoMatcher();
    this.mediaProcessor = new MediaProcessor();
  }

  // Notify the renderer process of data updates
  notifyDataUpdated() {
    this.mainWindow.webContents.send('videos-updated', {
      pairs: this.storeManager.getPairs(),
      unpairedVideos: this.storeManager.getUnpairedVideos()
    });
  }

  // Update video state in pairs
  updateVideoState(video: any) {
    console.log('Updating video state:', video);
    const pairs = this.storeManager.getPairs();

    const updatedPairs = pairs.map(pair => ({
      ...pair,
      video1: pair.video1.id === video.id ? video : pair.video1,
      video2: pair.video2.id === video.id ? video : pair.video2
    }));

    this.storeManager.updatePairs(updatedPairs);
    this.notifyDataUpdated();
  }

  // Process videos
  async processVideos(videoIds: string[]) {
    try {
      const pairs = this.storeManager.getPairs();
      const unpaired = this.storeManager.getUnpairedVideos();
      
      // Map all videos from pairs, adding pairId to each video
      const allVideos = [
        ...pairs.flatMap(p => [
          {...p.video1, pairId: p.id}, 
          {...p.video2, pairId: p.id}
        ]).map(video => ({
          ...video,
          status: videoIds.includes(video.id) ? 'processing' : video.status
        })),
        ...unpaired
      ];

      // Update status of videos that will be processed
      let updatedPairs = pairs.map(pair => ({
        ...pair,
        video1: {
          ...pair.video1,
          ...videoIds.includes(pair.video1.id) ? { status: 'processing' } : {},
        },
        video2: {
          ...pair.video2,
          ...videoIds.includes(pair.video2.id) ? { status: 'processing' } : {},
        }
      }));

      this.storeManager.updatePairs(updatedPairs);
      this.notifyDataUpdated();

      // Filter to only process requested videos
      const videosToProcess = allVideos.filter(v => videoIds.includes(v.id));

      // Group videos by pair for batch processing
      const videosToProcessGroupedByPair = this.groupVideosByPair(videosToProcess);
      
      // Process each batch of videos
      for (const videos of Object.values(videosToProcessGroupedByPair)) {
        const results = await this.mediaProcessor.processBatch(
          videos, 
          this.updateVideoState.bind(this)
        );
        
        // Mark processed videos
        results.forEach(result => {
          result.status = 'processed';
        });
        
        // Update pairs with processed video results
        updatedPairs = this.storeManager.getPairs().map(pair => ({
          ...pair,
          video1: results.find(r => r.id === pair.video1.id) || pair.video1,
          video2: results.find(r => r.id === pair.video2.id) || pair.video2
        }));
        
        this.storeManager.updatePairs(updatedPairs);
        
        // Notify renderer about the updates
        this.mainWindow.webContents.send('media-processed', results);
        this.notifyDataUpdated();
      }

      return true;
    } catch (error) {
      console.error('Error processing media:', error);
      this.mainWindow.webContents.send('processing-error', {
        type: 'media',
        error: error.message
      });
      return false;
    }
  }

  // Helper to group videos by pair ID
  private groupVideosByPair(videos: any[]) {
    return videos.reduce((acc, video) => {
      if (!acc[video.pairId]) {
        acc[video.pairId] = [];
      }
      acc[video.pairId].push(video);
      return acc;
    }, {});
  }
  
  // Resume processing for videos that were in 'processing' state
  async resumeProcessingVideos() {
    try {
      console.log('Loading status of processing videos...');
      const existingPairs = this.storeManager.getPairs();

      // Find videos that were in processing state
      const videosToProcess = existingPairs
        .flatMap(p => [{ ...p.video1, pairId: p.id }, { ...p.video2, pairId: p.id }])
        .filter(video => video.status === 'processing');
      
      if (videosToProcess.length === 0) return;

      const videoIds = videosToProcess.map(v => v.id);
      await this.processVideos(videoIds, true);
    } catch (err) {
      console.error('Failed to resume processing videos:', err);
    }
  }
  
  // Upload and optionally auto-match videos
  async uploadVideos(autoMatchVideos = false) {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Videos', extensions: ['mp4', 'avi', 'mov', 'mkv', 'insv'] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    // Get existing data
    const existingPairs = this.storeManager.getPairs();
    const existingUnpaired = this.storeManager.getUnpairedVideos();

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
    const videosWithMeta = await this.metaGenerator.generateBatch(newVideos);

    if (!autoMatchVideos) {
      const remainingUnpaired = [...existingUnpaired, ...videosWithMeta];
      this.storeManager.updateUnpairedVideos(remainingUnpaired);
      this.notifyDataUpdated();
      return { pairs: existingPairs, unpaired: remainingUnpaired };
    }

    // Try to match new videos with existing unpaired videos
    const { pairs: newPairs, unpaired: remainingUnpaired } = await this.videoMatcher.matchVideos(
      [...existingUnpaired, ...videosWithMeta]
    );

    // Combine existing pairs with new pairs
    const updatedPairs = [...existingPairs, ...newPairs];

    // Update store
    this.storeManager.updatePairs(updatedPairs);
    this.storeManager.updateUnpairedVideos(remainingUnpaired);
    this.notifyDataUpdated();

    return { pairs: updatedPairs, unpaired: remainingUnpaired };
  }
  
  // Manually pair two videos
  pairVideos(video1Id: string, video2Id: string) {
    const unpaired = this.storeManager.getUnpairedVideos();
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
    const pairs = this.storeManager.getPairs();
    this.storeManager.updatePairs([...pairs, newPair]);

    // Remove paired videos from unpaired list
    const updatedUnpaired = unpaired.filter(v => v.id !== video1Id && v.id !== video2Id);
    this.storeManager.updateUnpairedVideos(updatedUnpaired);
    
    this.notifyDataUpdated();
    return { success: true, pair: newPair };
  }
  
  // Unpair videos
  unpairVideos(pairId: string) {
    const pairs = this.storeManager.getPairs();
    const pairIndex = pairs.findIndex(p => p.id === pairId);

    if (pairIndex === -1) {
      return { success: false, error: 'Pair not found' };
    }

    // Get the pair to be removed
    const pair = pairs[pairIndex];

    // Remove the pair
    const updatedPairs = pairs.filter((_, i) => i !== pairIndex);
    this.storeManager.updatePairs(updatedPairs);

    // Add videos back to unpaired list
    const unpaired = this.storeManager.getUnpairedVideos();
    this.storeManager.updateUnpairedVideos([
      ...unpaired,
      { ...pair.video1, paired: false, pairId: null },
      { ...pair.video2, paired: false, pairId: null }
    ]);

    this.notifyDataUpdated();
    return { success: true };
  }
  
  // Get all videos data
  getAllVideos() {
    return {
      pairs: this.storeManager.getPairs(),
      unpairedVideos: this.storeManager.getUnpairedVideos(),
      extractedAudios: this.storeManager.get('extractedAudios')
    };
  }
}

// Window manager
class WindowManager {
  static createWindow(): BrowserWindow {
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
  }
}

// IPC handler setup
class IpcHandlerSetup {
  private dataManager: DataManager;
  
  constructor(dataManager: DataManager) {
    this.dataManager = dataManager;
  }
  
  setup() {
    // Handle video upload
    ipcMain.handle('upload-videos', async (_, autoMatchVideos = false) => {
      return this.dataManager.uploadVideos(autoMatchVideos);
    });

    // Handle media processing
    ipcMain.handle('process-media', async (_, videoIds) => {
      return this.dataManager.processVideos(videoIds);
    });

    // Handle manual video pairing
    ipcMain.handle('pair-videos', async (_, video1Id, video2Id) => {
      return this.dataManager.pairVideos(video1Id, video2Id);
    });

    // Handle unpairing videos
    ipcMain.handle('unpair-videos', async (_, pairId) => {
      return this.dataManager.unpairVideos(pairId);
    });

    // Get all videos data
    ipcMain.handle('get-all-videos', async () => {
      return this.dataManager.getAllVideos();
    });
  }
}

// Application bootstrap
class Application {
  private storeManager: StoreManager;
  private windowManager: typeof WindowManager;
  private dataManager: DataManager;
  private ipcHandlerSetup: IpcHandlerSetup;
  
  constructor() {
    this.storeManager = new StoreManager(ENV);
    this.windowManager = WindowManager;
  }
  
  async start() {
    try {
      // Handle Squirrel startup for Windows
      this.handleSquirrelStartup();
      
      // Initialize application when Electron is ready
      app.whenReady().then(() => {
        const mainWindow = this.windowManager.createWindow();
        
        this.dataManager = new DataManager(this.storeManager, mainWindow);
        this.ipcHandlerSetup = new IpcHandlerSetup(this.dataManager);
        
        // Set up IPC handlers
        this.ipcHandlerSetup.setup();
        
        // Resume processing of any videos in 'processing' state
        this.dataManager.resumeProcessingVideos();
        
        app.on('activate', () => {
          // On macOS it's common to re-create a window in the app when the
          // dock icon is clicked and there are no other windows open.
          if (BrowserWindow.getAllWindows().length === 0) {
            this.windowManager.createWindow();
          }
        });
      });
      
      // Quit when all windows are closed, except on macOS
      app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
          app.quit();
        }
      });
    } catch (error) {
      console.error('Failed to start application:', error);
      process.exit(1);
    }
  }
  
  private handleSquirrelStartup() {
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
  }
}

// Start the application
const application = new Application();
application.start();