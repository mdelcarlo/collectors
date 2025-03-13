import React from 'react';
import { MdVideoLibrary, MdTask } from 'react-icons/md';
import { BiBot } from 'react-icons/bi';
import { MenuSection } from '../App'; // adjust the import path as needed

interface SidebarProps {
    activeSection: MenuSection;
    setActiveSection: (section: MenuSection) => void;
}

/**
 * Sidebar component for navigation.
 * (works together with MainContentContainer)
 *
 * This component uses responsive classes:
 * - w-16 for small screens
 * - w-64 for larger screens
 *
 * @param {object} props
 * @param {MenuSection} props.activeSection - Current active section (e.g., "videos" or "tasks").
 * @param {function} props.setActiveSection - Callback to set the active section in the app.
 * @returns {JSX.Element} The rendered sidebar.
 */
const Sidebar: React.FC<SidebarProps> = ({ activeSection, setActiveSection }) => {
    return (
        <div
            className={`fixed left-0 flex flex-col w-16 lg:w-64 h-screen bg-white dark:bg-gray-800 transition-all duration-300`}
        >
            {/* App title/logo section */}
            <div className="p-4 max-h-14 flex justify-center lg:justify-start">
                <div className="flex items-center gap-1 lg:gap-2 text-blue-600">
                    <BiBot size={30} />
                    <span className="hidden lg:inline text-sm font-bold text-gray-800 dark:text-white">
                        Robotics Training Assistant
                    </span>
                </div>
            </div>

            {/* Navigation menu */}
            <nav className="flex-1 p-2 border-r dark:border-gray-700">
                <button
                    onClick={() => setActiveSection('videos')}
                    className={`w-full flex items-center justify-center lg:justify-start gap-1 p-2 rounded-lg mb-2 ${activeSection === 'videos'
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                >
                    <MdVideoLibrary size={20} />
                    <span className="hidden lg:inline ml-2">Videos</span>
                </button>

                <button
                    onClick={() => setActiveSection('tasks')}
                    className={`w-full flex items-center justify-center lg:justify-start gap-1 p-2 rounded-lg mb-2 ${activeSection === 'tasks'
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                >
                    <MdTask size={20} />
                    <span className="hidden lg:inline ml-2">Tasks</span>
                    <span className="hidden lg:inline ml-auto text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                        Soon
                    </span>
                </button>
            </nav>
        </div>
    );
};

export default Sidebar;