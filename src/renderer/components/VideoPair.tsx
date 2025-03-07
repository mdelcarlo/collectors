import React, { useState, useEffect } from 'react';
import VideoItem from './VideoItem';
import { Pair } from 'src/types';
import { MdLinkOff, MdAutoFixHigh, MdPlayCircleFilled, MdCloudUpload } from 'react-icons/md';
import { ViewMode } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateFps } from '../utils/calculateFps';
import { BiUnlink } from 'react-icons/bi';
import UploadPairModal from './UploadPairModal';
import VideoProgressBar from './VideoProgressBar';

interface VideoPairProps {
  pair: Pair;
  onUnpair: (pairId: string) => void;
  onProcess: (pair: Pair) => void;
  viewMode: ViewMode;
}

const VideoPair: React.FC<VideoPairProps> = ({
  pair,
  onUnpair,
  onProcess,
  viewMode,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [activeVideo, setActiveVideo] = useState<'video1' | 'video2' | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleVideoSelect = (video: 'video1' | 'video2') => {
    setActiveVideo(video);
  };

  const handleCloseVideoSelect = () => {
    setActiveVideo(null);
  };

  const handleUpload = (data: {
    video1: File | null;
    video2: File | null;
    activity: string;
    environment: string;
    isSync: boolean;
    isSufficientLighting: boolean;
  }) => {
    // onPairUploaded(data);
    setIsModalOpen(false);
  };

  const isProcessedPair = pair.video1.status === 'processed' && pair.video2.status === 'processed';
  const isProcessing = pair.video1.status === 'processing' || pair.video2.status === 'processing';
  if (viewMode === 'grid') {
    return (
      <>
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          layout
        >
          <div className="relative">
            {pair.video1.status === 'idle' &&
              <AnimatePresence>
                {isHovered && !isProcessing && (
                  <motion.button
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => onUnpair(pair.id)}
                    className="absolute top-3 right-3 z-10 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    title="Unpair videos"
                  >
                    <BiUnlink className="w-5 h-5" />
                  </motion.button>
                )}
              </AnimatePresence>}

            {/* Video grid */}
            <div className={`${showCompare ? 'flex flex-col sm:flex-row' : 'grid grid-cols-2'} gap-2 p-2`}>
              <div className={`${showCompare ? 'w-full sm:w-1/2' : 'col-span-1'} relative group`}>
                <div
                  className="rounded-lg overflow-hidden transition-transform duration-300 transform group-hover:scale-[1.02]"
                  onClick={() => handleVideoSelect('video1')}
                >
                  <VideoItem
                    video={pair.video1}
                    isProcessing={isProcessing}
                  />
                </div>
              </div>
              <div className={`${showCompare ? 'w-full sm:w-1/2' : 'col-span-1'} relative group`}>
                <div
                  className="rounded-lg overflow-hidden transition-transform duration-300 transform group-hover:scale-[1.02]"
                  onClick={() => handleVideoSelect('video2')}
                >
                  <VideoItem
                    video={pair.video2}
                    isProcessing={isProcessing}
                  />
                </div>
              </div>
            </div>

            {/* Progress bar for processing */}
            {isProcessing && (
              <div className="px-4 pb-3 pt-2">
                <VideoProgressBar pair={pair} />
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Pair ID:
              </span>
              <span className="text-sm text-blue-600 dark:text-blue-400 font-mono">
                {pair.id.slice(0, 8)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                • {new Date(pair.createdAt).toLocaleString()}
              </span>
            </div>
            {pair.video1.status === 'idle' && <div className="flex space-x-2">
              <motion.button
                onClick={() => onProcess(pair)}
                disabled={isProcessing}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700
                text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5
                transition-colors font-medium
              `}
                title="Process this video pair"
              >
                <MdAutoFixHigh className="w-4 h-4" />
                {isProcessing ? 'Processing...' : 'Process'}
              </motion.button>
            </div>}
            {isProcessedPair && (<motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-2 py-1 rounded text-sm flex items-center gap-1 transition-colors"
            >
              <MdCloudUpload className="w-5 h-5" />
              Upload
            </motion.button>)}
          </div>

          {/* Video selection modal */}
          <AnimatePresence>
            {activeVideo && (
              <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                <motion.div
                  className="relative w-full max-w-5xl bg-black rounded-lg overflow-hidden shadow-2xl"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <video
                    src={`file://${activeVideo === 'video1' ? pair.video1.path : pair.video2.path}`}
                    className="w-full h-auto"
                    controls
                    disablePictureInPicture
                  />
                  <button
                    className="absolute top-3 right-3 bg-white rounded-full p-1 shadow-lg"
                    onClick={handleCloseVideoSelect}
                  >
                    <MdLinkOff className="w-6 h-6 text-gray-800" />
                  </button>
                  <div className="absolute top-3 left-3 bg-black bg-opacity-70 text-white text-sm font-medium py-1 px-3 rounded-full">
                    {activeVideo === 'video1' ? pair.video1.name : pair.video2.name}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
        {isProcessedPair && <UploadPairModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleUpload}
          pair={pair}
        />}
      </>
    );
  } else if (viewMode === 'list') {
    // List view
    return (
      <>
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          layout
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h3 className="font-medium text-gray-800 dark:text-white">Paired Videos</h3>
                <span className="ml-2 text-sm text-blue-600 dark:text-blue-400 font-mono">
                  {pair.id.slice(0, 8)}
                </span>
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(pair.createdAt).toLocaleString()}
                </span>
              </div>
              {pair.video1.status === 'idle' && <div className="flex space-x-2">
                <motion.button
                  onClick={() => onProcess(pair)}
                  disabled={isProcessing}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                  bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700
                  text-white px-2 py-1 rounded text-sm flex items-center gap-1
                  transition-colors
                `}
                  title="Process this video pair"
                >
                  <MdAutoFixHigh className="w-4 h-4" />
                  {isProcessing ? 'Processing...' : 'Process'}
                </motion.button>
                <motion.button
                  onClick={() => onUnpair(pair.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700
                        text-white px-2 py-1 rounded text-sm flex items-center gap-1
                        transition-colors"
                  title="Separate paired videos"
                >
                  <MdLinkOff className="w-4 h-4" />
                  Unpair
                </motion.button>
              </div>}
              {isProcessedPair && (<motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-2 py-1 rounded text-sm flex items-center gap-1 transition-colors"
              >
                <MdCloudUpload className="w-5 h-5" />
                Upload
              </motion.button>)}
            </div>

            {/* Progress bar for processing in list view */}
            {isProcessing && (
              <div className="mb-4">
                <VideoProgressBar pair={pair} />
              </div>
            )}

            <div className={`${showCompare ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'space-y-3'}`}>
              <div
                className={`
                relative group rounded-lg overflow-hidden 
                ${showCompare ? 'hover:shadow-lg transition-shadow' : 'flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'}
              `}
                onClick={() => !showCompare && handleVideoSelect('video1')}
              >
                {showCompare ? (
                  <div>
                    <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-70 text-white text-xs font-medium py-1 px-2 rounded">
                      Original
                    </div>
                    <VideoItem video={pair.video1} isProcessing={isProcessing} />
                  </div>
                ) : (
                  <>
                    <div className="w-24 flex-shrink-0 relative group cursor-pointer" onClick={(e) => { e.stopPropagation(); handleVideoSelect('video1'); }}>
                      <div className="aspect-video bg-gray-200 dark:bg-gray-600 rounded overflow-hidden">
                        {pair.video1.path ? (
                          <video
                            src={`file://${pair.video1.path}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
                            <span className="text-xs text-gray-500 dark:text-gray-400">No thumbnail</span>
                          </div>
                        )}
                      </div>
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <MdPlayCircleFilled className="w-8 h-8 text-white" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{pair.video1.name || 'Untitled Video'}</p>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-2">
                        <span>{pair.video1.fps ? `${calculateFps(pair.video1.fps)} FPS` : 'Unknown FPS'}</span>
                        <span>•</span>
                        <span>{pair.video1.size ? `${(pair.video1.size / (1024 * 1024)).toFixed(1)} MB` : 'Unknown size'}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div
                className={`
                relative group rounded-lg overflow-hidden 
                ${showCompare ? 'hover:shadow-lg transition-shadow' : 'flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'}
              `}
                onClick={() => !showCompare && handleVideoSelect('video2')}
              >
                {showCompare ? (
                  <div>
                    <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-70 text-white text-xs font-medium py-1 px-2 rounded">
                      Modified
                    </div>
                    <VideoItem video={pair.video2} isProcessing={isProcessing} />
                  </div>
                ) : (
                  <>
                    <div className="w-24 flex-shrink-0 relative group cursor-pointer" onClick={(e) => { e.stopPropagation(); handleVideoSelect('video2'); }}>
                      <div className="aspect-video bg-gray-200 dark:bg-gray-600 rounded overflow-hidden">
                        {pair.video2.path ? (
                          <video
                            src={`file://${pair.video2.path}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
                            <span className="text-xs text-gray-500 dark:text-gray-400">No thumbnail</span>
                          </div>
                        )}
                      </div>
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <MdPlayCircleFilled className="w-8 h-8 text-white" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{pair.video2.name || 'Untitled Video'}</p>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-2">
                        <span>{pair.video2.fps ? `${calculateFps(pair.video2.fps)} FPS` : 'Unknown FPS'}</span>
                        <span>•</span>
                        <span>{pair.video2.size ? `${(pair.video2.size / (1024 * 1024)).toFixed(1)} MB` : 'Unknown size'}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Video selection modal */}
          <AnimatePresence>
            {activeVideo && (
              <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                <motion.div
                  className="relative w-full max-w-5xl bg-black rounded-lg overflow-hidden shadow-2xl"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <video
                    src={`file://${activeVideo === 'video1' ? pair.video1.path : pair.video2.path}`}
                    className="w-full h-auto"
                    controls
                    disablePictureInPicture
                  />
                  <button
                    className="absolute top-3 right-3 bg-white rounded-full p-1 shadow-lg"
                    onClick={handleCloseVideoSelect}
                  >
                    <MdLinkOff className="w-6 h-6 text-gray-800" />
                  </button>
                  <div className="absolute top-3 left-3 bg-black bg-opacity-70 text-white text-sm font-medium py-1 px-3 rounded-full">
                    {activeVideo === 'video1' ? pair.video1.name : pair.video2.name}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
        {isProcessedPair && <UploadPairModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleUpload}
          pair={pair}
        />}
      </>
    );
  }

  // Default to grid view if no valid view mode is provided
  return null;
};

export default VideoPair;