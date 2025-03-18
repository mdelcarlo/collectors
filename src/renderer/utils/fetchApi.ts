import { getCookie } from './getCookie';

export async function fetchApi(
  endpoint: string,
  config: RequestInit,
  cache: RequestCache = 'no-cache'
): Promise<Response> {
  const method = config.method ?? 'POST';
  try {
    const baseUrl = import.meta.env.VITE_PUBLIC_SCALE_BACKEND_URL;

    // Get CSRF token from multiple possible sources
    const csrf =
      localStorage.getItem('csrf_token') ||
      getCookie('_csrf') ||
      getCookie('*csrf') ||
      '';

    // Get JWT token from multiple possible sources
    const jwt =
      localStorage.getItem('jwt_token') ||
      getCookie('_jwt') ||
      getCookie('*jwt') ||
      '';

    const response = await fetch(`${baseUrl}${endpoint}`, {
      cache,
      method,
      headers: {
        ...config.headers,
        'x-csrf-token': csrf,
        Authorization: jwt ? `Bearer ${jwt}` : '',
      },
      credentials: 'include',
      ...config,
    });

    const text = await response.text();
    if (!response.ok) {
      const { error } = JSON.parse(text);
      if (response.status === 403) {
        // logout();
      }
      throw new Error(error);
    }

    return new Response(text, response);
  } catch (error) {
    console.error('Error fetching API', error);
    throw error;
  }
}
