import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import fallbackImage from '../../assets/fallback.svg';

import {
  MdPlayCircle,
  MdClose,
} from 'react-icons/md';

interface VideoPreviewProps {
  preview: string;
  title: string;
}


// Portal component for the video modal
const VideoModal = ({
  preview,
  onClose
}: {
  preview: string,
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
      className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 min-w-[1000px]"
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
          src={`file://${preview}`}
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

const VideoPreview: React.FC<VideoPreviewProps> = ({
  preview,
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
          overflow-hidden
        `}
      >
          {/* Left side - Video thumbnail */}
          <div
            className="relative bg-gray-200 dark:bg-gray-600"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {preview ? (
              <>
                <div className="w-full min-h-40 max-h-40">
                  <video
                    src={`file://${preview}`}
                    className="w-full object-cover"
                    disablePictureInPicture
                    onError={(e) => e.currentTarget.src = fallbackImage}
                  />
                </div>

                <AnimatePresence>
                  {isHovered && (
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

          </div>
      </div>

      <AnimatePresence>
        {isVideoPlaying && (
          <VideoModal
            preview={preview}
            onClose={handleCloseVideo}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default VideoPreview;