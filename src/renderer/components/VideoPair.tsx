import React from 'react';
import VideoItem from './VideoItem';
import { Pair } from 'src/types';
import { MdLinkOff } from 'react-icons/md';

interface VideoPairProps {
  pair: Pair;
  onUnpair: (pairId: string) => void;
  isProcessing: boolean;
}

const VideoPair: React.FC<VideoPairProps> = ({
  pair,
  onUnpair,
  isProcessing
}) => {
  return (
    <div className="bg-gray-100 dark:bg-gray-600 rounded-lg p-4 relative group transition-colors hover:bg-blue-100">
      <div className="grid grid-cols-2 gap-4 relative">
        <div className="relative">
          <VideoItem
            video={pair.video1}
            isProcessing={isProcessing}
          />
        </div>

        <div className="relative">

          <VideoItem
            video={pair.video2}
            isProcessing={isProcessing}
          />
        </div>
      </div>

      <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onUnpair(pair.id)}
          className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 
                   text-white px-2 py-1 rounded text-sm flex items-center 
                   transition-colors"
          title="Separate paired videos"
        >
          <MdLinkOff className="mr-1" />
          Unpair
        </button>
      </div>
    </div>
  );
};

export default VideoPair;