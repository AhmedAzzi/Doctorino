import axios from 'axios';
import { isTokenValid, refreshTokenIfNeeded, logout } from './authUtils';

// Default API URL (for development)
const DEFAULT_API_URL = 'http://localhost:34664';

// Create axios instance
const apiClient = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to initialize the API client with the correct URL
export const initializeApiClient = async () => {
  try {
    // Check if we're running in Electron
    if (window.electronAPI) {
      // Get the API URL from the main process
      const apiUrl = await window.electronAPI.getApiUrl();
      apiClient.defaults.baseURL = apiUrl;
      console.log('API client initialized with Electron URL:', apiUrl);
    } else {
      // We're running in a browser, use the default URL
      console.log('API client initialized with default URL:', DEFAULT_API_URL);
    }
  } catch (error) {
    console.error('Error initializing API client:', error);
  }
};

// Initialize the API client when this module is imported
initializeApiClient();

// Add a request interceptor to include the token in headers
apiClient.interceptors.request.use(
  async (config) => {
    // Check if token is valid, try to refresh if needed
    if (!isTokenValid()) {
      await refreshTokenIfNeeded();
    }

    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle global errors like 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      try {
        await logout(); // Use our centralized logout function
      } catch (logoutError) {
        // Fallback to basic redirect if logout fails
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Helper function for file uploads
export const uploadFile = async (endpoint: string, file: File, additionalData?: Record<string, any>) => {
  // Check if token is valid, try to refresh if needed
  if (!isTokenValid()) {
    await refreshTokenIfNeeded();
  }

  const formData = new FormData();
  formData.append('file', file); // Backend expects 'file' field

  // Add each field from additionalData as a separate form field
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      // Skip null or undefined values
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });
  }

  const token = localStorage.getItem('authToken');

  try {
    const response = await axios.post(`${apiClient.defaults.baseURL}${endpoint}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token && { 'Authorization': `Bearer ${token}` }), // Conditionally add Authorization header
      },
      // Add timeout and show upload progress
      timeout: 60000, // 60 seconds timeout
      onUploadProgress: (progressEvent) => {
        // Progress tracking can be handled by the component using this function
        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        // Event handling could be added here if needed
      }
    });

    return response.data;
  } catch (error: unknown) { // Explicitly type error as unknown
    // Handle unauthorized during upload
    if (error && typeof error === 'object' && 'isAxiosError' in error) {
      const axiosError = error as any;
      if (axiosError.response && axiosError.response.status === 401) {
        logout(); // Use our centralized logout function
      }

      // Log detailed error information
      if (axiosError.response) {
        console.error('Upload error response:', axiosError.response.status, axiosError.response.data);
      }
    }

    throw error; // Re-throw the error to be caught by the calling component
  }
};
