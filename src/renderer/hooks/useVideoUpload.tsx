import { useMutation } from '@tanstack/react-query';
import { fetchApi } from '../utils/fetchApi';

// Define types for the upload payload
interface PairProcessingResult {
  alignment: {
    targetId: string;
    offset: number;
    confidence: number;
  }
}

interface Video {
  metadata: Record<string, any>;
  content: string;
}

interface UploadPayload {
  form: Record<string, any>;
  checkList: string[];
  videos: Video[];
  processingResults: PairProcessingResult
}

interface UseVideoUploadOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

/**
 * Hook for uploading videos with progress tracking
 */
export function useVideoUpload(options: UseVideoUploadOptions = {}) {
  const { onSuccess, onError, onProgress } = options;
  
  const mutation = useMutation({
    mutationFn: async (payload: UploadPayload) => {
      // Create an AbortController for cancellation support
      const controller = new AbortController();
      const signal = controller.signal;

      try {
        // For large files, we might want to use FormData
        // but for this specific API structure, we'll use JSON directly
        const response = await fetchApi('/api/videos/upload', {
          method: 'POST',
          body: JSON.stringify(payload),
          signal,
        });

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