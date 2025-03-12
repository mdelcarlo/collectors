import path from "path";
import fs from "fs/promises";
import { app } from "electron";
import { Worker } from "worker_threads";
import { Video } from "src/types";
import { platform } from "os";
import { logger } from "./loggerService";

export class MediaProcessor {
  private outputDir: string;
  private thumbnailsDir: string;
  private audioDir: string;
  private pythonScriptsDir: string;
  private pythonPath: string;

  constructor() {
    // Create output directories in app data directory
    this.outputDir = path.join(app.getPath("userData"), "media");
    this.thumbnailsDir = path.join(this.outputDir, "thumbnails");
    this.audioDir = path.join(this.outputDir, "audio");
    this.pythonScriptsDir = path.join(app.getAppPath().replace('app.asar', ''), 'python');

    logger.log('🚀 MediaProcessor initializing...');

    // Determine the Python path based on the platform and whether we're in development or production
    this.pythonPath = this.getPythonPath();

    this.ensureOutputDirsExist();
    logger.log('✅ MediaProcessor initialized successfully');
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

    // Get the application directory based on platform
    let appDir: string;
    
    if (process.platform === 'darwin') {
      // For macOS, the path is inside the .app bundle
      if (isDev) {
        // In dev mode, go up two levels from app.getAppPath()
        appDir = path.dirname(path.dirname(app.getAppPath()));
      } else {
        // In production, get the executable path and navigate to Contents
        // Example: /Applications/YourApp.app/Contents/MacOS/YourApp -> /Applications/YourApp.app/Contents
        appDir = path.dirname(app.getPath('exe')).replace(/\/MacOS$/, '');
      }
      pythonExecutable = path.join(appDir, 'Resources', 'venv', 'bin', 'python3.9');
      logger.log(`🍏 macOS Python path: ${pythonExecutable}`);
    } else if (process.platform === 'win32') {
      // For Windows, navigate from executable to resources directory
      appDir = isDev 
        ? path.dirname(app.getAppPath())  // Dev mode
        : path.join(path.dirname(app.getPath('exe')), 'resources');  // Production
      pythonExecutable = path.join(appDir, 'venv', 'Scripts', 'python.exe');
      logger.log(`🪟 Windows Python path: ${pythonExecutable}`);
    } else {
      // For Linux
      appDir = isDev
        ? path.dirname(app.getAppPath())  // Dev mode
        : path.join(path.dirname(app.getPath('exe')), 'resources');  // Production
      pythonExecutable = path.join(appDir, 'venv', 'bin', 'python3');
      logger.log(`🐧 Linux Python path: ${pythonExecutable}`);
    }

    logger.log(`✅ Using Python executable: ${pythonExecutable}`);
    return pythonExecutable;
  }

  private async ensureOutputDirsExist() {
    try {
      logger.log(`🔍 Checking output directories...`);
      await fs.access(this.outputDir);
      logger.log(`📁 Main output directory exists: ${this.outputDir}`);
      
      await fs.access(this.thumbnailsDir);
      logger.log(`📸 Thumbnails directory exists: ${this.thumbnailsDir}`);
      
      await fs.access(this.audioDir);
      logger.log(`🔊 Audio directory exists: ${this.audioDir}`);
    } catch (error) {
      logger.log(`📂 Creating output directories...`);
      
      try {
        await fs.mkdir(this.outputDir, { recursive: true });
        logger.log(`✅ Created main output directory: ${this.outputDir}`);
        
        await fs.mkdir(this.thumbnailsDir, { recursive: true });
        logger.log(`✅ Created thumbnails directory: ${this.thumbnailsDir}`);
        
        await fs.mkdir(this.audioDir, { recursive: true });
        logger.log(`✅ Created audio directory: ${this.audioDir}`);
      } catch (createError) {
        logger.log(`❌ Error creating directories: ${(createError as Error).message}`);
        throw createError;
      }
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
    logger.log(`🎬 Starting batch processing of ${videos.length} videos`);
    logger.log(`⚙️ Configuration:
      - Output directory: ${this.outputDir}
      - Thumbnails directory: ${this.thumbnailsDir}
      - Audio directory: ${this.audioDir}
      - Python scripts directory: ${this.pythonScriptsDir}
      - Python path: ${this.pythonPath}
    `);

    return new Promise((resolve) => {
      // Create a worker for media processing
      const worker = new Worker(
        `
        const { parentPort, workerData } = require('worker_threads');
        const path = require('path');
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        parentPort.postMessage({ 
          type: 'log', 
          message: '🧵 Worker thread initialized for media processing'
        });

        function generateSampleVideoFilename(inputFilepath, fps, width, extension) {
          const baseName = path.basename(inputFilepath, path.extname(inputFilepath));
          
          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          
          const filename = \`$\{dateStr}-$\{fps}fps-$\{width}w-$\{baseName}\`;
          
          return encodeURI(filename + extension);
        }

        async function processVideo(video, audioDir, thumbnailsDir, pythonScriptsDir, pythonPath) {
          try {
            const startTime = Date.now();
            parentPort.postMessage({ 
              type: 'log', 
              message: \`🎥 Processing video: \${path.basename(video.path)}\` 
            });

            const outputPath = path.join(audioDir);
            
            const outputFps = 2
            const outputWidth = 640
            const outputExtension = ".mp4"

            parentPort.postMessage({ 
              type: 'log', 
              message: \`📊 Output settings: \${outputFps} FPS, \${outputWidth}px width, \${outputExtension} format\`
            });

            const outputFilename = generateSampleVideoFilename(video.path, outputFps, outputWidth, outputExtension);
            parentPort.postMessage({ 
              type: 'log', 
              message: \`📄 Output filename: \${outputFilename}\`
            });

            // Generate Sample Video
            try {
              const pythonScript = path.join(pythonScriptsDir, '/create_sample_video.py')
              parentPort.postMessage({ 
                type: 'log', 
                message: \`📜 Using Python script: \${pythonScript}\`
              });
              
              const command = process.platform === 'win32' 
                ? \`"\${pythonPath}" "\${pythonScript}" -i "\${video.path}" -o "\${outputPath}" -f \${outputFps} -w \${outputWidth} -p auto-cv2 --output-filename "\${outputFilename}"\`
                : \`\${pythonPath} "\${pythonScript}" -i '\${video.path}' -o "\${outputPath}" -f \${outputFps} -w \${outputWidth} -p auto-cv2 --output-filename "\${outputFilename}"\`;

              parentPort.postMessage({ 
                type: 'log', 
                message: \`⚡ Executing command: \${command}\`
              });
              
              const { stdout, stderr } = await execAsync(command);
              
              if (stdout) {
                parentPort.postMessage({ 
                  type: 'log', 
                  message: \`📝 Python stdout: \${stdout}\`
                });
              }
              
              if (stderr) {
                parentPort.postMessage({ 
                  type: 'log', 
                  message: \`⚠️ Python stderr: \${stderr}\`
                });
              }
              
              parentPort.postMessage({ 
                type: 'log', 
                message: \`✅ Sample video created for: \${path.basename(video.path)}\`
              });
            } catch (error) {
              parentPort.postMessage({ 
                type: 'log', 
                message: \`❌ Error creating sample video: \${error.message}\`
              });
              throw error;
            }
            
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            
            parentPort.postMessage({ 
              type: 'log', 
              message: \`⏱️ Processing completed in \${processingTime}ms for \${path.basename(video.path)}\`
            });
            
            return {
              ...video,
              preview: outputPath + "/" + decodeURI(outputFilename),
              processingTime,
              processed: true
            };
          } catch (error) {
            parentPort.postMessage({ 
              type: 'log', 
              message: \`❌ Error processing video \${video.id}: \${error.message}\`
            });
            throw error;
          }
        }

        async function processBatch() {
          const { videos, audioDir, thumbnailsDir, pythonScriptsDir, pythonPath } = workerData;
          const results = [];
          
          parentPort.postMessage({ 
            type: 'log', 
            message: \`📊 Starting batch processing of \${videos.length} videos\`
          });
          
          for (const video of videos) {
            try {
              const startTime = Date.now();
              video.startProcessingTime = startTime
              parentPort.postMessage({ type: 'init', video });
              
              parentPort.postMessage({ 
                type: 'log', 
                message: \`🎬 Started processing video: \${path.basename(video.path)}\`
              });
              
              const processedVideo = await processVideo(video, audioDir, thumbnailsDir, pythonScriptsDir, pythonPath);
              results.push(processedVideo);
              
              parentPort.postMessage({ 
                type: 'log', 
                message: \`✅ Completed video: \${path.basename(video.path)}\`
              });
              
              parentPort.postMessage({ type: 'progress', video: processedVideo });
            } catch (error) {
              parentPort.postMessage({ 
                type: 'log', 
                message: \`❌ Error processing video \${path.basename(video.path)}: \${error.message}\`
              });
              
              parentPort.postMessage({ 
                type: 'error', 
                video, 
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
      `,
        {
          eval: true,
          workerData: {
            videos,
            audioDir: this.audioDir,
            thumbnailsDir: this.thumbnailsDir,
            pythonScriptsDir: this.pythonScriptsDir,
            pythonPath: this.pythonPath,  // Pass the Python path to the worker
          },
        },
      );

      const results: any[] = [];
      let processedCount = 0;

      worker.on("message", (message) => {
        if (message.type === "log") {
          logger.log(message.message);
        } else if (message.type === "init") {
          logger.log(`🔄 Initializing processing for video: ${path.basename(message.video.path)}`);
          updateVideo(message.video);
        } else if (message.type === "error") {
          logger.log(`❌ Error while processing video: ${path.basename(message.video.path)}`);
          message.video.error = "Error while processing video";
          message.video.status = "idle";
          message.video.startProcessingTime = undefined;
          updateVideo(message.video);
        } else if (message.type === "progress") {
          processedCount++;
          results.push(message.video);
          logger.log(`📊 Progress: ${processedCount}/${videos.length} videos processed (${Math.round(processedCount/videos.length*100)}%)`);
          updateVideo(message.video);
        } else if (message.type === "complete") {
          logger.log(`✅ Media processing complete - ${results.length} videos processed successfully`);
          resolve(results);
        }
      });

      worker.on("error", (err) => {
        logger.log(`❌ Worker error: ${err.message}`);
        logger.log(`⚠️ Resolving with partial results (${results.length} videos)`);
        resolve(results);
      });

      worker.on("exit", (code) => {
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
