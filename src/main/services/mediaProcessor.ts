import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import { logger } from './loggerService';
import { Worker } from 'worker_threads';
import { AlignmentResult } from 'src/types/processors';

export class MediaProcessor {
  private outputDir: string;
  private thumbnailsDir: string;
  private audioDir: string;
  private pythonExecutablesDir: string;

  constructor() {
    // Create output directories in app data directory
    this.outputDir = path.join(app.getPath("userData"), "media");
    this.thumbnailsDir = path.join(this.outputDir, "thumbnails");
    this.audioDir = path.join(this.outputDir, "audio");

    // Get the path to the packaged Python executables
    this.pythonExecutablesDir = this.getPythonExecutablesPath();
    logger.log('🚀 MediaProcessor initializing...');
    this.ensureOutputDirsExist();
    logger.log('✅ MediaProcessor initialized successfully');
    logger.log(`📂 Python executables directory: ${this.pythonExecutablesDir}`);
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
      executablesPath = path.join(app.getAppPath().replace('app.asar', ''), 'packaged_python', 'windows');
      logger.log(`🪟 Windows executables path: ${executablesPath}`);
    } else {
      // For Linux
      executablesPath = path.join(app.getAppPath().replace('app.asar', ''), 'packaged_python', 'linux');
      logger.log(`🐧 Linux executables path: ${executablesPath}`);
    }

    logger.log(`✅ Using executables path: ${executablesPath}`);
    return executablesPath;
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
   * that call the packaged Python executables
   */
  async processBatch(videos: any[], onEvent: (type: string, data: any) => void): Promise<void> {
    logger.log(`🎬 Starting batch processing of ${videos.length} videos`);
    logger.log(`⚙️ Configuration:
      - Output directory: ${this.outputDir}
      - Thumbnails directory: ${this.thumbnailsDir}
      - Audio directory: ${this.audioDir}
      - Python executables directory: ${this.pythonExecutablesDir}
    `);

    return new Promise(resolve => {
      // Create a worker for media processing
      const worker = new Worker(
        `
        const fsAsync = require('fs/promises')
        const { parentPort, workerData } = require('worker_threads');
        const path = require('path');
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
        const fs = require('fs');

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

        async function processVideo(video, audioDir, thumbnailsDir, pythonExecutablesDir) {
          try {
            const startTime = Date.now();
            parentPort.postMessage({ 
              type: 'log', 
              message: \`🎥 Processing video: \${path.basename(video.path)}\` 
            });

            const outputPath = path.join(audioDir);
            
            const outputFps = 2;
            const outputWidth = 640;
            const outputExtension = ".mp4";

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
              // Get the path to the create_sample_video executable
              let executableName = 'create_sample_video';
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
                ? \`"\${executablePath}" -i "\${video.path}" -o "\${outputPath}" -f \${outputFps} -w \${outputWidth} -p auto-ffmpeg --output-filename "\${outputFilename}"\`
                : \`\${executablePath} -i "\${video.path}" -o "\${outputPath}" -f \${outputFps} -w \${outputWidth} -p auto-ffmpeg --output-filename "\${outputFilename}"\`;

              parentPort.postMessage({ 
                type: 'log', 
                message: \`⚡ Executing command: \${command}\`
              });
              
              const { stdout, stderr } = await execAsync(command);
              
              if (stdout) {
                parentPort.postMessage({ 
                  type: 'log', 
                  message: \`📝 Executable stdout: \${stdout}\`
                });
              }
              
              if (stderr) {
                parentPort.postMessage({ 
                  type: 'log', 
                  message: \`⚠️ Executable stderr: \${stderr}\`
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


        async function alignVideos() {
          async function createRandomTempFile() {
            const os = require('os');
            const tempDir = path.join(os.tmpdir(), 'cb-app-temp');
            
            await fsAsync.mkdir(tempDir, { recursive: true });

            const randomName = Math.random().toString(36).substring(2);
            
            const filePath = path.join(tempDir, randomName);
            
            const fileHandle = await fsAsync.open(filePath, 'w');
            await fileHandle.close();
            
            return filePath;
          }


          async function readJsonFile(filePath) {
            try {
              const data = await fsAsync.readFile(filePath, "utf-8");
              return JSON.parse(data);
            } catch (error) {
              console.error("Error reading JSON file:", error);
            }
          }

          const { videos, pythonExecutablesDir } = workerData;
          const filenames = videos.map(video => video.path).slice(0, 2).join(' ');

          console.log('Aligning videos...', filenames);

          let results
          const tempFile = await createRandomTempFile();
          
          try {
            // Get the path to the align_videos executable
              let executableName = 'align_videos';
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
                ? \`"\${executablePath}" -f "\${filenames}" --results-filepath "\${tempFile}"\`
                : \`\${executablePath} -f "\${filenames}" --results-filepath "\${tempFile}"\`;

            const { stdout, stderr } = await execAsync(command);

            if (stderr) {
              console.error('Python stderr:', stderr);
            }
            results = await readJsonFile(tempFile);

            parentPort.postMessage({ type: 'align-video-pair', results });

          } catch (err) { 
            console.error('error aligning videos', err)
            throw err;
          } finally {
            await fsAsync.rm(tempFile, { recursive: true, force: true });
          }
          return results
        }

        async function processBatch() {
          const { videos, audioDir, thumbnailsDir, pythonExecutablesDir } = workerData;
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
              
              const processedVideo = await processVideo(video, audioDir, thumbnailsDir, pythonExecutablesDir);
              results.push(processedVideo);
              
              parentPort.postMessage({ 
                type: 'log', 
                message: \`✅ Completed video: \${path.basename(video.path)}\`
              });
              
              parentPort.postMessage({ type: 'progress', video: processedVideo });
              parentPort.postMessage({ type: 'create-sample-video', video: processedVideo });
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

        Promise.all([processBatch(), alignVideos()])
          .then(_=> {
            parentPort.postMessage({ type: 'complete' })
          });

      `,
        {
          eval: true,
          workerData: {
            videos,
            audioDir: this.audioDir,
            thumbnailsDir: this.thumbnailsDir,
            pythonExecutablesDir: this.pythonExecutablesDir,
          },
        },
      );

      let processedCount = 0;

      worker.on('message', message => {
        switch (message.type) {
          case 'log': {
            logger.log(message.message);
            break;
          }
          case 'align-video-pair': {
            onEvent('align-video-pair', message.results as AlignmentResult);
            break;
          }
          case 'create-sample-video': {
            processedCount++;
            logger.log(
              `📊 Progress: ${processedCount}/${videos.length} videos processed (${Math.round(
                (processedCount / videos.length) * 100,
              )}%)`,
            );
            message.video.status = 'processed';
            onEvent('update-video', message.video);
            break;
          }
          case 'error': {
            logger.log(`❌ Error while processing video: ${path.basename(message.video.path)}`);
            const video = message.video;
            video.error = message.error || 'Unknown error';
            video.status = 'idle';
            video.startProcessingTime = undefined;
            onEvent('process-error', video);
            break;
          }
          case 'complete': {
            logger.log(
              `✅ Media processing complete - ${processedCount} videos processed successfully`,
            );
            resolve();
            break;
          }
          case 'init': {
            logger.log(
              `🔄 Initializing processing for video: ${path.basename(message.video.path)}`,
            );
            onEvent('update-video', message.video);
            break;
          }
          default: {
            onEvent(message.type, message.results);
          }
        }
      });

      worker.on('error', err => {
        logger.log(`❌ Worker error: ${err.message}`);
        logger.log(`⚠️ Resolving with partial results (${processedCount} videos)`);
        resolve();
        console.error('Worker error:', err);
        resolve();
      });

      worker.on('exit', code => {
        if (code !== 0) {
          logger.log(`⚠️ Worker stopped with exit code ${code}`);
        } else {
          logger.log(`👋 Worker thread exited cleanly`);
        }
        resolve();
      });
    });
  }
}