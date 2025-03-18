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
      const userLoggedInAndWindowOpen = auth.loggedIn && loginWindowRef.current;
      if (userLoggedInAndWindowOpen) {
        loginWindowRef.current.close();
        loginWindowRef.current = null;
      }
    };

    window.electronAPI.onAuthChanged(handleAuthChange);
  }, []);

  const handleLogin = (provider: 'remotasks' | 'corp') => {
    let loginUrl = '';
    if (provider === 'remotasks') {
      const baseUrl = import.meta.env.VITE_PUBLIC_SCALE_URL;
      loginUrl = `${baseUrl}/internal/external-apps/auth?redirectUrl=robotics-contributors://auth`;
    } else {
      const baseUrl = import.meta.env.VITE_PUBLIC_SCALE_BACKEND_URL;
      loginUrl = `${baseUrl}/internal/external-apps/auth?redirectUrl=robotics-contributors://auth`;
    }

    console.log(loginUrl);

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
          onClick={() => handleLogin('remotasks')}
          disabled={envVarsLoading || !scaleUrl}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <MdLogin size={20} />
          <span>
            {envVarsLoading ? 'Loading...' : 'Sign in with Remotasks'}
          </span>
        </motion.button>
        <p className="text-gray-600 dark:text-gray-300 text-left mb-8">
          Or access on your browser to:
          <p>
            <span className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              https://remotasks.com/internal/external-apps/auth?redirectUrl=robotics-contributors://auth
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  'https://remotasks.com/internal/external-apps/auth?redirectUrl=robotics-contributors://auth'
                );
              }}
              className="ml-2 inline-flex items-center p-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Copy URL"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </p>
        </p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleLogin('corp')}
          disabled={envVarsLoading || !scaleUrl}
          className="w-full flex mt-4 items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <MdLogin size={20} />
          <span>{envVarsLoading ? 'Loading...' : 'Sign in with CORP'}</span>
        </motion.button>
        <p className="text-gray-600 dark:text-gray-300 text-left mb-8">
          Or access on your browser to:
          <p>
            <span className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              https://dashboard.scale.com/internal/external-apps/auth?redirectUrl=robotics-contributors://auth
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  'https://dashboard.scale.com/internal/external-apps/auth?redirectUrl=robotics-contributors://auth'
                );
              }}
              className="ml-2 inline-flex items-center p-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Copy URL"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </p>
        </p>

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
