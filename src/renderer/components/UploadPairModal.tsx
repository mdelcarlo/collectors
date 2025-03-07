import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MdCloudUpload, MdClose, MdRemoveRedEye, MdVisibilityOff } from 'react-icons/md';
import { Video } from 'src/types';
import VideoItem from './VideoItem';
import VideoPreview from './VideoPreview';

interface UploadPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    video1: Video;
    video2: Video;
    activity: string;
    environment: string;
    isSync: boolean;
    isSufficientLighting: boolean;
  }) => void;
  pair: { video1: Video; video2: Video };
}

const formatTime = (timeInSeconds: number): string => {
  const totalSeconds = Math.floor(timeInSeconds);
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hoursPart = hours > 0 ? `${hours}h ` : '';
  const minutesPart = `${String(minutes).padStart(2, '0')}m `;
  const secondsPart = `${String(seconds).padStart(2, '0')}s`;

  return `${hoursPart}${minutesPart}${secondsPart}`;
};


const UploadPairModal: React.FC<UploadPairModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  pair,
}) => {
  const [activity, setActivity] = useState('');
  const [environment, setEnvironment] = useState('');
  const [isSync, setIsSync] = useState(false);
  const [isSufficientLighting, setIsSufficientLighting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Mock checksums that would be calculated in a real implementation
  
  const { video1, video2 } = pair;
  const processingTime = video1.processingTime + video2.processingTime;

  const handleSubmit = () => {
    onSubmit({
      video1,
      video2,
      activity,
      environment,
      isSync,
      isSufficientLighting
    });
    onClose();
  };

  const togglePreview = () => {
    // Preview functionality would be implemented here
    setShowPreview(prev => !prev);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">

      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-3xl w-full"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        <div className="p-6 ">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Upload Pair Videos</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <MdClose className="w-6 h-6" />
            </button>
          </div>

          <div className='relative mb-6'>
            {/* Preview button - positioned at the top right of the entire section */}
            {(video1 && video2) && (
              <button
                onClick={togglePreview}
                className="z-10 absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPreview ? <MdVisibilityOff className="w-5 h-5" /> : <MdRemoveRedEye className="w-5 h-5" />}
              </button>
            )}

            {/* Two-column layout for videos */}
            <div className="flex flex-row gap-4 border-gray-100 border-2 p-3 rounded-lg">
              {/* Left column - Video 1 */}
              {video1 && (
                <div className="flex-1">
                  <div className="mb-3">
                    <p className="text-gray-800 dark:text-gray-200 font-medium truncate" title={video1.name}>
                      {video1.name}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Checksum: {video1.checksum}</p>
                    <AnimatePresence>
                      {showPreview && (
                        <motion.div
                          key="video1Preview"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <VideoPreview preview={video1.preview} title={video1.name} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Right column - Video 2 */}
              {video2 && (
                <div className="flex-1">
                  <div className="mb-3">
                    <p className="text-gray-800 dark:text-gray-200 font-medium truncate" title={video2.name}>
                      {video2.name}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Checksum: {video2.checksum}</p>
                    <AnimatePresence>
                      {showPreview && (
                        <motion.div
                          key="video2Preview"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <VideoPreview preview={video2.preview} title={video2.name} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {/* Information below both videos */}
            {(video1 && video1.duration) && (
              <div className="mt-4 border-t pt-4 border-gray-200 dark:border-gray-700">
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  Net Task Time: {formatTime(video1.duration)}
                </p>
              </div>
            )}
          </div>



          {/* Form fields */}
          <div className="space-y-4 mb-6">
            <div>
              <input
                type="text"
                placeholder="Activity"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="syncCheck"
                checked={isSync}
                onChange={(e) => setIsSync(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="syncCheck" className="ml-2 text-gray-700 dark:text-gray-300">
                I checked and both videos are sync
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="lightingCheck"
                checked={isSufficientLighting}
                onChange={(e) => setIsSufficientLighting(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="lightingCheck" className="ml-2 text-gray-700 dark:text-gray-300">
                Sufficient lighting in the videos
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between">
            <button
              onClick={onClose}
              className="py-3 px-6 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!video1 || !video2 || !isSync || !isSufficientLighting}
              className={`
                py-3 px-6 rounded-lg font-medium transition-colors
                ${(!video1 || !video2 || !isSync || !isSufficientLighting)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                  : 'bg-green-500 hover:bg-green-600 text-white'}
              `}
            >
              Submit
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UploadPairModal;
