import React, { createContext, useContext, useState, useEffect } from 'react';

interface ModelLoadingContextType {
  isLoading: boolean;
  isLoaded: boolean;
  modelStatus: any;
  startLoading: () => void;
  finishLoading: (status: any) => void;
}

const ModelLoadingContext = createContext<ModelLoadingContextType>({
  isLoading: false,
  isLoaded: false,
  modelStatus: null,
  startLoading: () => {},
  finishLoading: () => {},
});

export const useModelLoading = () => useContext(ModelLoadingContext);

interface ModelLoadingProviderProps {
  children: React.ReactNode;
}

export const ModelLoadingProvider: React.FC<ModelLoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [modelStatus, setModelStatus] = useState<any>(null);

  // Check if models were already loaded on mount
  useEffect(() => {
    const modelsLoaded = localStorage.getItem('modelsLoaded');
    const modelLoadingStatus = localStorage.getItem('modelLoadingStatus');
    
    if (modelsLoaded === 'true') {
      setIsLoaded(true);
      setIsLoading(false);
      if (modelLoadingStatus) {
        try {
          setModelStatus(JSON.parse(modelLoadingStatus));
        } catch (e) {
          console.error('Error parsing model loading status:', e);
        }
      }
    }
  }, []);

  const startLoading = () => {
    setIsLoading(true);
    setIsLoaded(false);
  };

  const finishLoading = (status: any) => {
    setModelStatus(status);
    setIsLoading(false);
    setIsLoaded(true);
    
    // Store in localStorage for persistence
    localStorage.setItem('modelsLoaded', 'true');
    localStorage.setItem('modelLoadingStatus', JSON.stringify(status));
  };

  return (
    <ModelLoadingContext.Provider
      value={{
        isLoading,
        isLoaded,
        modelStatus,
        startLoading,
        finishLoading,
      }}
    >
      {children}
    </ModelLoadingContext.Provider>
  );
};
