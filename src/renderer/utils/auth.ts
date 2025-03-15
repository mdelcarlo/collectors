
/**
 * Stores authentication data in localStorage and cookies
 */
export function storeAuthData(auth: { token: string; csrf: string }) {
  if (auth?.csrf) {
    localStorage.setItem('csrf_token', auth.csrf);
  }
  
  if (auth?.token) {
    localStorage.setItem('jwt_token', auth.token);
  }
}

/**
 * Clears authentication data from localStorage and cookies
 */
export function clearAuthData() {
  // Clear from localStorage
  localStorage.removeItem('csrf_token');
  localStorage.removeItem('jwt_token');
}