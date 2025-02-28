import path from 'path';
import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { app } from 'electron';
import { Worker } from 'worker_threads';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);

export class MediaProcessor {
  private outputDir: string;
  private thumbnailsDir: string;
  private audioDir: string;

  constructor() {
    // Create output directories in app data directory
    this.outputDir = path.join(app.getPath('userData'), 'media');
    this.thumbnailsDir = path.join(this.outputDir, 'thumbnails');
    this.audioDir = path.join(this.outputDir, 'audio');
    this.ensureOutputDirsExist();
  }

  private async ensureOutputDirsExist() {
    try {
      await fs.access(this.outputDir);
      await fs.access(this.thumbnailsDir);
      await fs.access(this.audioDir);
    } catch (error) {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(this.thumbnailsDir, { recursive: true });
      await fs.mkdir(this.audioDir, { recursive: true });
    }
  }

  /**
   * Process videos to extract audio and generate thumbnails concurrently using worker threads
   */
  async processBatch(videos: any[]): Promise<any[]> {
    return new Promise((resolve) => {
      // Create a worker for media processing
      const worker = new Worker(`
        const { parentPort, workerData } = require('worker_threads');
        const path = require('path');
        const fs = require('fs');
        const ffmpeg = require('fluent-ffmpeg');
        const ffmpegPath = require('@ffmpeg-installer/ffmpeg');
        
        ffmpeg.setFfmpegPath(ffmpegPath.path);
        
        async function extractAudio(video, audioDir) {
          return new Promise((resolve, reject) => {
            const outputPath = path.join(audioDir, \`\${video.id}-audio.mp3\`);
            
            ffmpeg(video.path)
              .noVideo()
              .audioCodec('libmp3lame')
              .audioBitrate('128k')
              .output(outputPath)
              .on('end', () => {
                resolve(outputPath);
              })
              .on('error', (err) => {
                console.error('Error extracting audio:', err);
                reject(err);
              })
              .run();
          });
        }
        
        async function generateThumbnails(video, thumbnailsDir) {
          return new Promise((resolve, reject) => {
            const videoId = video.id;
            const thumbnailBaseName = path.join(thumbnailsDir, \`\${videoId}-thumb\`);
            const thumbnails = [];
            
            // Get video duration first
            ffmpeg.ffprobe(video.path, (err, metadata) => {
              if (err) {
                return reject(err);
              }
              
              // Get the duration in seconds (rounded up)
              const duration = Math.ceil(metadata.format.duration);
              let thumbnailsCompleted = 0;
              
              // Create a thumbnail every second
              ffmpeg(video.path)
                .on('filenames', (filenames) => {
                  // Store thumbnail paths
                  thumbnails.push(...filenames.map(filename => path.join(thumbnailsDir, filename)));
                })
                .on('end', () => {
                  resolve(thumbnails);
                })
                .on('error', (err) => {
                  console.error('Error generating thumbnails:', err);
                  reject(err);
                })
                .screenshots({
                  count: duration,
                  folder: thumbnailsDir,
                  filename: \`\${videoId}-thumb-%i.png\`,
                  size: '320x?'
                });
            });
          });
        }
        
        async function processVideo(video, audioDir, thumbnailsDir) {
          try {
            const startTime = Date.now();
            
            // Run audio extraction and thumbnail generation in parallel
            const [audioPath, thumbnailPaths] = await Promise.all([
              extractAudio(video, audioDir),
              generateThumbnails(video, thumbnailsDir)
            ]);
            
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            
            return {
              ...video,
              audio: audioPath,
              thumbnails: thumbnailPaths,
              processingTime,
              processed: true
            };
          } catch (error) {
            console.error(\`Error processing video \${video.id}:\`, error);
            throw error;
          }
        }
        
        async function processBatch() {
          const { videos, audioDir, thumbnailsDir } = workerData;
          const results = [];
          
          for (const video of videos) {
            try {
              const processedVideo = await processVideo(video, audioDir, thumbnailsDir);
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
          audioDir: this.audioDir,
          thumbnailsDir: this.thumbnailsDir
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