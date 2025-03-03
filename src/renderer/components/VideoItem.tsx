import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import fallbackImage from '../../assets/fallback.svg';
import { Video } from 'src/types';
import {
  MdDateRange,
  MdSpeed,
  MdStorage,
  MdPlayCircle,
  MdClose,
} from 'react-icons/md';
import { formatFileSize } from '../utils/formatFileSize';
import { calculateFps } from '../utils/calculateFps';

interface VideoItemProps {
  video: Video;
  isProcessing: boolean;
  isDraggable?: boolean;
  onDragStart?: (event: React.DragEvent, videoId: string) => void;
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleString();
};

// Portal component for the video modal
const VideoModal = ({
  video,
  onClose
}: {
  video: Video,
  onClose: () => void
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Play video after modal is fully visible
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(err => console.error("Error playing video:", err));
      }
    }, 500);

    // Handle click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    // Handle escape key
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  

  return ReactDOM.createPortal(
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        ref={modalRef}
        className="relative w-full max-w-4xl rounded-lg overflow-hidden bg-black"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <video
          ref={videoRef}
          src={`file://${video.path}`}
          className="w-full h-auto"
          controls
          disablePictureInPicture
          onError={(e) => e.currentTarget.src = fallbackImage}
        />
        <button
          className="absolute top-3 right-3 bg-white rounded-full p-1 shadow-lg z-10"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <MdClose className="w-6 h-6 text-gray-800" />
        </button>
      </motion.div>
    </motion.div>,
    document.body
  );
};

const VideoItem: React.FC<VideoItemProps> = ({
  video,
  isProcessing,
  isDraggable = false,
  onDragStart
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const handlePlayVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVideoPlaying(true);
  };

  const handleCloseVideo = () => {
    setIsVideoPlaying(false);
  };

  return (
    <>
      <div
        className={`
          bg-white dark:bg-gray-700 rounded-lg 
          border border-gray-200 dark:border-gray-600 
          shadow-sm hover:shadow-md transition-shadow duration-200
          ${isDraggable ? 'cursor-grab' : ''}
          ${isProcessing ? 'opacity-50' : ''}
          overflow-hidden
        `}
        draggable={isDraggable && !isVideoPlaying}
        onDragStart={isDraggable && onDragStart && !isVideoPlaying ? (e) => onDragStart(e, video.id) : undefined}
      >
        <div className="flex">
          {/* Left side - Video thumbnail */}
          <div
            className="w-1/3 relative bg-gray-200 dark:bg-gray-600"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {video.path ? (
              <>
                <div className="w-full h-full min-h-40 max-h-40">
                  <video
                    src={`file://${video.path}`}
                    className="w-full h-full object-cover"
                    disablePictureInPicture
                    onError={(e) => e.currentTarget.src = fallbackImage}
                  />
                </div>

                <AnimatePresence>
                  {isHovered && !isProcessing && (
                    <motion.div
                      className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center cursor-pointer"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={handlePlayVideo}
                    >
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 15, stiffness: 300 }}
                      >
                        <MdPlayCircle className="w-12 h-12 text-white opacity-90 hover:opacity-100" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-500 dark:text-gray-400">No thumbnail</span>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="loader"></div>
              </div>
            )}
          </div>

          {/* Right side - Video details */}
          <div className="w-2/3 p-6 space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-lg text-gray-900 dark:text-white truncate" title={video.name}>
                {video.name}
              </h4>

              <div className="space-y-1.5">
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <MdDateRange className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
                  <p className="text-sm">
                    {formatDate(video.createdAt)}
                  </p>
                </div>
                {video.fps && (
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <MdSpeed className="w-4 h-4 mr-2 text-orange-500 dark:text-orange-400" />
                    <p className="text-sm">
                      {calculateFps(video.fps)} FPS
                    </p>
                  </div>
                )}
                {video.size && (
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <MdStorage className="w-4 h-4 mr-2 text-purple-500 dark:text-purple-400" />
                    <p className="text-sm">
                      {formatFileSize(video.size)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isVideoPlaying && (
          <VideoModal
            video={video}
            onClose={handleCloseVideo}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default VideoItem;