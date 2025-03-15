import path from 'path';
import fs from 'fs/promises';
import { app, BrowserWindow } from 'electron';
import { Worker } from 'worker_threads';
import { logger } from './loggerService';

export class MetaGenerator {
  private outputDir: string;
  private pythonScriptsDir: string;
  private pythonPath: string;

  constructor(mainWindow: BrowserWindow) {
    // Create thumbnails folder in app data directory
    this.outputDir = path.join(app.getPath('userData'), 'thumbnails');
    this.pythonScriptsDir = path.join(app.getAppPath(), 'python').replace('/app.asar', '');

    // Set the main window in the logger singleton
    logger.setMainWindow(mainWindow);

    logger.log('logger set up!')

    this.ensureOutputDirExists();
    this.pythonPath = this.getPythonPath();
  }

  /**
   * Gets the appropriate Python path for the current environment
   */
  private getPythonPath(): string {
    const isDev = !app.isPackaged;
    console.log('isDev: ', isDev);

    if (isDev) {
      // In development, use the system Python or local venv
      return process.platform === 'darwin' ? 'python3.9' : 'python3';
    }

    // In production, use the bundled Python
    let pythonExecutable = '';

    if (process.platform === 'darwin') {
      // For macOS, the path is inside the .app bundle
      // app.getAppPath() typically returns /Applications/YourApp.app/Contents/Resources/app
      // We need to go up to Contents and then to Resources/venv
      const appDir = isDev ? path.dirname(path.dirname(app.getAppPath())) : path.dirname(app.getPath('exe')).split('/MacOS').join('');
      pythonExecutable = path.join(appDir, 'Resources', 'venv', 'bin', 'python3.9');
    } else if (process.platform === 'win32') {
      // For Windows
      const appDir = path.dirname(app.getAppPath()); // Go up to resources
      pythonExecutable = path.join(appDir, 'venv', 'Scripts', 'python.exe');
    } else {
      // For Linux
      const appDir = path.dirname(app.getAppPath()); // Go up to resources
      pythonExecutable = path.join(appDir, 'venv', 'bin', 'python3');
    }

    logger.log(`Using Python executable: ${pythonExecutable}`);
    return pythonExecutable;
  }

  private async ensureOutputDirExists() {
    try {
      await fs.access(this.outputDir);
    } catch (error) {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate metadata for multiple videos concurrently using worker threads
   * that call a Python script with OpenCV
   */
  async generateBatch(videos: any[]): Promise<any[]> {
    return new Promise((resolve) => {
      logger.log('Generating metadata for videos:', videos);
      logger.log('Python path:', this.pythonPath);
      logger.log('output path:', this.outputDir);
      // Create a worker for metadata generation
      const worker = new Worker(`
        
        const { parentPort, workerData } = require('worker_threads');
        const path = require('path');
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
                    parentPort.postMessage({ 
                type: 'log', 
                message: 'init'
              });
        
        async function getVideoInfo(video, pythonScriptsDir, pythonPath) {
          try {
               parentPort.postMessage({ 
                type: 'log', 
                message: 'before join'
              });
            const pythonScript = pythonScriptsDir + '/extract_video_info.py'
                           parentPort.postMessage({ 
                type: 'log', 
                message: 'pythonScript: ' +pythonScript,
              });
            const command = \`\${pythonPath} "\${pythonScript}" -i "\${video.path}"\`;
            parentPort.postMessage({ 
                type: 'log', 
                message: 'before comand'
              });
            const { stdout, stderr } = await execAsync(command);
            parentPort.postMessage({ 
                type: 'log', 
                message: 'after command' + stdout
              });
            
            if (stderr) {
            parentPort.postMessage({ 
                type: 'log', 
                message: 'error' + stderr
              });
              console.error('Python stderr:', stderr);
            }
            
            // Parse the JSON output from the Python script
            const result = JSON.parse(stdout);
            
            if (result.error) {
              throw new Error(result.error);
            }
            
            return result;
          } catch (error) {
            console.error('Error getting video info:', error);
            throw error;
          }
        }
        
        async function processBatch() {
          const { videos, pythonScriptsDir, pythonPath } = workerData;
          const results = [];
                          parentPort.postMessage({ 
                type: 'log', 
                message: 'pythonScriptsDir: ' +pythonScriptsDir,
                });
                              parentPort.postMessage({ 
                type: 'log', 
                message: 'pythonPath: ' +pythonPath,
                });
                       parentPort.postMessage({ 
                type: 'log', 
                message: 'videos: ' + JSON.stringify(videos),
              });
          for (const video of videos) {
           parentPort.postMessage({ 
                type: 'log', 
                message: 'inside loop',
              });
            try {
              const videoInfo = await getVideoInfo(video, pythonScriptsDir, pythonPath);
              const processedVideo = {
                ...video,
                fps: videoInfo.fps,
                duration: videoInfo.duration,
                frameCount: videoInfo.frame_count,
                width: videoInfo.width,
                height: videoInfo.height,
                checksum: videoInfo.checksum,
                processingTime: 0
              };
              results.push(processedVideo);
              
              // Report progress back to main thread
              parentPort.postMessage({ type: 'progress', video: processedVideo });
            } catch (error) {
              console.error('Error processing video:', error);
              parentPort.postMessage({ 
                type: 'error', 
                videoId: video.id || path.basename(video.path), 
                error: error.message 
              });
              
            }
          }
          
          parentPort.postMessage({ type: 'complete', results });
        }
        
        processBatch();
      `, {
        eval: true,
        workerData: {
          videos,
          pythonScriptsDir: this.pythonScriptsDir,
          pythonPath: this.pythonPath,  // Pass the Python path to the worker
        }
      });

      const results: any[] = [];

      worker.on('message', (message) => {
        if (message.type === "log") {
          logger.log(message.message);
        } else if (message.type === 'progress') {
          results.push(message.video);
        } else if (message.type === 'complete') {
          resolve(results);
        }
      });

      worker.on('error', (err) => {
        console.error('Worker error:', err);
        logger.log('error:', err);

        resolve(results);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker stopped with exit code ${code}`);
        }
        resolve(results);
      });
    });
  }
}