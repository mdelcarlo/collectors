import React from 'react';
import { motion } from 'framer-motion';
import { Audio } from 'src/types';
import { formatFileSize } from '../utils/formatFileSize';
import {
  MdAudioFile,
  MdStorage
} from 'react-icons/md';

interface AudioListProps {
  audios: Audio[];
}

const AudioList: React.FC<AudioListProps> = ({ audios }) => {
  if (audios.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 p-6">
        No extracted audio files yet. Extract audio from paired videos to see them here.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {audios.map(audio => (
        <motion.div 
          key={audio.id}
          whileHover={{ scale: 1.02 }}
          className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-lg 
                     hover:shadow-xl transition-shadow duration-200 
                     border border-gray-100 dark:border-gray-600"
        >
          <div className="flex items-center gap-2 mb-3">
            <MdAudioFile className="text-2xl text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white truncate" 
                title={audio.name}>
              {audio.name}
            </h3>
          </div>
          
          {/* {audio.size && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
              <MdStorage className="text-lg" />
              {formatFileSize(audio.size)}
            </p>
          )} */}
          
          <audio 
            controls 
            className="w-full mt-2 rounded-lg [&::-webkit-media-controls-panel]:bg-gray-100 
                       dark:[&::-webkit-media-controls-panel]:bg-gray-800
                       [&::-webkit-media-controls-current-time-display]:text-gray-900
                       dark:[&::-webkit-media-controls-current-time-display]:text-white
                       [&::-webkit-media-controls-time-remaining-display]:text-gray-900
                       dark:[&::-webkit-media-controls-time-remaining-display]:text-white"
          >
            <source src={`file://${audio.audio}`} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </motion.div>
      ))}
    </div>
  );
};

export default AudioList;