import { useEffect, useState } from 'react';
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

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function fetchUser() {
      try {
        setLoading(true);
        const response = await getUser({signal});
        
        if (!signal.aborted) {
          const data = await response.json();
          console.log('data: ', data);
          setUser(data);
        }
      } catch (err: any) {
        console.log('err: ', err);
        if (!signal.aborted) {
          setError(err.message || 'Failed to fetch user');
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchUser();
    return () => controller.abort();
  }, []);

  return { user, loading, error };
}
