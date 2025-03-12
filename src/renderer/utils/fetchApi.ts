import { getCookie } from "./getCookie";

export async function fetchApi(
  endpoint: string,
  config: RequestInit,
  cache: RequestCache = 'no-cache',
): Promise<Response> {
  const method = config.method ?? 'POST';
  try {
    const baseUrl = import.meta.env.VITE_PUBLIC_SCALE_BACKEND_URL;
    const mergedHeaders = {
      'Content-Type': 'application/json',
    };
    const csrf = getCookie('_csrf') || '';

    const response = await fetch(`${baseUrl}${endpoint}`, {
      cache,
      method,
      headers: {
        ...config.headers,
        ...mergedHeaders,
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
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
