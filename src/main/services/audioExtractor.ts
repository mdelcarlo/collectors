import path from 'path';
import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { app } from 'electron';
import { Worker } from 'worker_threads';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);

export class AudioExtractor {
  private outputDir: string;

  constructor() {
    // Create audio folder in app data directory
    this.outputDir = path.join(app.getPath('userData'), 'audio');
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
   * Extract audio from multiple videos concurrently using worker threads
   */
  async extractBatch(videos: any[]): Promise<any[]> {
    return new Promise((resolve) => {
      // Create a worker for audio extraction
      const worker = new Worker(`
        const { parentPort, workerData } = require('worker_threads');
        const path = require('path');
        const fs = require('fs');
        const ffmpeg = require('fluent-ffmpeg');
        const ffmpegPath = require('@ffmpeg-installer/ffmpeg');
        
        ffmpeg.setFfmpegPath(ffmpegPath.path);
        
        async function extractAudio(video, outputDir) {
          return new Promise((resolve, reject) => {
            const outputPath = path.join(outputDir, \`\${video.id}-audio.mp3\`);
            const startTime = Date.now();
            
            ffmpeg(video.path)
              .noVideo()
              .audioCodec('libmp3lame')
              .audioBitrate('128k')
              .output(outputPath)
              .on('end', () => {
                const endTime = Date.now();
                const processingTime = endTime - startTime;
                console.log(\`Processed \${video.id} in \${processingTime} ms\`);
                resolve({
                  ...video,
                  audio: outputPath,
                  processingTime
                });
              })
              .on('error', (err) => {
                console.error('Error extracting audio:', err);
                reject(err);
              })
              .run();
          });
        }
        
        async function processBatch() {
          const { videos, outputDir } = workerData;
          const results = [];
          
          for (const video of videos) {
            try {
              const processedVideo = await extractAudio(video, outputDir);
              processedVideo.processed = true;
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