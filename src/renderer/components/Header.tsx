import React from 'react';
import { motion } from 'framer-motion';
import { MdCloudUpload } from 'react-icons/md';
import { MenuSection } from '../App';

interface HeaderProps {
  activeSection: MenuSection;
  isLoading: boolean;
  onUpload: () => Promise<void>;
}

const Header: React.FC<HeaderProps> = ({ activeSection, isLoading, onUpload }) => {
  return (
    <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 p-3 border-b dark:border-gray-700 flex justify-between items-center max-h-14">
      <div className="text-md font-semibold text-gray-800 dark:text-white text-center flex-1">
        {activeSection === 'videos' ? 'Videos' : 'Tasks'}
      </div>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onUpload}
        disabled={isLoading}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold p-3 rounded-lg shadow-md"
      >
        <MdCloudUpload />
      </motion.button>
    </header>
  );
};

export default Header;