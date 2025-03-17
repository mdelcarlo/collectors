import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { Video } from 'src/types';
import VideoSyncVisualizer from './VideoSyncVisualizer'; // Import the new component
import { useVideoUpload } from '../hooks/useVideoUpload';
import { useClickAway } from 'react-use';

interface UploadPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  pair: { video1: Video; video2: Video };
}

const UploadPairModal: React.FC<UploadPairModalProps> = ({ isOpen, onClose, pair }) => {
  const [activity, setActivity] = useState('');
  const [environment, setEnvironment] = useState('');
  const [isSync, setIsSync] = useState(false);
  const [isSufficientLighting, setIsSufficientLighting] = useState(false);

  const { video1, video2 } = pair;
  const menuRef = useRef<HTMLDivElement>(null);

  useClickAway(menuRef, () => {
    onClose();
  });

  // Use your custom upload hook
  const { upload, isLoading, isError, isSuccess, error } = useVideoUpload({
    onSuccess: data => {
      console.log('Upload success:', data);
    },
    onError: err => {
      console.error('Upload error:', err);
    },
  });

  // Offset value in milliseconds (from your processing results)
  const videoOffset = 5500; // 1.5 seconds offset (video2 starts 1.5s after video1)
  const handleSubmit = async () => {
    const payload = {
      form: {
        activity,
        environment,
      },
      checkList: [isSync ? 'sync' : '', isSufficientLighting ? 'lighting' : ''].filter(Boolean),
      videos: [
        {
          metadata: { name: video1.name, size: video1.size },
          content: video1.preview,
          checksum: video1.checksum,
          processingResults: {
            offset: video1.offset || 0,
          },
        },
        {
          metadata: { name: video2.name, size: video2.size },
          content: video2.preview,
          checksum: video2.checksum,
          processingResults: {
            offset: video2.offset || 0,
          },
        },
      ],
      processingResults: {
        alignment: {
          confidence: 0,
          elapsedTimeSeconds: 0,
          overlap: 0,
        },
      },
    };

    try {
      await upload(payload);
      onClose();
    } catch (err) {
      console.error('Error uploading pair:', err);
    }
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
        ref={menuRef}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Upload Pair Videos
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <MdClose className="w-6 h-6" />
            </button>
          </div>

          <div className="overflow-y-auto mb-8" style={{ maxHeight: '80vh' }}>
            {/* Video Sync Visualizer Section */}
            {video1 && video2 && (
              <div className="mb-6">
                <VideoSyncVisualizer
                  video1={{
                    name: video1.name,
                    preview: video1.preview || '',
                    duration: video1.duration || 0,
                    checksum: video1.checksum || '',
                  }}
                  video2={{
                    name: video2.name,
                    preview: video2.preview || '',
                    duration: video2.duration || 0,
                    checksum: video2.checksum || '',
                  }}
                  offset={video1.offset}
                  showThumbnails={true}
                />
              </div>
            )}

            {/* Form fields */}
            <div className="space-y-4 mb-6">
              <div>
                <input
                  type="text"
                  placeholder="Activity"
                  value={activity}
                  onChange={e => setActivity(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Environment"
                  value={environment}
                  onChange={e => setEnvironment(e.target.value)}
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
                  onChange={e => setIsSync(e.target.checked)}
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
                  onChange={e => setIsSufficientLighting(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="lightingCheck" className="ml-2 text-gray-700 dark:text-gray-300">
                  Sufficient lighting in the videos
                </label>
              </div>
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
                ${
                  !video1 || !video2 || !isSync || !isSufficientLighting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }
              `}
            >
              Submit
            </button>
          </div>

          {/* Optional: Display upload status */}
          {isLoading && <p className="mt-4 text-blue-500">Uploading...</p>}
          {isSuccess && <p className="mt-4 text-green-500">Upload complete!</p>}
          {isError && <p className="mt-4 text-red-500">Upload failed: {error?.message}</p>}
        </div>
      </motion.div>
    </div>
  );
};

export default UploadPairModal;
