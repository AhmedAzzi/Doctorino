import React, { useEffect, useState } from 'react';
import { useModelLoading } from '../context/ModelLoadingContext';

interface ModelLoadingIndicatorProps {
  speciality?: string;
}

const ModelLoadingIndicator: React.FC<ModelLoadingIndicatorProps> = ({ speciality }) => {
  const { isLoading, isLoaded, modelStatus } = useModelLoading();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // Effect to handle auto-hiding messages
  useEffect(() => {
    if (!isLoading && isLoaded && modelStatus) {
      if (modelStatus.status === 'success') {
        setShowSuccess(true);

        // Auto-hide success message after 4 seconds
        const successTimer = setTimeout(() => {
          setShowSuccess(false);
        }, 4000);

        return () => clearTimeout(successTimer);
      }
      else if (modelStatus.status === 'warning') {
        setShowWarning(true);

        // Auto-hide warning message after 5 seconds
        const warningTimer = setTimeout(() => {
          setShowWarning(false);
        }, 5000);

        return () => clearTimeout(warningTimer);
      }
    }
  }, [isLoading, isLoaded, modelStatus]);

  if (!isLoading && !isLoaded) {
    return null; // Don't show anything if not loading and not loaded
  }

  // Don't show messages if they've been hidden
  if (!isLoading && isLoaded &&
    ((modelStatus?.status === 'success' && !showSuccess) ||
      (modelStatus?.status === 'warning' && !showWarning))) {
    return null;
  }

  // Determine which model is relevant based on speciality
  // This could be refactored to use a configuration object or API response
  // instead of hardcoding specialitys
  const modelTypeMap: Record<string, string> = {
    'Mammography': 'Mammography',
    'Cardiologist': 'ECG'
  };

  const modelType = modelTypeMap[speciality || ''] || 'AI';

  const handleCloseSuccess = () => {
    setShowSuccess(false);
  };

  const handleCloseWarning = () => {
    setShowWarning(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isLoading && (
        <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center animate-fadeIn transition-all duration-300 transform hover:scale-102">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading {modelType} models...</span>
        </div>
      )}

      {!isLoading && isLoaded && modelStatus && modelStatus.status === 'success' && showSuccess && (
        <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between opacity-90 hover:opacity-100 transition-all duration-300 animate-fadeIn min-w-[250px]">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>{modelStatus.message}</span>
          </div>
          <button
            onClick={handleCloseSuccess}
            className="ml-3 text-white hover:text-gray-200 focus:outline-none"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      )}

      {!isLoading && isLoaded && modelStatus && modelStatus.status === 'warning' && showWarning && (
        <div className="bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between transition-all duration-300 animate-fadeIn min-w-[250px]">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>{modelStatus.message}</span>
          </div>
          <button
            onClick={handleCloseWarning}
            className="ml-3 text-white hover:text-gray-200 focus:outline-none"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ModelLoadingIndicator;
