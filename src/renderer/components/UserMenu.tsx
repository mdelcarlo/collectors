import React, { useState } from 'react';
import { MdAccountCircle, MdLogout } from 'react-icons/md';
import { motion } from 'framer-motion';
import { useUser } from '../hooks/useUser';

interface UserMenuProps {
  username: string | null;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ username, onLogout }) => {
  const [showMenu, setShowMenu] = useState(false);
  const {user} = useUser()

  if (!username) {
    return (
      <div className="flex items-center px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
        <MdAccountCircle className="mr-2" size={20} />
        <span>Not logged in</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button 
        className="flex items-center px-3 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        onClick={() => setShowMenu(!showMenu)}
      >
        <MdAccountCircle className="mr-2" size={20} />
        <span>{user ? user.firstName : username}</span>
      </button>

      {showMenu && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border dark:border-gray-700"
        >
          <button
            onClick={() => {
              onLogout();
              setShowMenu(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <MdLogout className="mr-2" />
            Logout
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default UserMenu;