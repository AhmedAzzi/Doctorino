import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  exp: number;
  sub: string;
  [key: string]: any;
}

/**
 * Checks if the current auth token is valid and not expired
 * @returns {boolean} True if token is valid and not expired
 */
export const isTokenValid = (): boolean => {
  try {
    const token = localStorage.getItem('authToken');

    if (!token) {
      console.warn('No auth token found');
      return false;
    }

    // Decode the token to check expiration
    const decoded = jwtDecode<DecodedToken>(token);

    // Check if token is expired
    const currentTime = Date.now() / 1000;
    if (decoded.exp < currentTime) {
      console.warn('Token has expired');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

/**
 * Gets the current user's username from the token
 * @returns {string|null} Username or null if not available
 */
export const getCurrentUsername = (): string | null => {
  try {
    const token = localStorage.getItem('authToken');

    if (!token) {
      return null;
    }

    const decoded = jwtDecode<DecodedToken>(token);
    return decoded.sub || null;
  } catch (error) {
    console.error('Error getting username from token:', error);
    return null;
  }
};

/**
 * Refreshes the auth token if needed
 * @returns {Promise<boolean>} True if token was refreshed successfully
 */
export const refreshTokenIfNeeded = async (): Promise<boolean> => {
  try {
    // Check if token exists but is expired
    const token = localStorage.getItem('authToken');
    if (!token) {
      return false;
    }

    // If token is still valid, no need to refresh
    if (isTokenValid()) {
      return true;
    }

    // Token is expired, try to refresh it
    // This would typically call a refresh token endpoint
    // For now, we'll just redirect to login
    console.warn('Token expired, redirecting to login');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
    return false;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
};

/**
 * Logs out the user by calling the logout endpoint and removing local storage data
 * @returns {Promise<boolean>} True if logout was successful
 */
export const logout = async (): Promise<boolean> => {
  try {
    const token = localStorage.getItem('authToken');

    if (token) {
      // Call the backend logout endpoint
      // In development, use relative URL for proxy; in production, use full URL
      const apiUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'https://doctorino-api.onrender.com');
      const response = await fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('Logout successful on server');
      } else {
        console.warn('Server logout failed, but continuing with client-side logout');
      }
    }

    // Clear all auth-related data from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('modelsLoaded');
    localStorage.removeItem('modelLoadingStatus');

    // Clear any other application state that should be reset on logout
    sessionStorage.clear(); // Clear any session storage data

    // Redirect to login page
    window.location.href = '/login';
    return true;
  } catch (error) {
    console.error('Error during logout:', error);

    // Even if the server request fails, still clear local data and redirect
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('modelsLoaded');
    localStorage.removeItem('modelLoadingStatus');
    sessionStorage.clear();

    window.location.href = '/login';
    return false;
  }
};
