import React, { useState, useEffect, useRef } from 'react';
import { Pair } from 'src/types';

interface VideoProgressBarProps {
  pair: Pair;
}

// Progress calculation constants
const START_EXPONENTIAL_SLOWDOWN = 80;   // Percentage where exponential slowdown begins
const END_EXPONENTIAL_SLOWDOWN = 99;     // Maximum percentage during processing
const BASE_PROCESSING_TIME = 420000;     // 7 minutes base time
const MAX_PROCESSING_TIME = 600000;      // 10 minutes maximum (cap)
const DEFAULT_FPS = 30;                  // Default frames per second if not available
const SIZE_DIVISOR = 7 * 1024 * 1024 * 1024; // 7 GB reference size for calculation
const DURATION_REFERENCE = 1800;         // 30 minutes reference duration
const MIN_SIZE_FACTOR = 0.5;
const MAX_SIZE_FACTOR = 3;
const MIN_DURATION_FACTOR = 0.5;
const MAX_DURATION_FACTOR = 3;
const MIN_FPS_FACTOR = 0.5;
const MAX_FPS_FACTOR = 2;
const MIN_PROGRESS_PERCENTAGE = 5;
const SECONDS_IN_MINUTE = 60;
const PROGRESS_UPDATE_INTERVAL = 1000;   // Update progress every 1 second
const COMPLETION_DISPLAY_DURATION = 2000; // Show 100% for 2 seconds


const VideoProgressBar: React.FC<VideoProgressBarProps> = ({ pair }) => {
  const [progress, setProgress] = useState({ percentage: 0, timeRemaining: '' });
  const [forceShow, setForceShow] = useState(false);
  const estimatedTotalTimeRef = useRef<number>(0);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initTimeRef = useRef<number>(Date.now());

  const video1Processing = pair.video1.status === 'processing';
  const video2Processing = pair.video2.status === 'processing';
  const isProcessing = video1Processing || video2Processing;

  const activeVideo = video1Processing ? pair.video1 : video2Processing ? pair.video2 : null;

  /**
   * Calculates the estimated processing time for the video pair based on their properties.
   * The calculation considers multiple factors:
   * - Total size of both videos
   * - Average duration
   * - Average frames per second
   * 
   * The base processing time is adjusted by these factors, with each factor having
   * minimum and maximum multipliers to avoid extreme values.
   * 
   * @returns {number} Estimated total processing time in milliseconds, capped at 10 minutes
   */
  const calculateEstimatedTime = () => {
    const video1 = pair.video1;
    const video2 = pair.video2;

    const totalSize = (video1.size || 0) + (video2.size || 0);
    const avgDuration = ((video1.duration || 0) + (video2.duration || 0)) / 2;
    const avgFps = ((video1.fps || DEFAULT_FPS) + (video2.fps || DEFAULT_FPS)) / 2;

    const sizeFactor = Math.max(MIN_SIZE_FACTOR, Math.min(MAX_SIZE_FACTOR, totalSize / SIZE_DIVISOR));
    const durationFactor = Math.max(MIN_DURATION_FACTOR, Math.min(MAX_DURATION_FACTOR, avgDuration / DURATION_REFERENCE));
    const fpsFactor = Math.max(MIN_FPS_FACTOR, Math.min(MAX_FPS_FACTOR, avgFps / DEFAULT_FPS));

    return Math.min(MAX_PROCESSING_TIME, BASE_PROCESSING_TIME * sizeFactor * durationFactor * fpsFactor);
  };

  /**
   * Applies an exponential slowdown effect to the progress percentage as it approaches completion.
   * This creates a more realistic progress display that slows down near the end, matching typical
   * processing patterns where final steps take longer.
   * 
   * @param linearPercentage - The raw linear percentage of completion (0-100)
   * @returns An adjusted percentage value with exponential slowdown applied
   */
  const applyExponentialSlowdown = (linearPercentage: number): number => {
    if (linearPercentage < START_EXPONENTIAL_SLOWDOWN) {
      return linearPercentage;
    }

    const remainingRange = END_EXPONENTIAL_SLOWDOWN - START_EXPONENTIAL_SLOWDOWN;
    const normalizedProgress = (linearPercentage - START_EXPONENTIAL_SLOWDOWN) / remainingRange; // 0 to 1

    // Exponential curve: slower progress as we approach 1
    // Power of 3 gives a good exponential curve
    const slowedProgress = Math.pow(normalizedProgress, 3);

    return START_EXPONENTIAL_SLOWDOWN + (slowedProgress * remainingRange);
  };

  const updateProgress = () => {
    if (!isProcessing) return;

    const startTime = activeVideo?.startProcessingTime || initTimeRef.current;
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;

    const linearPercentage = Math.min(99, (elapsedTime / estimatedTotalTimeRef.current) * 100);
    const adjustedPercentage = Math.max(MIN_PROGRESS_PERCENTAGE, applyExponentialSlowdown(linearPercentage));

    const totalEstimatedMs = estimatedTotalTimeRef.current;
    const linearCompletionRatio = linearPercentage / 100;
    const timeRemainingMs = Math.max(0, totalEstimatedMs * (1 - linearCompletionRatio));
    const seconds = Math.ceil(timeRemainingMs / 1000);

    let timeText = '';
    if (seconds >= SECONDS_IN_MINUTE) {
      const minutes = Math.floor(seconds / SECONDS_IN_MINUTE);
      const remainingSeconds = seconds % SECONDS_IN_MINUTE;
      timeText = `${minutes}m ${remainingSeconds}s remaining`;
    } else {
      timeText = `${seconds}s remaining`;
    }

    setProgress({
      percentage: adjustedPercentage,
      timeRemaining: timeText
    });
  };

  // Effect to handle processing state changes
  useEffect(() => {
    // When processing state changes
    if (isProcessing) {
      console.log("Processing detected", {
        video1Status: pair.video1.status,
        video2Status: pair.video2.status,
        startTime: activeVideo?.startProcessingTime || 'using component init time'
      });

      // Clean up any existing timers
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }

      // Set up initial state
      estimatedTotalTimeRef.current = calculateEstimatedTime();
      setForceShow(true);

      // Start with initial update
      updateProgress();

      // Set up interval for regular updates
      progressTimerRef.current = setInterval(updateProgress, PROGRESS_UPDATE_INTERVAL);
    }
    // When processing completes
    else if (forceShow) {
      console.log("Processing completed");

      // Show 100% completion
      setProgress({ percentage: 100, timeRemaining: '' });

      // Reset after delay
      const resetTimer = setTimeout(() => {
        setForceShow(false);
        setProgress({ percentage: 0, timeRemaining: '' });
      }, COMPLETION_DISPLAY_DURATION);

      return () => clearTimeout(resetTimer);
    }

    // Cleanup function
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isProcessing, pair.video1.status, pair.video2.status]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  // Only show if processing or forcibly shown
  if (!isProcessing && !forceShow) return null;

  return (
    <div className="w-full my-2">
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${isProcessing ? 'bg-blue-500 dark:bg-blue-600' : 'bg-green-500 dark:bg-green-600'
            }`}
          style={{
            width: `${progress.percentage}%`,
            transition: 'width 0.8s ease-in-out'
          }}
        />
      </div>
    </div>
  );
};

export default VideoProgressBar;