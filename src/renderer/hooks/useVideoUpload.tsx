import { useMutation } from '@tanstack/react-query';
import { fetchApi } from '../utils/fetchApi';

// Define types for the upload payload
interface PairProcessingResult {
  alignment: {
    confidence: number;
    elapsedTimeSeconds: number;
    overlap: number;
  };
}

interface VideoProcessingResult {
  offset: number;
}
interface Video {
  metadata: {
    name: string;
    [key: string]: any;
  };
  checksum: string;
  content: string;
  processingResults: VideoProcessingResult;
}

interface UploadPayload {
  form: Record<string, any>;
  checkList: string[];
  videos: Video[];
  processingResults: PairProcessingResult;
}

interface UseVideoUploadOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

const readFile = async (filePath: string) => {

  const base64Data = await window.electronAPI.readFile(filePath);

  if (base64Data) {
    const buffer = window.electronAPI.createBuffer(base64Data);
    return buffer;
  } else {
    console.error('Failed to read file.');
  }
};

/**
 * Hook for uploading videos with progress tracking
 */
export function useVideoUpload(options: UseVideoUploadOptions = {}) {
  const { onSuccess, onError, onProgress } = options;

  const mutation = useMutation({
    mutationFn: async (payload: UploadPayload) => {
      const formData = new FormData();

      formData.append('checkList', JSON.stringify(payload.checkList));
      formData.append('form', JSON.stringify(payload.form));
      formData.append(
        'processingResults',
        JSON.stringify(payload.processingResults)
      );

      // Add each video from the payload to the form data
      for (let index = 0; index < payload.videos.length; index++) {
        const video = payload.videos[index];
        // Create blob from video content
        const content = await readFile(video.content);
        const videoBlob = new Blob([content], { type: 'video/mp4' });

        // Add video file
        formData.append(`videos[${index}]`, videoBlob, video.metadata.name);

        // Add video metadata and processing results
        formData.append(
          `videos[${index}].data`,
          JSON.stringify({
            ...video,
          })
        );
      }

      // Create an AbortController for cancellation support
      const controller = new AbortController();
      const signal = controller.signal;

      try {
        // For large files, we might want to use FormData
        // but for this specific API structure, we'll use JSON directly
        const response = await fetchApi(
          '/internal/external-apps/datacollection/task',
          {
            method: 'POST',
            body: formData,
            signal,
          }
        );

        const result = await response.json();
        return result;
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Upload cancelled');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });

  const upload = (payload: UploadPayload) => {
    return mutation.mutateAsync(payload);
  };

  const cancel = () => {
    // We can cancel the upload by aborting the controller
    if (mutation.isPending) {
      // This will trigger the AbortError in the mutationFn
      mutation.reset();
    }
  };

  return {
    upload,
    cancel,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}
