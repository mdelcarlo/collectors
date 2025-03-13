
import React from 'react';

/**
 * MainContentContainer wraps the main portion of the layout.
 *
 * It applies margin to accommodate the sidebar:
 * - ml-16 for small screens
 * - lg:ml-64 for larger screens
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - The child elements (main content).
 * @returns {JSX.Element} The container for the main content.
 */
const MainContentContainer: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="ml-16 lg:ml-64 flex-1 flex flex-col transition-all duration-300">
      {children}
    </div>
  );
};

export default MainContentContainer;