import { useState, useEffect } from 'react';

interface EnvVars {
  PUBLIC_SCALE_URL: string;
  // Add other environment variables as needed
}

const useEnvVars = () => {
  const [envVars, setEnvVars] = useState<EnvVars>({
    PUBLIC_SCALE_URL: '',
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnvVars = async () => {
      try {
        setIsLoading(true);
        // Make sure this API endpoint exists in your preload.js
        const vars = await window.electronAPI.getEnvironmentVariables();
        setEnvVars(vars);
        setError(null);
      } catch (err) {
        console.error('Failed to load environment variables:', err);
        setError('Failed to load application configuration');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnvVars();
  }, []);

  return { 
    envVars, 
    isLoading, 
    error,
    // Shorthand getters for commonly used env vars
    scaleUrl: envVars.PUBLIC_SCALE_URL
  };
};

export default useEnvVars;