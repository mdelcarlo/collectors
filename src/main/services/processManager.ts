import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import Store from 'electron-store';
import { BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid'; 
import { VideoProcess } from '../../types';


export class ProcessManager extends EventEmitter {
  private processes: Map<string, VideoProcess> = new Map();
  private store: Store;
  private mainWindow?: BrowserWindow;

  constructor(store: Store) {
    super();
    this.store = store;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  /**
   * Start a new process for a video
   */
  startProcess(videoId: string, command: string, args: string[]): string {
    const processId = uuidv4();
    
    const childProcess = spawn(command, args, {
      env: { ...process.env, VIDEO_PROCESS_ID: processId }
    });

    const videoProcess: VideoProcess = {
      id: videoId,
      processId,
      startTime: Date.now(),
      status: 'processing',
      progress: {
        audio: 0,
        thumbnails: 0,
        video: 0
      }
    };

    this.processes.set(processId, videoProcess);
    
    // Update the status in the store
    this.updateVideoStatus(videoId, 'processing', processId);
    this.emit('process-started', videoProcess);

    // Setup event listeners
    childProcess.on('exit', (code) => {
      if (code === 0) {
        this.completeProcess(processId);
      } else {
        this.failProcess(processId, `Process exited with code ${code}`);
      }
    });

    childProcess.on('error', (err) => {
      this.failProcess(processId, err.message);
    });

    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Process ${processId}] ${output}`);
      
      // Look for progress updates in the output
      const progressMatch = output.match(/PROGRESS:([^:]+):([^:]+):(\d+)/);
      if (progressMatch) {
        const [, procId, stage, percentage] = progressMatch;
        this.updateProcessProgress(procId, stage, parseInt(percentage));
      }

      // Look for completion message
      if (output.includes(`COMPLETE:${processId}`)) {
        this.completeProcess(processId);
      }

      // Look for error message
      const errorMatch = output.match(/ERROR:([^:]+):(.+)/);
      if (errorMatch) {
        const [, procId, errorMsg] = errorMatch;
        this.failProcess(procId, errorMsg.trim());
      }
    });

    childProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error(`[Process ${processId}] Error: ${error}`);
      
      // Check for error message format
      const errorMatch = error.match(/ERROR:([^:]+):(.+)/);
      if (errorMatch) {
        const [, procId, errorMsg] = errorMatch;
        this.failProcess(procId, errorMsg.trim());
      }
    });

    return processId;
  }

  /**
   * Update progress for a specific process
   */
  updateProcessProgress(processId: string, stage: string, percentage: number) {
    const process = this.processes.get(processId);
    if (!process || !process.progress) return;
    
    switch (stage) {
      case 'audio':
        process.progress.audio = percentage;
        break;
      case 'thumbnails':
        process.progress.thumbnails = percentage;
        break;
      case 'video':
        process.progress.video = percentage;
        break;
    }
    
    // Notify renderer about progress update
    if (this.mainWindow) {
      this.mainWindow.webContents.send('process-progress', {
        processId,
        progress: process.progress
      });
    }
  }

  /**
   * Mark a process as completed
   */
  completeProcess(processId: string) {
    const process = this.processes.get(processId);
    if (!process) return;

    this.updateVideoStatus(process.id, 'processed');
    this.emit('process-completed', process);
    this.processes.delete(processId);

    this.notifyStatusChange();
  }

  /**
   * Mark a process as failed
   */
  failProcess(processId: string, error: string) {
    const process = this.processes.get(processId);
    if (!process) return;

    process.status = 'failed';
    process.error = error;
    
    this.updateVideoStatus(process.id, 'failed', undefined, error);
    this.emit('process-failed', process);
    this.processes.delete(processId);

    this.notifyStatusChange();
  }

  /**
   * Kill a running process
   */
  killProcess(processId: string) {
    const process = this.processes.get(processId);
    if (!process) return false;

    try {
      // In case there's a child process reference
      if ((process as any).childProcess && typeof (process as any).childProcess.kill === 'function') {
        (process as any).childProcess.kill();
      }
      
      this.updateVideoStatus(process.id, 'idle');
      this.processes.delete(processId);
      this.notifyStatusChange();
      return true;
    } catch (error) {
      console.error('Error killing process:', error);
      return false;
    }
  }

  /**
   * Get all running processes
   */
  getAllProcesses(): VideoProcess[] {
    return Array.from(this.processes.values());
  }

  /**
   * Get a specific process by ID
   */
  getProcess(processId: string): VideoProcess | undefined {
    return this.processes.get(processId);
  }

  /**
   * Get a process by video ID
   */
  getProcessByVideoId(videoId: string): VideoProcess | undefined {
    return Array.from(this.processes.values()).find(p => p.id === videoId);
  }

  /**
   * Reset all processes on app start/close
   */
  resetAllProcesses() {
    // Kill any running processes - we need to get this from a property that we added
    for (const process of this.processes.values()) {
      if ((process as any).childProcess) {
        try {
          (process as any).childProcess.kill();
        } catch (error) {
          console.error(`Error killing process ${process.processId}:`, error);
        }
      }
    }

    this.processes.clear();

    // Reset all processing videos in the store
    const pairs = this.store.get('pairs') as any[] || [];
    let updated = false;

    const updatedPairs = pairs.map(pair => {
      const video1Updated = pair.video1.status === 'processing';
      const video2Updated = pair.video2.status === 'processing';
      
      if (video1Updated || video2Updated) {
        updated = true;
      }

      return {
        ...pair,
        video1: {
          ...pair.video1,
          status: pair.video1.status === 'processing' ? 'idle' : pair.video1.status,
          processId: undefined
        },
        video2: {
          ...pair.video2,
          status: pair.video2.status === 'processing' ? 'idle' : pair.video2.status,
          processId: undefined
        }
      };
    });

    if (updated) {
      this.store.set('pairs', updatedPairs);
      this.notifyStatusChange();
    }
  }

  /**
   * Update the status of a video in the store
   */
  private updateVideoStatus(
    videoId: string, 
    status: 'idle' | 'processing' | 'processed' | 'failed',
    processId?: string,
    error?: string
  ) {
    const pairs = this.store.get('pairs') as any[] || [];
    const unpaired = this.store.get('unpairedVideos') as any[] || [];
    let updated = false;

    // Update in pairs
    const updatedPairs = pairs.map(pair => {
      let video1Updated = false;
      let video2Updated = false;
      
      if (pair.video1.id === videoId) {
        video1Updated = true;
        pair.video1 = {
          ...pair.video1,
          status,
          processId,
          error,
          ...(status === 'processing' ? { startProcessingTime: Date.now() } : {}),
          ...(status === 'processed' ? { 
            endProcessingTime: Date.now(),
            processingTime: Date.now() - (pair.video1.startProcessingTime || Date.now())
          } : {})
        };
      }

      if (pair.video2.id === videoId) {
        video2Updated = true;
        pair.video2 = {
          ...pair.video2,
          status,
          processId,
          error,
          ...(status === 'processing' ? { startProcessingTime: Date.now() } : {}),
          ...(status === 'processed' ? { 
            endProcessingTime: Date.now(),
            processingTime: Date.now() - (pair.video2.startProcessingTime || Date.now())
          } : {})
        };
      }

      if (video1Updated || video2Updated) {
        updated = true;
      }

      return pair;
    });

    // Update in unpaired
    const updatedUnpaired = unpaired.map(video => {
      if (video.id === videoId) {
        updated = true;
        return {
          ...video,
          status,
          processId,
          error,
          ...(status === 'processing' ? { startProcessingTime: Date.now() } : {}),
          ...(status === 'processed' ? { 
            endProcessingTime: Date.now(),
            processingTime: Date.now() - (video.startProcessingTime || Date.now())
          } : {})
        };
      }
      return video;
    });

    if (updated) {
      this.store.set('pairs', updatedPairs);
      this.store.set('unpairedVideos', updatedUnpaired);
    }
  }

  /**
   * Notify the UI about status changes
   */
  private notifyStatusChange() {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('videos-updated', {
        pairs: this.store.get('pairs'),
        unpairedVideos: this.store.get('unpairedVideos')
      });
    }
  }
}