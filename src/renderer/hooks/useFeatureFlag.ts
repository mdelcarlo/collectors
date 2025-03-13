import { useQuery } from '@tanstack/react-query';
import { getUnleashFeature } from '../utils/scaleSDK';

interface UnleashResponse {
  isEnabled: boolean;
  [key: string]: any;
}

export function useFeatureFlag(feature: string, projectId?: string | null, customerId?: string | null) {
  const { data, isLoading, isError, error } = useQuery<UnleashResponse, Error>({
    queryKey: ['feature-flag', feature, projectId, customerId],
    queryFn: async () => {
      const response = await getUnleashFeature({ feature, projectId, customerId });
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  });

  return {
    isEnabled: data?.isEnabled ?? false,
    isLoading,
    isError,
    error,
  };
}