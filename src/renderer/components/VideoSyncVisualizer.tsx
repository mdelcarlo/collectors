import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import VideoPreview from './VideoPreview';
import { MdContentCopy, MdRemoveRedEye, MdVisibilityOff } from 'react-icons/md';

interface VideoSyncVisualizerProps {
  video1: {
    name: string;
    preview: string;
    duration: number;
    url: string;
    checksum: string;
  };
  video2: {
    name: string;
    preview: string;
    duration: number;
    url: string;
    checksum: string;
  };
  offset: number; // in milliseconds, positive means video2 starts after video1
  showThumbnails?: boolean;
}

const truncateText = (text: string, maxLength: number = 28): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

const formatTime = (timeInMs: number): string => {
  const totalSeconds = Math.floor(timeInMs / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((timeInMs % 1000) / 10);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
};

const VideoSyncVisualizer: React.FC<VideoSyncVisualizerProps> = ({
  video1,
  video2,
  offset,
  showThumbnails = true,
}) => {
  const [maxDuration, setMaxDuration] = useState(0);
  const [totalTimelineMs, setTotalTimelineMs] = useState(0);
  const [earliestStartMs, setEarliestStartMs] = useState(0);
  const [selectedTimeMs, setSelectedTimeMs] = useState<number | null>(null);
  const [timelineHoverPosition, setTimelineHoverPosition] = useState<number | null>(null);
  const [showSyncVisualizer, setShowSyncVisualizer] = useState(false);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChecksum(text);
    setTimeout(() => setCopiedChecksum(null), 2000);
  };

  const togglePreview = () => {
    setShowSyncVisualizer((prev) => !prev);
  };

  // Refs for video elements
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);

  // Calculate the total timeline duration and positions
  useEffect(() => {
    const video1StartMs = offset < 0 ? Math.abs(offset) : 0;
    const video2StartMs = offset > 0 ? offset : 0;
    const video1EndMs = video1StartMs + (video1.duration * 1000);
    const video2EndMs = video2StartMs + (video2.duration * 1000);

    const earliest = Math.min(video1StartMs, video2StartMs);
    const latest = Math.max(video1EndMs, video2EndMs);

    setEarliestStartMs(earliest);
    setTotalTimelineMs(latest - earliest);
    setMaxDuration(latest);

    // Default selected time to the overlap start if there is overlap
    if (hasOverlap) {
      setSelectedTimeMs(overlapStartMs);
    } else {
      setSelectedTimeMs(earliest + (latest - earliest) / 2);
    }
  }, [video1.duration, video2.duration, offset]);

  // Update video positions when selected time changes
  useEffect(() => {
    if (selectedTimeMs === null) return;

    const video1Time = getVideo1CurrentTime(selectedTimeMs);
    const video2Time = getVideo2CurrentTime(selectedTimeMs);

    // Update video 1 position
    if (video1Ref.current) {
      if (video1Time < 0) {
        video1Ref.current.currentTime = 0;
        video1Ref.current.pause();
      } else if (video1Time > video1.duration * 1000) {
        video1Ref.current.currentTime = video1.duration;
        video1Ref.current.pause();
      } else {
        video1Ref.current.currentTime = video1Time / 1000;
      }
    }

    // Update video 2 position
    if (video2Ref.current) {
      if (video2Time < 0) {
        video2Ref.current.currentTime = 0;
        video2Ref.current.pause();
      } else if (video2Time > video2.duration * 1000) {
        video2Ref.current.currentTime = video2.duration;
        video2Ref.current.pause();
      } else {
        video2Ref.current.currentTime = video2Time / 1000;
      }
    }
  }, [selectedTimeMs]);

  // Calculate positions for timeline visualization
  const video1StartPercent = offset < 0
    ? (Math.abs(offset) / totalTimelineMs) * 100
    : 0;
  const video1EndPercent = ((offset < 0 ? Math.abs(offset) : 0) + video1.duration * 1000) / totalTimelineMs * 100;

  const video2StartPercent = offset > 0
    ? (offset / totalTimelineMs) * 100
    : 0;
  const video2EndPercent = ((offset > 0 ? offset : 0) + video2.duration * 1000) / totalTimelineMs * 100;

  // Calculate overlap
  const overlapStartMs = Math.max(
    offset < 0 ? Math.abs(offset) : 0,
    offset > 0 ? offset : 0
  );
  const overlapEndMs = Math.min(
    (offset < 0 ? Math.abs(offset) : 0) + video1.duration * 1000,
    (offset > 0 ? offset : 0) + video2.duration * 1000
  );

  const hasOverlap = overlapEndMs > overlapStartMs;

  const overlapStartPercent = hasOverlap ? ((overlapStartMs) / totalTimelineMs) * 100 : 0;
  const overlapWidthPercent = hasOverlap ? ((overlapEndMs - overlapStartMs) / totalTimelineMs) * 100 : 0;

  // Timeline interval markers
  const generateTimeMarkers = () => {
    const markers = [];
    const totalDurationSec = totalTimelineMs / 1000;
    // Choose appropriate interval based on duration
    let interval = 1; // default 1 second

    if (totalDurationSec > 60) {
      interval = 10; // 10 seconds
    } else if (totalDurationSec > 30) {
      interval = 5; // 5 seconds
    } else if (totalDurationSec > 10) {
      interval = 2; // 2 seconds
    }

    for (let i = 0; i <= totalDurationSec; i += interval) {
      const position = (i * 1000 / totalTimelineMs) * 100;
      markers.push({
        time: i * 1000,
        position: position,
      });
    }

    return markers;
  };

  const timeMarkers = generateTimeMarkers();

  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const clickTimeMs = percentage * totalTimelineMs;
    setSelectedTimeMs(clickTimeMs);
  };

  // Handle timeline hover
  const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    setTimelineHoverPosition(percentage * 100);
  };

  // Handle timeline mouse leave
  const handleTimelineLeave = () => {
    setTimelineHoverPosition(null);
  };

  // Get video 1 current time based on selected time
  const getVideo1CurrentTime = (selectedTime: number): number => {
    if (offset < 0) {
      return selectedTime - Math.abs(offset);
    }
    return selectedTime;
  };

  // Get video 2 current time based on selected time
  const getVideo2CurrentTime = (selectedTime: number): number => {
    if (offset > 0) {
      return selectedTime - offset;
    }
    return selectedTime;
  };

  // Toggle play/pause for both videos
  const togglePlayPause = () => {
    if (!video1Ref.current || !video2Ref.current) return;

    const video1Playing = !video1Ref.current.paused;

    if (video1Playing) {
      video1Ref.current.pause();
      video2Ref.current.pause();
    } else {
      // Only play if video is in valid time range
      const video1Time = getVideo1CurrentTime(selectedTimeMs || 0);
      const video2Time = getVideo2CurrentTime(selectedTimeMs || 0);

      if (video1Time >= 0 && video1Time < video1.duration * 1000) {
        video1Ref.current.play();
      }

      if (video2Time >= 0 && video2Time < video2.duration * 1000) {
        video2Ref.current.play();
      }
    }
  };

  // Synchronize play/pause between videos
  const syncVideos = () => {
    if (!video1Ref.current || !video2Ref.current) return;

    const video1 = video1Ref.current;
    const video2 = video2Ref.current;

    video1.onplay = () => {
      const video2Time = getVideo2CurrentTime(getVideo1CurrentTime(video1.currentTime * 1000));
      if (video2Time >= 0 && video2Time < video2.duration * 1000) {
        video2.currentTime = video2Time / 1000;
        video2.play().catch(e => console.error("Error playing video 2:", e));
      }
    };

    video1.onpause = () => {
      video2.pause();
    };

    video2.onplay = () => {
      const video1Time = getVideo1CurrentTime(getVideo2CurrentTime(video2.currentTime * 1000));
      if (video1Time >= 0 && video1Time < video1.duration * 1000) {
        video1.currentTime = video1Time / 1000;
        video1.play().catch(e => console.error("Error playing video 1:", e));
      }
    };

    video2.onpause = () => {
      video1.pause();
    };

    // Update selected time when videos are playing
    video1.ontimeupdate = () => {
      if (!video1.paused) {
        const newSelectedTime = video1.currentTime * 1000 + (offset < 0 ? Math.abs(offset) : 0);
        setSelectedTimeMs(newSelectedTime);
      }
    };
  };

  // Initialize video synchronization
  useEffect(() => {
    syncVideos();
  }, [offset, video1.duration, video2.duration]);

  return (
    <div className="w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="relative mb-6">
        {(video1 && video2) && (
          <button
            onClick={togglePreview}
            className="z-10 absolute right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {showSyncVisualizer ? (
              <div className='flex items-center'> Hide sync details <MdVisibilityOff className="w-5 h-5" /></div>
            ) : (
              <div className='flex items-center'> Show sync details <MdRemoveRedEye className="w-5 h-5" /></div>
            )}
          </button>
        )}
        {/* this is a trial will remain hidden for poc */}
        <div className=" hidden flex flex-row gap-4 border-gray-100 border-2 p-3 rounded-lg">
          {/* Video 1 */}
          {video1 && (
            <div className="flex-1">
              <div className="mb-3">
                <p
                  className="text-gray-800 dark:text-gray-200 font-medium truncate"
                  title={video1.name}
                >
                  {truncateText(video1.name)}
                </p>
                <div className="text-gray-500 dark:text-gray-400 text-sm flex items-center">
                  <span
                    className="truncate max-w-[180px]"
                    title={video1.checksum}
                  >
                    Checksum: {truncateText(video1.checksum || '', 16)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(video1.checksum || '')}
                    className="ml-2 text-gray-500 hover:text-blue-500 focus:outline-none"
                    title="Copy checksum"
                  >
                    <MdContentCopy className="w-4 h-4" />
                  </button>
                  {copiedChecksum === video1.checksum && (
                    <span className="ml-2 text-xs text-green-500">
                      Copied!
                    </span>
                  )}
                </div>
                <AnimatePresence>
                  {showSyncVisualizer && (
                    <motion.div
                      key="video1Preview"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <VideoPreview
                        preview={video1.preview || ''}
                        title={video1.name}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Video 2 */}
          {video2 && (
            <div className="flex-1">
              <div className="mb-3">
                <p
                  className="text-gray-800 dark:text-gray-200 font-medium truncate"
                  title={video2.name}
                >
                  {truncateText(video2.name)}
                </p>
                <div className="text-gray-500 dark:text-gray-400 text-sm flex items-center">
                  <span
                    className="truncate max-w-[180px]"
                    title={video2.checksum}
                  >
                    Checksum: {truncateText(video2.checksum || '', 16)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(video2.checksum || '')}
                    className="ml-2 text-gray-500 hover:text-blue-500 focus:outline-none"
                    title="Copy checksum"
                  >
                    <MdContentCopy className="w-4 h-4" />
                  </button>
                  {copiedChecksum === video2.checksum && (
                    <span className="ml-2 text-xs text-green-500">
                      Copied!
                    </span>
                  )}
                </div>
                <AnimatePresence>
                  {showSyncVisualizer && (
                    <motion.div
                      key="video2Preview"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <VideoPreview
                        preview={video2.preview || ''}
                        title={video2.name}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Video preview area */}
        {selectedTimeMs !== null && (
          <div className="w-full mb-6 grid grid-cols-2 gap-4">
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2">
              <div className="text-sm font-medium mb-2 flex justify-between">
                <span className="text-blue-600 dark:text-blue-400">{video1.name}</span>
                {showSyncVisualizer && <span className="text-gray-500">
                  {formatTime(getVideo1CurrentTime(selectedTimeMs))} / {formatTime(video1.duration * 1000)}
                </span>}
              </div>
              <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                <video
                  ref={video1Ref}
                  src={`file://${video1.preview}`}
                  className="w-full h-full object-contain"
                  preload="auto"
                />
                {getVideo1CurrentTime(selectedTimeMs) < 0 && (
                  <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                    <span className="text-white text-lg">Video not started yet</span>
                  </div>
                )}
                {getVideo1CurrentTime(selectedTimeMs) > video1.duration * 1000 && (
                  <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                    <span className="text-white text-lg">Video ended</span>
                  </div>
                )}
                {/* Blue outline when in overlap area */}
                {hasOverlap && selectedTimeMs >= overlapStartMs && selectedTimeMs <= overlapEndMs && (
                  <div className="absolute inset-0 border-4 border-blue-500 rounded-md pointer-events-none"></div>
                )}
              </div>
            </div>

            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2">
              <div className="text-sm font-medium mb-2 flex justify-between">
                <span className="text-green-600 dark:text-green-400">{video2.name}</span>
                {showSyncVisualizer && <span className="text-gray-500">
                  {formatTime(getVideo2CurrentTime(selectedTimeMs))} / {formatTime(video2.duration * 1000)}
                </span>}
              </div>
              <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                <video
                  ref={video2Ref}
                  src={`file://${video2.preview}`}
                  className="w-full h-full object-contain"
                  preload="auto"
                />
                {getVideo2CurrentTime(selectedTimeMs) < 0 && (
                  <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                    <span className="text-white text-lg">Video not started yet</span>
                  </div>
                )}
                {getVideo2CurrentTime(selectedTimeMs) > video2.duration * 1000 && (
                  <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                    <span className="text-white text-lg">Video ended</span>
                  </div>
                )}
                {/* Green outline when in overlap area */}
                {hasOverlap && selectedTimeMs >= overlapStartMs && selectedTimeMs <= overlapEndMs && (
                  <div className="absolute inset-0 border-4 border-green-500 rounded-md pointer-events-none"></div>
                )}
              </div>
            </div>
          </div>
        )}
        <AnimatePresence>
          {showSyncVisualizer &&
            < motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Playback controls */}
              <div className="w-full flex justify-center mb-4">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                  onClick={togglePlayPause}
                >
                  Play/Pause
                </button>
              </div>

              <div className="w-full mb-8 relative">
                {/* Main timeline ruler */}
                <div
                  className="w-full h-12 bg-gray-100 dark:bg-gray-700 rounded-md mb-8 relative overflow-hidden cursor-pointer"
                  onClick={handleTimelineClick}
                  onMouseMove={handleTimelineHover}
                  onMouseLeave={handleTimelineLeave}
                >
                  {/* Time markers */}
                  {timeMarkers.map((marker, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 h-full border-l border-gray-300 dark:border-gray-600 flex flex-col justify-end"
                      style={{ left: `${marker.position}%` }}
                    >
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-1">
                        {formatTime(marker.time)}
                      </div>
                    </div>
                  ))}

                  {/* Overlap indicator */}
                  {hasOverlap && (
                    <motion.div
                      className="absolute h-full bg-purple-500 bg-opacity-30 border-l border-r border-purple-500"
                      style={{
                        left: `${overlapStartPercent}%`,
                        width: `${overlapWidthPercent}%`,
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                    />
                  )}

                  {/* Timeline hover indicator */}
                  {timelineHoverPosition !== null && (
                    <div
                      className="absolute top-0 h-full border-l-2 border-gray-600 dark:border-gray-400 z-10"
                      style={{ left: `${timelineHoverPosition}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                        {formatTime((timelineHoverPosition / 100) * totalTimelineMs)}
                      </div>
                    </div>
                  )}

                  {/* Selected time indicator */}
                  {selectedTimeMs !== null && (
                    <div
                      className="absolute top-0 h-full border-l-2 border-red-500 z-20"
                      style={{ left: `${(selectedTimeMs / totalTimelineMs) * 100}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        {formatTime(selectedTimeMs)}
                      </div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* Video 1 timeline */}
                <div className="relative mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-500 rounded-sm mr-2"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{video1.name}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Duration: {formatTime(video1.duration * 1000)}</span>
                  </div>

                  <div className="w-full h-12 bg-gray-50 dark:bg-gray-900 rounded-md relative overflow-hidden flex items-center">
                    {/* Video 1 bar */}
                    <motion.div
                      className="absolute h-10 bg-blue-500 bg-opacity-20 border-2 border-blue-500 rounded-md flex items-center"
                      style={{
                        left: `${video1StartPercent}%`,
                        width: `${video1EndPercent - video1StartPercent}%`,
                        top: '1px',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${video1EndPercent - video1StartPercent}%` }}
                      transition={{ duration: 0.5 }}
                    >
                      {/* Video start marker */}
                      <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800 flex items-center justify-center z-10">
                        <span className="text-xs font-bold text-white">S</span>
                      </div>

                      {/* Video end marker */}
                      <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800 flex items-center justify-center z-10">
                        <span className="text-xs font-bold text-white">E</span>
                      </div>

                      {/* Overlap indicators */}
                      {hasOverlap && (
                        <>
                          <div
                            className="absolute top-0 bottom-0 border-l-2 border-purple-600 h-full"
                            style={{
                              left: `${((overlapStartMs - (offset < 0 ? Math.abs(offset) : 0)) / (video1.duration * 1000)) * 100}%`,
                            }}
                          >
                            <div className="absolute -top-6 -left-3 text-xs text-purple-600 font-bold">
                              Sync Start
                            </div>
                          </div>
                          <div
                            className="absolute top-0 bottom-0 border-l-2 border-purple-600 h-full"
                            style={{
                              left: `${((overlapEndMs - (offset < 0 ? Math.abs(offset) : 0)) / (video1.duration * 1000)) * 100}%`,
                            }}
                          >
                            <div className="absolute -top-6 -left-3 text-xs text-purple-600 font-bold">
                              Sync End
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>

                    {/* Video 1 thumbnail */}
                    {showThumbnails && video1.preview && (
                      <div
                        className="absolute h-full w-full opacity-30 bg-center bg-cover"
                        style={{
                          backgroundImage: `url(${video1.preview})`,
                          left: `${video1StartPercent}%`,
                          width: `${video1EndPercent - video1StartPercent}%`,
                        }}
                      />
                    )}
                  </div>

                  {offset !== 0 && offset < 0 && (
                    <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                      Video 1 starts {formatTime(Math.abs(offset))} after Video 2
                    </div>
                  )}
                </div>

                {/* Video 2 timeline */}
                <div className="relative mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded-sm mr-2"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{video2.name}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Duration: {formatTime(video2.duration * 1000)}</span>
                  </div>

                  <div className="w-full h-12 bg-gray-50 dark:bg-gray-900 rounded-md relative overflow-hidden flex items-center">
                    {/* Video 2 bar */}
                    <motion.div
                      className="absolute h-10 bg-green-500 bg-opacity-20 border-2 border-green-500 rounded-md flex items-center"
                      style={{
                        left: `${video2StartPercent}%`,
                        width: `${video2EndPercent - video2StartPercent}%`,
                        top: '1px',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${video2EndPercent - video2StartPercent}%` }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      {/* Video start marker */}
                      <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-green-500 border-2 border-white dark:border-gray-800 flex items-center justify-center z-10">
                        <span className="text-xs font-bold text-white">S</span>
                      </div>

                      {/* Video end marker */}
                      <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-green-500 border-2 border-white dark:border-gray-800 flex items-center justify-center z-10">
                        <span className="text-xs font-bold text-white">E</span>
                      </div>

                      {/* Overlap indicators */}
                      {hasOverlap && (
                        <>
                          <div
                            className="absolute top-0 bottom-0 border-l-2 border-purple-600 h-full"
                            style={{
                              left: `${((overlapStartMs - (offset > 0 ? offset : 0)) / (video2.duration * 1000)) * 100}%`,
                            }}
                          >
                            <div className="absolute -top-6 -left-3 text-xs text-purple-600 font-bold">
                              Sync Start
                            </div>
                          </div>
                          <div
                            className="absolute top-0 bottom-0 border-l-2 border-purple-600 h-full"
                            style={{
                              left: `${((overlapEndMs - (offset > 0 ? offset : 0)) / (video2.duration * 1000)) * 100}%`,
                            }}
                          >
                            <div className="absolute -top-6 -left-3 text-xs text-purple-600 font-bold">
                              Sync End
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>

                    {/* Video 2 thumbnail */}
                    {showThumbnails && video2.preview && (
                      <div
                        className="absolute h-full w-full opacity-30 bg-center bg-cover"
                        style={{
                          backgroundImage: `url(${video2.preview})`,
                          left: `${video2StartPercent}%`,
                          width: `${video2EndPercent - video2StartPercent}%`,
                        }}
                      />
                    )}
                  </div>

                  {offset !== 0 && offset > 0 && (
                    <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                      Video 2 starts {formatTime(offset)} after Video 1
                    </div>
                  )}
                </div>
              </div>
            </motion.div>}
        </AnimatePresence>

      </motion.div >

      {/* Sync status summary */}
      < div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 mt-4" >
        <div className="flex items-center mb-2">
          <div className={`w-3 h-3 rounded-full mr-2 ${hasOverlap ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {hasOverlap
              ? 'Videos have synchronized content'
              : 'Videos do not have any overlap'}
          </span>
        </div>

        {
          hasOverlap && (
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="bg-purple-100 dark:bg-purple-900 dark:bg-opacity-30 p-3 rounded-md">
                <p className="text-xs text-gray-600 dark:text-gray-400">Overlap Duration</p>
                <p className="text-md font-bold text-purple-700 dark:text-purple-400">
                  {formatTime(overlapEndMs - overlapStartMs)}
                </p>
              </div>

              <div className="bg-blue-100 dark:bg-blue-900 dark:bg-opacity-30 p-3 rounded-md">
                <p className="text-xs text-gray-600 dark:text-gray-400">Offset</p>
                <p className="text-md font-bold text-blue-700 dark:text-blue-400">
                  {offset === 0
                    ? 'No offset'
                    : offset > 0
                      ? `+${formatTime(offset)} (Video 2 delayed)`
                      : `+${formatTime(Math.abs(offset))} (Video 1 delayed)`}
                </p>
              </div>
            </div>
          )
        }
      </div >
    </div >
  );
};

export default VideoSyncVisualizer;