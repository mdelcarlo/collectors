import React, { useState } from 'react';
import { motion } from 'framer-motion';
import VideoItem from './VideoItem';
import { Video } from 'src/types';
import { GroupOption } from '../App';

interface DragDropAreaProps {
  videos: Video[];
  onPair: (video1Id: string, video2Id: string) => void;
  processingVideos: string[];
  groupBy: GroupOption;
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
}) => {
  const [draggedVideoId, setDraggedVideoId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Handle drag start
  const handleDragStart = (event: React.DragEvent, videoId: string) => {
    setDraggedVideoId(videoId);
    event.dataTransfer?.setData('videoId', videoId);
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
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        No unpaired videos. Upload more videos to see them here.
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Drag and drop videos to pair them manually, or use the "Upload Videos" button to auto-pair.
      </p>

      {groupBy === 'day' ? (
        // Grouped view
        Object.entries(groupVideosByDay(videos))
          .sort(([dateA], [dateB]) => 
            new Date(dateB).getTime() - new Date(dateA).getTime()
          )
          .map(([date, dateVideos]) => (
            <div key={date} className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
                {date}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {dateVideos.map(video => (
                  <motion.div
                    key={video.id}
                    className={`
                      ${dropTargetId === video.id ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
                    `}
                    onDragOver={(e) => handleDragOver(e, video.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, video.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    onDragStart={(e) => handleDragStart(e, video.id)}
                  >
                    <VideoItem
                      video={video}
                      isProcessing={processingVideos.includes(video.id)}
                      isDraggable={true}
                      onDragStart={handleDragStart}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          ))
      ) : (
        // Ungrouped view
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {videos.map(video => (
            <motion.div
              key={video.id}
              className={`
                ${dropTargetId === video.id ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
              `}
              onDragOver={(e) => handleDragOver(e, video.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, video.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              onDragStart={(e) => handleDragStart(e, video.id)}
            >
              <VideoItem
                video={video}
                isProcessing={processingVideos.includes(video.id)}
                isDraggable={true}
                onDragStart={handleDragStart}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DragDropArea;