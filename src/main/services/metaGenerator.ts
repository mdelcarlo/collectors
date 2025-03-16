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
    this.pythonScriptsDir = path.join(app.getAppPath().replace('app.asar', ''), 'python');

    // Set the main window in the logger singleton
    logger.setMainWindow(mainWindow);

    logger.log('🚀 MetaGenerator initialized');

    this.ensureOutputDirExists();
    this.pythonPath = this.getPythonPath();
  }

  /**
   * Gets the appropriate Python path for the current environment
   */
  private getPythonPath(): string {
    const isDev = !app.isPackaged;
    logger.log(`🔧 Environment: ${isDev ? 'development' : 'production'}`);

    if (isDev) {
      // In development, use the system Python or local venv
      const pythonPath = process.platform === 'darwin' ? 'python3.9' : 'python3';
      logger.log(`🐍 Using development Python: ${pythonPath}`);
      return pythonPath;
    }

    // In production, use the bundled Python
    let pythonExecutable = '';

    if (process.platform === 'darwin') {
      // For macOS, the path is inside the .app bundle
      const appDir = isDev ? path.dirname(path.dirname(app.getAppPath())) : path.dirname(app.getPath('exe')).split('/MacOS').join('');
      pythonExecutable = path.join(appDir, 'Resources', 'venv', 'bin', 'python3.9');
      logger.log(`🍏 macOS Python path: ${pythonExecutable}`);
    } else if (process.platform === 'win32') {
      // For Windows
      const appDir = path.dirname(app.getAppPath()); // Go up to resources
      pythonExecutable = path.join(appDir, 'venv', 'Scripts', 'python.exe');
      logger.log(`🪟 Windows Python path: ${pythonExecutable}`);
    } else {
      // For Linux
      const appDir = path.dirname(app.getAppPath()); // Go up to resources
      pythonExecutable = path.join(appDir, 'venv', 'bin', 'python3');
      logger.log(`🐧 Linux Python path: ${pythonExecutable}`);
    }

    logger.log(`✅ Using Python executable: ${pythonExecutable}`);
    return pythonExecutable;
  }

  private async ensureOutputDirExists() {
    try {
      await fs.access(this.outputDir);
      logger.log(`📁 Output directory exists: ${this.outputDir}`);
    } catch (error) {
      logger.log(`📁 Creating output directory: ${this.outputDir}`);
      await fs.mkdir(this.outputDir, { recursive: true });
      logger.log(`✅ Output directory created successfully`);
    }
  }

  /**
   * Generate metadata for multiple videos concurrently using worker threads
   * that call a Python script with OpenCV
   */
  async generateBatch(videos: any[]): Promise<any[]> {
    return new Promise((resolve) => {
      logger.log(`🎬 Processing ${videos.length} videos for metadata generation`);
      logger.log(`⚙️ Configuration:
        - Python path: ${this.pythonPath}
        - Output path: ${this.outputDir}
        - Scripts path: ${this.pythonScriptsDir}
      `);
      
      // Create a worker for metadata generation
      const worker = new Worker(`
        
        const { parentPort, workerData } = require('worker_threads');
        const path = require('path');
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
                    
        parentPort.postMessage({ 
          type: 'log', 
          message: '🧵 Worker thread initialized'
        });
        
        async function getVideoInfo(video, pythonScriptsDir, pythonPath) {
          try {
            parentPort.postMessage({ 
              type: 'log', 
              message: \`🔍 Processing video: \${path.basename(video.path)}\`
            });
            
            const pythonScript = path.join(pythonScriptsDir, 'extract_video_info.py');
            parentPort.postMessage({ 
              type: 'log', 
              message: \`📜 Python script path: \${pythonScript}\`
            });
            
            const command = \`\${pythonPath} "\${pythonScript}" -i "\${video.path}"\`;
            parentPort.postMessage({ 
              type: 'log', 
              message: \`⚡ Executing command: \${command}\`
            });
            
            const { stdout, stderr } = await execAsync(command);
            
            if (stderr) {
              parentPort.postMessage({ 
                type: 'log', 
                message: \`⚠️ Python stderr: \${stderr}\`
              });
            }
            
            // Parse the JSON output from the Python script
            const result = JSON.parse(stdout);
            
            if (result.error) {
              parentPort.postMessage({ 
                type: 'log', 
                message: \`❌ Python error: \${result.error}\`
              });
              throw new Error(result.error);
            }
            
            parentPort.postMessage({ 
              type: 'log', 
              message: \`✅ Successfully extracted metadata for \${path.basename(video.path)}\`
            });
            
            return result;
          } catch (error) {
            parentPort.postMessage({ 
              type: 'log', 
              message: \`❌ Error processing \${path.basename(video.path)}: \${error.message}\`
            });
            throw error;
          }
        }
        
        async function processBatch() {
          const { videos, pythonScriptsDir, pythonPath } = workerData;
          const results = [];
          
          parentPort.postMessage({ 
            type: 'log', 
            message: \`📊 Starting batch processing of \${videos.length} videos\`
          });
          
          for (const video of videos) {
            parentPort.postMessage({ 
              type: 'log', 
              message: \`🎥 Processing video: \${video.path}\`
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
              parentPort.postMessage({ 
                type: 'progress', 
                video: processedVideo 
              });
              
              parentPort.postMessage({ 
                type: 'log', 
                message: \`✅ Completed video: \${path.basename(video.path)} - \${videoInfo.width}x\${videoInfo.height}, \${videoInfo.frame_count} frames at \${videoInfo.fps} FPS\`
              });
            } catch (error) {
              parentPort.postMessage({ 
                type: 'log', 
                message: \`❌ Failed to process video: \${path.basename(video.path)} - \${error.message}\`
              });
              
              parentPort.postMessage({ 
                type: 'error', 
                videoId: video.id || path.basename(video.path), 
                error: error.message 
              });
            }
          }
          
          parentPort.postMessage({ 
            type: 'log', 
            message: \`🏁 Batch processing complete. Processed \${results.length} of \${videos.length} videos\`
          });
          
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
      let processedCount = 0;

      worker.on('message', (message) => {
        if (message.type === "log") {
          logger.log(message.message);
        } else if (message.type === 'progress') {
          processedCount++;
          results.push(message.video);
          logger.log(`📊 Progress: ${processedCount}/${videos.length} videos processed (${Math.round(processedCount/videos.length*100)}%)`);
        } else if (message.type === 'complete') {
          logger.log(`✅ Metadata generation complete - ${results.length} videos processed successfully`);
          resolve(results);
        }
      });

      worker.on('error', (err) => {
        logger.log(`❌ Worker error: ${err.message}`);
        logger.log(`⚠️ Resolving with partial results (${results.length} videos)`);
        resolve(results);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          logger.log(`⚠️ Worker stopped with exit code ${code}`);
        } else {
          logger.log(`👋 Worker thread exited cleanly`);
        }
        resolve(results);
      });
    });
  }
}