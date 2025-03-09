import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoItem from './VideoItem';
import { Video } from 'src/types';
import { GroupOption } from '../App';
import { ViewMode } from '../App';
import { MdDragIndicator, MdInfo } from 'react-icons/md';

interface DragDropAreaProps {
  videos: Video[];
  onPair: (video1Id: string, video2Id: string) => void;
  processingVideos: string[];
  groupBy: GroupOption;
  viewMode: ViewMode; // Added viewMode prop
}

const groupVideosByDay = (videos: Video[]) => {
  return videos.reduce((groups, video) => {
    const date = new Date(video.createdAt).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(video);
    return groups;
  }, {} as Record<string, Video[]>);
};

const DragDropArea: React.FC<DragDropAreaProps> = ({
  videos,
  onPair,
  processingVideos,
  groupBy,
  viewMode, // Using the viewMode prop
}) => {
  const [draggedVideoId, setDraggedVideoId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);

  // Handle drag start
  const handleDragStart = (event: React.DragEvent, videoId: string) => {
    setDraggedVideoId(videoId);
    event.dataTransfer?.setData('videoId', videoId);
    setShowHint(false);
  };

  // Handle drag over
  const handleDragOver = (event: React.DragEvent, videoId: string) => {
    event.preventDefault();
    if (draggedVideoId && draggedVideoId !== videoId) {
      setDropTargetId(videoId);
    }
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  // Handle drop
  const handleDrop = (event: React.DragEvent, targetVideoId: string) => {
    event.preventDefault();
    const sourceVideoId = event.dataTransfer.getData('videoId');

    if (sourceVideoId && sourceVideoId !== targetVideoId) {
      onPair(sourceVideoId, targetVideoId);
    }

    setDraggedVideoId(null);
    setDropTargetId(null);
  };

  if (videos.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          No unpaired videos. Upload more videos to see them here, or check the Paired Videos tab.
        </p>
      </div>
    );
  }

  // Render video item for either grid or list view
  const renderVideoItem = (video: Video) => {
    return (
      <motion.div
        key={video.id}
        className={`
          ${viewMode === 'list' ? 'w-full' : ''}
          relative
        `}
        layoutId={`video-${video.id}`}
        onDragOver={(e) => handleDragOver(e, video.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, video.id)}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        {draggedVideoId && draggedVideoId !== video.id && dropTargetId !== video.id && (
          <div className="absolute inset-0 bg-opacity-10 z-10 rounded-lg border-2 border-dashed border-gray-400 pointer-events-none"></div>
        )}

        {dropTargetId === video.id && (
          <div className="absolute inset-0 bg-opacity-10 z-10 rounded-lg border-2 border-dashed border-blue-500 bg-blue-400 pointer-events-none"></div>
        )}

        <div className="relative group">
          <div className="absolute top-2 right-2 bg-gray-800 bg-opacity-40 text-white p-1 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <MdDragIndicator className="w-5 h-5" />
          </div>

          <VideoItem
            video={video}
            isProcessing={processingVideos.includes(video.id)}
            isDraggable={true}
            onDragStart={handleDragStart}
          />
        </div>
      </motion.div>
    );
  };

  // Group view rendering logic
  const renderGroupedVideos = () => {
    return Object.entries(groupVideosByDay(videos))
      .sort(([dateA], [dateB]) =>
        new Date(dateB).getTime() - new Date(dateA).getTime()
      )
      .map(([date, dateVideos]) => (
        <div key={date} className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 py-1 px-3 rounded-full text-sm">
              {date}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-3">
              {dateVideos.length} video{dateVideos.length !== 1 ? 's' : ''}
            </span>
          </h3>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {dateVideos.map(renderVideoItem)}
            </div>
          ) : (
            <div className="space-y-3">
              {dateVideos.map(renderVideoItem)}
            </div>
          )}
        </div>
      ));
  };

  // Ungrouped view rendering logic  
  const renderUngroupedVideos = () => {
    return viewMode === 'grid' ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {videos.map(renderVideoItem)}
      </div>
    ) : (
      <div className="space-y-3">
        {videos.map(renderVideoItem)}
      </div>
    );
  };

  return (
    <div>
      <AnimatePresence>
        {showHint && (
          <motion.div
            className="flex items-center p-4 mb-4 bg-blue-50 dark:bg-blue-900 rounded-lg text-blue-800 dark:text-blue-200 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <MdInfo className="w-5 h-5 mr-2 flex-shrink-0" />
            <p>Drag and drop videos to pair them manually. Each video can only be paired once.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {groupBy === 'day' ? renderGroupedVideos() : renderUngroupedVideos()}
    </div>
  );
};

export default DragDropArea;