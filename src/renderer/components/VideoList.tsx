import React from 'react';
import VideoPair from './VideoPair';
import { Pair } from 'src/types';
import { ViewMode } from '../App';

interface VideoListProps {
  pairs: Pair[];
  onUnpair: (pairId: string) => void;
  onProcessVideo: (videoIds: string[]) => void;
  processingVideos: string[];
  groupBy: 'day' | 'none';
  viewMode: ViewMode;
}

const groupPairsByDay = (pairs: Pair[]) => {
  return pairs.reduce((groups, pair) => {
    // Use the more recent date between the two videos
    const date1 = new Date(pair.video1.createdAt);
    const date2 = new Date(pair.video2.createdAt);
    const mostRecentDate = date1 > date2 ? date1 : date2;
    const dateKey = mostRecentDate.toLocaleDateString();

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(pair);
    return groups;
  }, {} as Record<string, Pair[]>);
};

const VideoList: React.FC<VideoListProps> = ({
  pairs,
  onUnpair,
  onProcessVideo,
  processingVideos,
  groupBy,
  viewMode
}) => {
  if (pairs.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        No paired videos yet. Upload videos to automatically pair them, or manually pair unpaired videos.
      </div>
    );
  }

  // Handle processing videos
  const handleProcessPair = (pair: Pair) => {
    onProcessVideo([pair.video1.id, pair.video2.id]);
  };

  const renderPair = (pair: Pair) => {
    const isProcessing = processingVideos.includes(pair.video1.id) || processingVideos.includes(pair.video2.id);

    return (
      <div key={pair.id} className={viewMode === 'grid' ? "mb-2" : "mb-4"}>
        <VideoPair
          pair={pair}
          onUnpair={onUnpair}
          isProcessing={isProcessing}
          onProcess={handleProcessPair}
          viewMode={viewMode}
        />
      </div>
    );
  };

  if (groupBy === 'day') {
    return (
      <div className="space-y-8">
        {Object.entries(groupPairsByDay(pairs))
          .sort(([dateA], [dateB]) =>
            new Date(dateB).getTime() - new Date(dateA).getTime()
          )
          .map(([date, datePairs]) => (
            <div key={date} className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 py-1 px-3 rounded-full text-sm">
                  {date}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-3">
                  {datePairs.length * 2} video{(datePairs.length * 2) !== 1 ? 's' : ''}
                </span>
              </h3>
              <div className={viewMode === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4"
                : "space-y-4"
              }>
                {datePairs.map(pair => renderPair(pair))}
              </div>
            </div>
          ))}
      </div>
    );
  }

  return (
    <div className={viewMode === 'grid'
      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4"
      : "space-y-4"
    }>
      {pairs.map(pair => renderPair(pair))}
    </div>
  );
};

export default VideoList;