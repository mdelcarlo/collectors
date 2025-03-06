export type VideoStatus = 'idle' | 'processing' | 'processed' | 'error';

export interface Video {
  id: string;
  path: string;
  name: string;
  createdAt: string | Date;
  thumbnail?: string | null;
  thumbnails?: string[]; // Array of paths to thumbnails (one per second)
  audio?: string; // Path to extracted audio
  paired?: boolean;
  pairId?: string | null;
  size: number;
  fps?: number;
  processingTime?: number;
  processed?: boolean;
  status: VideoStatus;
  error?: string; // To store error messages if status is 'error'
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