import { useQuery } from '@tanstack/react-query';
import { getUser } from '../utils/scaleSDK';

export interface User {
  _id: string;
  id: string;
  email: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  accountType: string;
  isCorporateUser?: boolean;
  studioCustomer?: boolean;
  isRemoAdmin?: boolean;
  spoofed?: boolean;
}

const AVATAR_STYLE = 'bottts';
const USER_STORAGE_KEY = 'cached_user_data';

export function useUser() {
  const {
    data: user,
    isLoading: loading,
    error
  } = useQuery<User, Error>({
    queryKey: ['user'],
    queryFn: async ({ signal }) => {
      const response = await getUser({ signal });
      const data = await response.json();
      
      // Store user data in localStorage when successfully fetched
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
      
      return data;
    },
    // Initialize with data from localStorage if available
    initialData: () => {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        try {
          return JSON.parse(storedUser) as User;
        } catch (e) {
          console.error('Failed to parse stored user data:', e);
        }
      }
      return undefined;
    },
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });

  const userId = user?._id || 'default';
  const avatarUrl = `https://api.dicebear.com/7.x/${AVATAR_STYLE}/svg?seed=${userId}`;
  
  // Maintain the same interface as before
  return { 
    user: user || null, 
    avatarUrl, 
    loading, 
    error: error ? error.message : null 
  };
}