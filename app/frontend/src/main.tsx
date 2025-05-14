import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import './styles/index.css';
import { ThemeProvider } from './context/ThemeContext';
import { ModelLoadingProvider } from './context/ModelLoadingContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ModelLoadingProvider>
        <RouterProvider router={router} />
      </ModelLoadingProvider>
    </ThemeProvider>
  </React.StrictMode>
);
