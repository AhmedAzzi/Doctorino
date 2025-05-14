/**
 * Shared configuration between frontend and backend
 */

// Default API port
const DEFAULT_API_PORT = 34664;

// Application name
const APP_NAME = 'Doctorino';

// File upload limits
const MAX_FILE_SIZE_MB = 50;
const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  MEDICAL: ['application/dicom'],
  ECG: ['text/csv', 'application/json'],
};

// Export for CommonJS (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_API_PORT,
    APP_NAME,
    MAX_FILE_SIZE_MB,
    ALLOWED_FILE_TYPES,
  };
}

// Export for ES modules (browser)
if (typeof window !== 'undefined') {
  window.AppConfig = {
    DEFAULT_API_PORT,
    APP_NAME,
    MAX_FILE_SIZE_MB,
    ALLOWED_FILE_TYPES,
  };
}
