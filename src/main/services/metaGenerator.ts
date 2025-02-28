import path from 'path';
import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { app } from 'electron';
import { Worker } from 'worker_threads';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);

export class MetaGenerator {
  private outputDir: string;

  constructor() {
    // Create thumbnails folder in app data directory
    this.outputDir = path.join(app.getPath('userData'), 'thumbnails');
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
   */
  async generateBatch(videos: any[]): Promise<any[]> {
    return new Promise((resolve) => {
      // Create a worker for metadata generation
      const worker = new Worker(`
        const { parentPort, workerData } = require('worker_threads');
        const path = require('path');
        const fs = require('fs');
        const ffmpeg = require('fluent-ffmpeg');
        const ffmpegPath = require('@ffmpeg-installer/ffmpeg');
        
        ffmpeg.setFfmpegPath(ffmpegPath.path);
        
        async function generateThumbnail(video, outputDir) {
          return new Promise((resolve, reject) => {
            const outputPath = path.join(outputDir, \`\${video.id}-thumbnail.jpg\`);
            
            ffmpeg(video.path)
              .screenshots({
                timestamps: ['5%'],
                filename: \`\${video.id}-thumbnail.jpg\`,
                folder: outputDir,
                size: '320x240'
              })
              .on('end', () => {
                resolve(outputPath);
              })
              .on('error', (err) => {
                console.error('Error generating thumbnail:', err);
                reject(err);
              });
          });
        }
        
        async function getVideoFps(video) {
          return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(video.path, (err, metadata) => {
              if (err) {
                console.error('Error getting video FPS:', err);
                reject(err);
              } else {
                const fps = metadata.streams[0].r_frame_rate;
                resolve(fps);
              }
            });
          });
        }
        
        async function processBatch() {
          const { videos, outputDir } = workerData;
          const results = [];
          
          for (const video of videos) {
            try {
              const fps = await getVideoFps(video);
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
                videoId: video.id, 
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
          outputDir: this.outputDir
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