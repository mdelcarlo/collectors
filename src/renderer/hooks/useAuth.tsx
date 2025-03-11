import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthData {
  token: string;
  username: string;
  loggedIn: boolean;
  timestamp: string;
}

interface AuthContextType {
  auth: AuthData | null;
  isLoggedIn: boolean;
  username: string | null;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  auth: null,
  isLoggedIn: false,
  username: null,
  logout: async () => {},
  isLoading: true
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const authData = await window.electronAPI.getAuth();
        console.log('authData: ', authData);
        setAuth(authData);
      } catch (error) {
        console.error('Failed to load auth data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();

    window.electronAPI.onAuthChanged((data: { auth: AuthData | null }) => {
      setAuth(data.auth);
    });

    // Cleanup
    return () => {
      window.electronAPI.removeAllListeners('auth-changed');
    };
  }, []);

  // Logout handler
  const logout = async () => {
    try {
      await window.electronAPI.logout();
      setAuth(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const contextValue: AuthContextType = {
    auth,
    isLoggedIn: !!auth?.loggedIn,
    username: auth?.username || null,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default useAuth;