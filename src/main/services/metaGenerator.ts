import path from 'path';
import fs from 'fs/promises';
import { app, BrowserWindow } from 'electron';
import { Worker } from 'worker_threads';
import { logger } from './loggerService';

export class MetaGenerator {
  private outputDir: string;
  private pythonExecutablesDir: string;

  constructor(mainWindow: BrowserWindow) {
    // Create thumbnails folder in app data directory
    this.outputDir = path.join(app.getPath('userData'), 'thumbnails');
    
    // Get the path to the packaged Python executables
    this.pythonExecutablesDir = this.getPythonExecutablesPath();

    // Set the main window in the logger singleton
    logger.setMainWindow(mainWindow);

    logger.log('🚀 MetaGenerator initialized');
    logger.log(`📂 Python executables directory: ${this.pythonExecutablesDir}`);

    this.ensureOutputDirExists();
  }

  /**
   * Gets the path to the packaged Python executables based on the platform
   */
  private getPythonExecutablesPath(): string {
    const isDev = !app.isPackaged;
    logger.log(`🔧 Environment: ${isDev ? 'development' : 'production'}`);

    if (isDev) {
      // In development, use the local packaged executables
      const devExecutablesPath = path.join(app.getAppPath(), 'packaged_python', process.platform);
      logger.log(`🔍 Development executables path: ${devExecutablesPath}`);
      return devExecutablesPath;
    }

    // In production, the executables are in the resources directory
    let executablesPath = '';
    
    if (process.platform === 'darwin') {
      // For macOS, the path is inside the .app bundle
      executablesPath = path.join(app.getAppPath().replace('app.asar', ''), 'packaged_python', 'darwin');
      logger.log(`🍏 macOS executables path: ${executablesPath}`);
    } else if (process.platform === 'win32') {
      // For Windows
      executablesPath = path.join(app.getAppPath().replace('app.asar', ''), 'packaged_python', 'win32');
      logger.log(`🪟 Windows executables path: ${executablesPath}`);
    } else {
      // For Linux
      executablesPath = path.join(app.getAppPath().replace('app.asar', ''), 'packaged_python', 'linux');
      logger.log(`🐧 Linux executables path: ${executablesPath}`);
    }

    logger.log(`✅ Using executables path: ${executablesPath}`);
    return executablesPath;
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
   * that call packaged Python executables
   */
  async generateBatch(videos: any[]): Promise<any[]> {
    return new Promise((resolve) => {
      logger.log(`🎬 Processing ${videos.length} videos for metadata generation`);
      logger.log(`⚙️ Configuration:
        - Output path: ${this.outputDir}
        - Python executables path: ${this.pythonExecutablesDir}
      `);
      
      // Create a worker for metadata generation
      const worker = new Worker(`
        
        const { parentPort, workerData } = require('worker_threads');
        const path = require('path');
        const { exec } = require('child_process');
        const util = require('util');
        const fs = require('fs');
        const execAsync = util.promisify(exec);
                    
        parentPort.postMessage({ 
          type: 'log', 
          message: '🧵 Worker thread initialized'
        });
        
        async function getVideoInfo(video, pythonExecutablesDir) {
          try {
            parentPort.postMessage({ 
              type: 'log', 
              message: \`🔍 Processing video: \${path.basename(video.path)}\`
            });
            
            // Get the path to the extract_video_info executable
            let executableName = 'extract_video_info';
            if (process.platform === 'win32') {
              executableName += '.exe';
            }
            
            const executablePath = path.join(pythonExecutablesDir, executableName);
            
            // Check if the executable exists
            if (!fs.existsSync(executablePath)) {
              throw new Error(\`Executable not found at: \${executablePath}\`);
            }
            
            parentPort.postMessage({ 
              type: 'log', 
              message: \`📜 Using executable: \${executablePath}\`
            });
            
            // Build the command based on platform
            const command = process.platform === 'win32' 
              ? \`"\${executablePath}" -i "\${video.path}"\`
              : \`"\${executablePath}" -i '\${video.path}'\`;
            
            parentPort.postMessage({ 
              type: 'log', 
              message: \`⚡ Executing command: \${command}\`
            });
            
            const { stdout, stderr } = await execAsync(command);
            
            if (stderr) {
              parentPort.postMessage({ 
                type: 'log', 
                message: \`⚠️ Executable stderr: \${stderr}\`
              });
            }
            
            // Parse the JSON output from the executable
            const result = JSON.parse(stdout);
            
            if (result.error) {
              parentPort.postMessage({ 
                type: 'log', 
                message: \`❌ Executable error: \${result.error}\`
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
          const { videos, pythonExecutablesDir } = workerData;
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
              const videoInfo = await getVideoInfo(video, pythonExecutablesDir);
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
          pythonExecutablesDir: this.pythonExecutablesDir,
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