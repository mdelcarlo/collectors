// App.tsx

import React, { useState } from 'react';

import {
    MdMoreVert,
} from 'react-icons/md';

import { motion } from 'framer-motion';


interface ActionProps {
    label: string;
    onClick: () => void;
    icon: React.ReactNode;
    disabled?: boolean;
}

export const Action: React.FC<ActionProps> = ({ label, onClick, icon, disabled }) => {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            disabled={disabled}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 
                   dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
            {icon}
            {label}
        </motion.button>
    );
};

interface PairedVideosActionsProps {
    children: React.ReactNode;
}

const ToggleableActions: React.FC<PairedVideosActionsProps> = ({ children }) => {
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            className="relative group"
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
                <MdMoreVert size={24} className="text-gray-600 dark:text-gray-300" />
            </motion.button>

            {showActions && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-8 w-64 bg-white dark:bg-gray-800 
                       rounded-lg shadow-lg py-2 z-50 border dark:border-gray-700 mt-2"
                >
                    {/* Invisible layer to prevent hover gap */}
                    <div className="absolute -top-2 left-0 right-0 h-2" />
                    {children}
                </motion.div>
            )}
        </div>
    );
};

export default ToggleableActions;