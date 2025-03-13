import React, { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MdCloudUpload, MdClose, MdRemoveRedEye, MdVisibilityOff, MdContentCopy } from 'react-icons/md';
import { Video } from 'src/types';
import VideoPreview from './VideoPreview';
import { useVideoUpload } from '../hooks/useVideoUpload'; // <--- Import the custom hook
import { useClickAway } from 'react-use';

const truncateText = (text: string, maxLength: number = 28): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

interface UploadPairModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  pair,
}) => {
  const [activity, setActivity] = useState('');
  const [environment, setEnvironment] = useState('');
  const [isSync, setIsSync] = useState(false);
  const [isSufficientLighting, setIsSufficientLighting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);
  
  const { video1, video2 } = pair;
  const menuRef = useRef<HTMLDivElement>(null);

  useClickAway(menuRef, () => {
    // Click outside handler if needed
  });

  // Use your custom upload hook
  const {
    upload,
    isLoading,
    isError,
    isSuccess,
    error,
  } = useVideoUpload({
    onSuccess: (data) => {
      console.log('Upload success:', data);
    },
    onError: (err) => {
      console.error('Upload error:', err);
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChecksum(text);
    setTimeout(() => setCopiedChecksum(null), 2000);
  };

  const togglePreview = () => {
    setShowPreview((prev) => !prev);
  };

  const handleSubmit = async () => {
    const payload = {
      form: {
        activity,
        environment,
      },
      checkList: [
        isSync ? 'sync' : '',
        isSufficientLighting ? 'lighting' : '',
      ].filter(Boolean),
      videos: [
        {
          metadata: { name: video1.name, size: video1.size },
          content: video1.preview,
        },
        {
          metadata: { name: video2.name, size: video2.size },
          content: video2.preview,
        },
      ],
      processingResults: {
        alignment: {
          targetId: video2.id,
          offset: 1500, // 1500 milliseconds
          confidence: 0,
        }
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
    <div
      ref={menuRef}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-3xl w-full"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
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

          <div className="relative mb-6">
            {(video1 && video2) && (
              <button
                onClick={togglePreview}
                className="z-10 absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPreview ? (
                  <MdVisibilityOff className="w-5 h-5" />
                ) : (
                  <MdRemoveRedEye className="w-5 h-5" />
                )}
              </button>
            )}

            <div className="flex flex-row gap-4 border-gray-100 border-2 p-3 rounded-lg">
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
                      {showPreview && (
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
                      {showPreview && (
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
            </div>

            {/* Time info */}
            {video1?.duration && (
              <div className="pt-4 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
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
              <label
                htmlFor="syncCheck"
                className="ml-2 text-gray-700 dark:text-gray-300"
              >
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
              <label
                htmlFor="lightingCheck"
                className="ml-2 text-gray-700 dark:text-gray-300"
              >
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