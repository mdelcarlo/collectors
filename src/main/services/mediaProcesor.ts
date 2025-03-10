import path from "path";
import fs from "fs/promises";
import { app } from "electron";
import { Worker } from "worker_threads";
import { Video } from "src/types";

export class MediaProcessor {
  private outputDir: string;
  private thumbnailsDir: string;
  private audioDir: string;
  private pythonScriptsDir: string;

  constructor() {
    // Create output directories in app data directory
    this.outputDir = path.join(app.getPath("userData"), "media");
    this.thumbnailsDir = path.join(this.outputDir, "thumbnails");
    this.audioDir = path.join(this.outputDir, "audio");
    this.pythonScriptsDir = path.join(app.getAppPath(), "python");
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
   * that call Python scripts with MoviePy and OpenCV
   */
  async processBatch(
    videos: any[],
    updateVideo: (video: Video) => void,
  ): Promise<any[]> {
    return new Promise((resolve) => {
      // Create a worker for media processing
      const worker = new Worker(
        `
        const { parentPort, workerData } = require('worker_threads');
        const path = require('path');
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        function generateSampleVideoFilename(inputFilepath, fps, width, extension) {
          const baseName = path.basename(inputFilepath, path.extname(inputFilepath));
          
          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          
          const filename = \`$\{dateStr}-$\{fps}fps-$\{width}w-$\{baseName}\`;
          
          return encodeURI(filename + extension);
        }

        async function processVideo(video, audioDir, thumbnailsDir, pythonScriptsDir) {
          try {
            const startTime = Date.now();

            const outputPath = path.join(audioDir);
            
            const outputFps = 2
            const outputWidth = 640
            const outputExtension = ".mp4"

            const outputFilename = generateSampleVideoFilename(video.path, outputFps, outputWidth, outputExtension);

            try {
              const pythonScript = path.join(pythonScriptsDir, 'create_sample_video.py');
              const command = \`python "\${pythonScript}" -i '\${video.path}' -o "\${outputPath}" -f \${outputFps} -w \${outputWidth} -p auto-cv2 --output-filename "\${outputFilename}"\`;
              console.log('Creating sample video...');
              const { stdout, stderr } = await execAsync(command);
              
              if (stderr) {
                  console.error('Python stderr:', stderr);
              }
              
              console.log('Sample video created:', stdout);
            } catch (error) {
              console.error('Error creating sample video:', error);
              throw error;
            }

            
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            
            return {
              ...video,
              preview: outputPath + "/" + decodeURI(outputFilename),
              processingTime,
              processed: true
            };
          } catch (error) {
            console.error(\`Error processing video \${video.id}:\`, error);
            throw error;
          }
        }

        async function processBatch() {
          const { videos, audioDir, thumbnailsDir, pythonScriptsDir } = workerData;
          const results = [];
          
          for (const video of videos) {
            try {
              const startTime = Date.now();
              video.startProcessingTime = startTime
              parentPort.postMessage({ type: 'init', video });
              const processedVideo = await processVideo(video, audioDir, thumbnailsDir, pythonScriptsDir);
              results.push(processedVideo);
              parentPort.postMessage({ type: 'progress', video: processedVideo });
            } catch (error) {
              console.error('Error processing video:', error);
              parentPort.postMessage({ 
                type: 'error', 
                video, 
                error: error.message 
              });
            }
          }
          
          parentPort.postMessage({ type: 'complete', results });
        }
        
        processBatch();
      `,
        {
          eval: true,
          workerData: {
            videos,
            audioDir: this.audioDir,
            thumbnailsDir: this.thumbnailsDir,
            pythonScriptsDir: this.pythonScriptsDir,
          },
        },
      );

      const results: any[] = [];

      worker.on("message", (message) => {
        if (message.type === "init") {
          updateVideo(message.video);
        } else if (message.type === "error") {
          message.video.error = "Error while processing video";
          message.video.status = "idle";
          message.video.startProcessingTime = undefined;
          updateVideo(message.video);
        } else if (message.type === "progress") {
          results.push(message.video);
        } else if (message.type === "complete") {
          resolve(results);
        }
      });

      worker.on("error", (err) => {
        console.error("Worker error:", err);
        resolve(results);
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          console.error(`Worker stopped with exit code ${code}`);
        }
        resolve(results);
      });
    });
  }
}
