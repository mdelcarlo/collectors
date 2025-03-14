import React, { useCallback } from 'react';
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
  const handleProcessPair = useCallback((pair: Pair) => {
    onProcessVideo([pair.video1.id, pair.video2.id]);
  }, [onProcessVideo]);

  const renderPair = useCallback((pair: Pair) => {
    const isProcessing = processingVideos.includes(pair.video1.id) || processingVideos.includes(pair.video2.id);

    return (
      <VideoPair
        pair={pair}
        onUnpair={onUnpair}
        isProcessing={isProcessing}
        onProcess={() => handleProcessPair(pair)}
        viewMode={viewMode}
      />
    );
  }, [processingVideos, onUnpair, handleProcessPair, viewMode]);

  // Group by day view
  if (groupBy === 'day') {
    const groupedPairs = Object.entries(groupPairsByDay(pairs))
      .sort(([dateA], [dateB]) =>
        new Date(dateB).getTime() - new Date(dateA).getTime()
      );

    return (
      <div className="space-y-8 overflow-y-auto max-h-screen pb-8">
        {groupedPairs.map(([date, datePairs]) => (
          <div key={date} className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 py-1 px-3 rounded-full text-sm">
                {date}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-3">
                {datePairs.length * 2} video{(datePairs.length * 2) !== 1 ? 's' : ''}
              </span>
            </h3>
            
            <div className={`
              ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}
            `}>
              {datePairs.map((pair, index) => (
                <div key={index} className="p-2">
                  {renderPair(pair)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Non-grouped view
  return (
    <div className="overflow-y-auto max-h-screen pb-8">
      <div className={`
        ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}
      `}>
        {pairs.map((pair, index) => (
          <div key={index} className="p-2">
            {renderPair(pair)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(VideoList);