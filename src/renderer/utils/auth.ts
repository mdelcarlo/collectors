/**
 * Stores authentication data in localStorage
 */
export function storeAuthData(auth: { token: string; csrf: string }) {
  if (auth?.csrf) {
    localStorage.setItem('csrf_token', auth.csrf);
  }
  
  // You might want to store other auth-related data as well
  if (auth?.token) {
    localStorage.setItem('auth_token', auth.token);
  }
}

/**
 * Clears authentication data from localStorage
 */
export function clearAuthData() {
  localStorage.removeItem('csrf_token');
  localStorage.removeItem('auth_token');
}