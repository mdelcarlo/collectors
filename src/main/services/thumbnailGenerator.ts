import path from 'path';
import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { app } from 'electron';
import { Worker } from 'worker_threads';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);

export class ThumbnailGenerator {
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

  async generateBatch(videos: any[]): Promise<any[]> {
    return new Promise((resolve) => {
      const worker = new Worker(`
        const { parentPort, workerData } = require('worker_threads');
        const path = require('path');
        const fs = require('fs');
        const ffmpeg = require('fluent-ffmpeg');
        const ffmpegPath = require('@ffmpeg-installer/ffmpeg');
        
        ffmpeg.setFfmpegPath(ffmpegPath.path);
        
        async function getDuration(videoPath) {
          return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
              if (err) reject(err);
              resolve(metadata.format.duration);
            });
          });
        }

        async function generateThumbnail(video, outputDir) {
          return new Promise(async (resolve, reject) => {
            try {
              const duration = await getDuration(video.path);
              const thumbnails = [];
              const timestamps = [];
              
              // Generate one timestamp per second
              for (let i = 0; i < Math.floor(duration); i++) {
                timestamps.push(i);
              }

              console.log('Generating ' + timestamps.length + ' thumbnails for video of duration ' + duration + ' seconds');
              
              // Create a folder for this video's thumbnails
              const videoThumbDir = path.join(outputDir, video.id);
              if (!fs.existsSync(videoThumbDir)) {
                fs.mkdirSync(videoThumbDir, { recursive: true });
              }

              ffmpeg(video.path)
                .screenshots({
                  timestamps,
                  filename: '%i.jpg',
                  folder: videoThumbDir,
                  size: '320x240'
                })
                .on('end', async () => {
                  // Get all generated thumbnail files
                  const files = fs.readdirSync(videoThumbDir);
                  for (const file of files) {
                    thumbnails.push(path.join(videoThumbDir, file));
                  }
                  
                  resolve({
                    ...video,
                    thumbnails,
                    thumbnail: thumbnails[0] // Keep first thumbnail as main thumbnail for backwards compatibility
                  });
                })
                .on('error', (err) => {
                  console.error('Error generating thumbnails:', err);
                  reject(err);
                });
            } catch (error) {
              reject(error);
            }
          });
        }
        
        async function processBatch() {
          const { videos, outputDir } = workerData;
          const results = [];
          
          for (const video of videos) {
            try {
              const processedVideo = await generateThumbnail(video, outputDir);
              results.push(processedVideo);
              
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