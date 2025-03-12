export function getCookie(name: string): string | undefined {
  const cookieString = document.cookie;
  if (!cookieString) return undefined;

  const cookies = cookieString.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(value);
  }
  return undefined;
}