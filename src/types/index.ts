export type VideoStatus = 'idle' | 'processing' | 'processed' | 'error';

export interface Video {
  id: string;
  path: string;
  name: string;
  createdAt: string | Date;
  paired?: boolean;
  pairId?: string | null;
  size: number;
  fps?: number;
  duration?: number;
  frameCount?: number;
  width?: number;
  height?: number;
  checksum?: string;  
  processingTime?: number;
  startProcessingTime?: number;
  status: VideoStatus;
  error?: string;
  preview?: string
}

export interface Pair {
  id: string;
  video1: Video;
  video2: Video;
  createdAt: Date;
}

export interface Audio {
  id: string;
  audio: string;
  name: string;
  createdAt: Date;
  size: number;
}