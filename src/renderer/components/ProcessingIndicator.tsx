import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MdAutorenew, MdVideoCameraFront } from 'react-icons/md';
import { Pair } from 'src/types';

interface ProcessingIndicatorProps {
  pairedProcessingVideos: Pair[];
  activePair: Pair;
  onNavigateToProcessing: () => void;
}

const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  pairedProcessingVideos,
  activePair,
  onNavigateToProcessing
}) => {
  const [showLoadingPanel, setShowLoadingPanel] = useState(false);

  return (
    <div
      className="fixed bottom-6 right-6 z-50"
      onMouseEnter={() => setShowLoadingPanel(true)}
      onMouseLeave={() => setShowLoadingPanel(false)}
    >
      {/* Always visible loading icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center bg-blue-600 text-white rounded-full h-12 w-12 shadow-lg cursor-pointer relative"
        onClick={onNavigateToProcessing}
      >
        <MdAutorenew className="text-white text-xl animate-spin" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
          {pairedProcessingVideos.length * 2}
        </span>
      </motion.div>

      {/* Details panel shown on hover */}
      {showLoadingPanel && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute bottom-14 right-0 bg-gradient-to-r from-blue-600 to-blue-700 
            text-white p-4 rounded-lg shadow-lg flex items-center gap-2
            dark:from-blue-700 dark:to-blue-800 
            cursor-pointer"
          onClick={onNavigateToProcessing}
        >
          <div className="flex items-center gap-3">
            {/* Video thumbnail */}
            <div className="relative h-12 w-16 rounded overflow-hidden flex-shrink-0">
              {activePair.video1.path ? (
                <video
                  src={`file://${activePair.video1.path}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gray-700 flex items-center justify-center">
                  <MdVideoCameraFront size={20} />
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-30"></div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 w-48">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Processing 2 videos</span>
              </div>
              <span className="text-xs opacity-80 mt-1">
                {pairedProcessingVideos.length * 2 - 2} videos in queue
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ProcessingIndicator;