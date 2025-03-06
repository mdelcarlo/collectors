import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import { Worker } from 'worker_threads';

export class MetaGenerator {
  private outputDir: string;
  private pythonScriptsDir: string;

  constructor() {
    // Create thumbnails folder in app data directory
    this.outputDir = path.join(app.getPath('userData'), 'thumbnails');
    this.pythonScriptsDir = path.join(app.getAppPath(), 'python');
    this.ensureOutputDirExists();
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
      // Create a worker for metadata generation
      const worker = new Worker(`
        const { parentPort, workerData } = require('worker_threads');
        const path = require('path');
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
        
        async function getVideoFps(video, pythonScriptsDir) {
          try {
            const pythonScript = path.join(pythonScriptsDir, 'extract_fps.py');
            const command = \`python "\${pythonScript}" -i "\${video.path}"\`;
            
            const { stdout, stderr } = await execAsync(command);
            
            if (stderr) {
              console.error('Python stderr:', stderr);
            }
            
            // Parse the JSON output from the Python script
            const result = JSON.parse(stdout);
            
            if (result.error) {
              throw new Error(result.error);
            }
            
            return result.fps;
          } catch (error) {
            console.error('Error getting video FPS:', error);
            throw error;
          }
        }
        
        async function processBatch() {
          const { videos, pythonScriptsDir } = workerData;
          const results = [];
          
          for (const video of videos) {
            try {
              const fps = await getVideoFps(video, pythonScriptsDir);
              const processedVideo = {
                ...video,
                fps
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
          pythonScriptsDir: this.pythonScriptsDir
        }
      });

      const results: any[] = [];

      worker.on('message', (message) => {
        if (message.type === 'progress') {
          results.push(message.video);
        } else if (message.type === 'complete') {
          resolve(results);
        }
      });

      worker.on('error', (err) => {
        console.error('Worker error:', err);
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