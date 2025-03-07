import React, { useState, useEffect, useRef } from 'react';
import { Pair } from 'src/types';

interface VideoProgressBarProps {
  pair: Pair;
}

const VideoProgressBar: React.FC<VideoProgressBarProps> = ({ pair }) => {
  const [progress, setProgress] = useState({ percentage: 0, timeRemaining: '' });
  const startTimeRef = useRef<number>(0);
  const estimatedTotalTimeRef = useRef<number>(0);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasProcessingRef = useRef<boolean>(false);

  const isProcessing = pair.video1.status === 'processing' || pair.video2.status === 'processing';

  // Calculate estimated processing time based on video properties
  const calculateEstimatedTime = () => {
    const video1 = pair.video1;
    const video2 = pair.video2;
    
    const baseProcessingTime = 420000; // Updated to 7 minutes reference time
    const totalSize = (video1.size || 0) + (video2.size || 0);
    const avgDuration = ((video1.duration || 0) + (video2.duration || 0)) / 2;
    const avgFps = ((video1.fps || 30) + (video2.fps || 30)) / 2;
    
    const sizeFactor = Math.max(0.5, Math.min(3, totalSize / (7 * 1024 * 1024 * 1024)));
    const durationFactor = Math.max(0.5, Math.min(3, avgDuration / 1800));
    const fpsFactor = Math.max(0.5, Math.min(2, avgFps / 120));
    
    return Math.min(1800000, baseProcessingTime * sizeFactor * durationFactor * fpsFactor);
  };

  // Update progress efficiently
  const updateProgress = () => {
    if (!isProcessing || !startTimeRef.current) return;

    const elapsedTime = Date.now() - startTimeRef.current;
    const percentComplete = Math.min(0.95, elapsedTime / estimatedTotalTimeRef.current);
    
    const calculatedProgress = percentComplete * 100;
    const timeRemainingMs = estimatedTotalTimeRef.current - elapsedTime;
    const seconds = Math.ceil(timeRemainingMs / 1000);

    let timeText = '';
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      timeText = `${minutes}m ${remainingSeconds}s remaining`;
    } else {
      timeText = `${seconds}s remaining`;
    }

    setProgress((prev) => {
      // Always cap at 95% during processing
      if (calculatedProgress > 95) {
        return { percentage: 95, timeRemaining: timeText };
      }
      
      // Only update if change is significant to avoid unnecessary re-renders
      if (Math.abs(prev.percentage - calculatedProgress) >= 1) {
        return { percentage: calculatedProgress, timeRemaining: timeText };
      }
      return prev;
    });
  };

  // Effect for handling processing start/stop
  useEffect(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    // When processing starts
    if (isProcessing) {
      wasProcessingRef.current = true;
      startTimeRef.current = Date.now();
      estimatedTotalTimeRef.current = calculateEstimatedTime();
      setProgress({ percentage: 0, timeRemaining: '' });

      progressTimerRef.current = setInterval(updateProgress, 1000);
    } 
    // When processing finishes
    else if (wasProcessingRef.current) {
      wasProcessingRef.current = false;
      
      // Jump to 100% only when processing is actually complete
      setProgress({ percentage: 100, timeRemaining: '' });

      // Reset progress after a delay
      const completionTimer = setTimeout(() => {
        setProgress({ percentage: 0, timeRemaining: '' });
      }, 2000);

      return () => clearTimeout(completionTimer);
    }

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isProcessing]);

  // Cleanup effect to clear timers on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  if (!isProcessing && progress.percentage === 0) return null;
  
  return (
    <div className="w-full">
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${
            isProcessing ? 'bg-blue-500 dark:bg-blue-600' : 'bg-green-500 dark:bg-green-600'
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