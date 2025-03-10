import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Pair } from 'src/types';

interface VideoProgressBarProps {
  pair: Pair;
}

// Progress calculation constants
const START_EXPONENTIAL_SLOWDOWN = 75;   // Percentage where exponential slowdown begins
const END_EXPONENTIAL_SLOWDOWN = 97;     // Maximum percentage during processing
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

// Light beam styles - defined outside component to prevent recreation on each render
const lightBeamStyles = {
  width: "15px",
  transform: "skewX(-15deg)",
  background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)",
  animation: "lightBeam 1.2s linear infinite"
};

// Animation style - defined once outside component
const animationStyle = `
  @keyframes lightBeam {
    0% {
      left: -20px;
    }
    100% {
      left: 100%;
    }
  }
`;

// Extracted Progress UI for memoization
const ProgressUI = memo(({ percentage, timeRemaining, isProcessing }: { 
  percentage: number, 
  timeRemaining: string, 
  isProcessing: boolean 
}) => (
  <div className="w-full my-2">
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full relative ${isProcessing ? 'bg-blue-500 dark:bg-blue-600' : 'bg-green-500 dark:bg-green-600'}`}
        style={{
          width: `${percentage}%`,
          transition: 'width 0.8s ease-in-out'
        }}
      >
        {/* Light beam effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute h-full"
            style={lightBeamStyles}
          />
        </div>
      </div>
    </div>

    {/* Add CSS keyframes for the light beam animation */}
    <style jsx>{animationStyle}</style>
  </div>
));

ProgressUI.displayName = 'ProgressUI';

// Queue message component
const QueueMessage = memo(() => (
  <div className="w-full my-2">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-full bg-yellow-400 dark:bg-yellow-500 animate-pulse"></div>
      <p className="text-sm text-gray-600 dark:text-gray-400">Waiting in processing queue...</p>
    </div>
  </div>
));

QueueMessage.displayName = 'QueueMessage';

const VideoProgressBar: React.FC<VideoProgressBarProps> = ({ pair }) => {
  const [progress, setProgress] = useState({ percentage: 0, timeRemaining: '' });
  const [forceShow, setForceShow] = useState(false);
  const estimatedTotalTimeRef = useRef<number>(0);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initTimeRef = useRef<number>(Date.now());
  
  const video1Processing = pair.video1.status === 'processing' && pair.video1.startProcessingTime;
  const video2Processing = pair.video2.status === 'processing' && pair.video2.startProcessingTime;
  const isProcessing = video1Processing || video2Processing;

  // Check if either video is queued (has status 'processing' but no startProcessingTime)
  const activeVideo = video1Processing ? pair.video1 : video2Processing ? pair.video2 : null;

  /**
   * Calculates the estimated processing time for the video pair based on their properties.
   * Memoized to prevent recalculation on every render.
   */
  const calculateEstimatedTime = useCallback(() => {
    const video1 = pair.video1;
    const video2 = pair.video2;

    const totalSize = (video1.size || 0) + (video2.size || 0);
    const avgDuration = ((video1.duration || 0) + (video2.duration || 0)) / 2;
    const avgFps = ((video1.fps || DEFAULT_FPS) + (video2.fps || DEFAULT_FPS)) / 2;

    const sizeFactor = Math.max(MIN_SIZE_FACTOR, Math.min(MAX_SIZE_FACTOR, totalSize / SIZE_DIVISOR));
    const durationFactor = Math.max(MIN_DURATION_FACTOR, Math.min(MAX_DURATION_FACTOR, avgDuration / DURATION_REFERENCE));
    const fpsFactor = Math.max(MIN_FPS_FACTOR, Math.min(MAX_FPS_FACTOR, avgFps / DEFAULT_FPS));

    return Math.min(MAX_PROCESSING_TIME, BASE_PROCESSING_TIME * sizeFactor * durationFactor * fpsFactor);
  }, [pair.video1, pair.video2]);

  /**
   * Applies an exponential slowdown effect to the progress percentage.
   */
  const applyExponentialSlowdown = useCallback((linearPercentage: number): number => {
    if (linearPercentage < START_EXPONENTIAL_SLOWDOWN) {
      return linearPercentage;
    }

    const remainingRange = END_EXPONENTIAL_SLOWDOWN - START_EXPONENTIAL_SLOWDOWN;
    const normalizedProgress = (linearPercentage - START_EXPONENTIAL_SLOWDOWN) / remainingRange; // 0 to 1

    // Exponential curve: slower progress as we approach 1
    const slowedProgress = Math.pow(normalizedProgress, 3);

    return START_EXPONENTIAL_SLOWDOWN + (slowedProgress * remainingRange);
  }, []);

  const updateProgress = useCallback(() => {
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
  }, [isProcessing, activeVideo, applyExponentialSlowdown]);

  // Effect to handle processing state changes
  useEffect(() => {
    // When processing state changes
    if (isProcessing) {
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
  }, [isProcessing, calculateEstimatedTime, updateProgress]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  // Show queue message when video is marked for processing but not actively processing yet
  if (!activeVideo) {
    return <QueueMessage />;
  }

  // Only show if processing or forcibly shown
  if (!isProcessing && !forceShow) return null;

  return (
    <ProgressUI 
      percentage={progress.percentage} 
      timeRemaining={progress.timeRemaining} 
      isProcessing={isProcessing}
    />
  );
};

export default memo(VideoProgressBar);