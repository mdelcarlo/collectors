import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BiBot } from 'react-icons/bi';
import { MdLogin } from 'react-icons/md';
import useEnvVars from '../hooks/useEnvVars';
import { AuthData } from '../hooks/useAuth';

const LoginPage: React.FC = () => {
  const { scaleUrl, isLoading: envVarsLoading } = useEnvVars();
  const loginWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    const handleAuthChange = ({ auth }: { auth: AuthData }) => {
      const userLoggedInAndWindowOpen = auth.loggedIn && loginWindowRef.current
      if (userLoggedInAndWindowOpen) {
        loginWindowRef.current.close();
        loginWindowRef.current = null;
      }
    };

    window.electronAPI.onAuthChanged(handleAuthChange);
  }, []);

  const handleLogin = () => {
    const redirectUrl = encodeURIComponent('/robotics');
    const loginUrl = `${scaleUrl}/corp/login?redirect_url=${redirectUrl}`;

    // Store reference to the window
    loginWindowRef.current = window.open(loginUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8"
      >
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-4">
            <BiBot className="text-blue-600 dark:text-blue-400" size={60} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">
          Robotics Training Assistant
        </h1>

        <p className="text-gray-600 dark:text-gray-300 text-center mb-8">
          Access your videos and training tasks by signing in with your account
        </p>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogin}
          disabled={envVarsLoading || !scaleUrl}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <MdLogin size={20} />
          <span>{envVarsLoading ? 'Loading...' : 'Sign in with Remotasks'}</span>
        </motion.button>

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
          You will be redirected to the Remotasks login page
        </p>
      </motion.div>

      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© 2025 Robotics Training Assistant</p>
        <p className="mt-2">Contact support for assistance</p>
      </div>
    </div>
  );
};

export default LoginPage;