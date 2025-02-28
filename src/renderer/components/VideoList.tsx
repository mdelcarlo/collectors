import React from 'react';
import VideoPair from './VideoPair';
import { Pair } from 'src/types';

interface VideoListProps {
  pairs: Pair[];
  onUnpair: (pairId: string) => void;
  onGenerateThumbnail: (videoIds: string[]) => void;
  onExtractAudio: (videoIds: string[]) => void;
  processingVideos: string[];
  groupBy: 'day' | 'none';
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
  processingVideos,
  groupBy,
}) => {
  if (pairs.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No paired videos yet. Upload videos to automatically pair them, or manually pair unpaired videos.
      </div>
    );
  }

  if (groupBy === 'day') {
    return (
      <div className="space-y-8">
        {Object.entries(groupPairsByDay(pairs))
          .sort(([dateA], [dateB]) =>
            new Date(dateB).getTime() - new Date(dateA).getTime()
          )
          .map(([date, datePairs]) => (
            <div key={date}>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
                {date}
              </h3>
              <div className="space-y-4">
                {datePairs.map(pair => (
                  <VideoPair
                    key={pair.id}
                    pair={pair}
                    onUnpair={onUnpair}
                    isProcessing={
                      processingVideos.includes(pair.video1.id) ||
                      processingVideos.includes(pair.video2.id)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pairs.map(pair => (
        <VideoPair
          key={pair.id}
          pair={pair}
          onUnpair={onUnpair}
          isProcessing={
            processingVideos.includes(pair.video1.id) ||
            processingVideos.includes(pair.video2.id)
          }
        />
      ))}
    </div>
  );
};

export default VideoList;