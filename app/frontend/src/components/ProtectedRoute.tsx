import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isTokenValid, refreshTokenIfNeeded } from '../utils/authUtils';

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Check if token exists and is valid
      if (isTokenValid()) {
        setIsAuthenticated(true);
      } else {
        // Try to refresh the token if it exists but is expired
        const refreshed = await refreshTokenIfNeeded();
        setIsAuthenticated(refreshed);
      }
      setIsChecking(false);
    };

    checkAuth();
  }, []);

  // Show nothing while checking authentication
  if (isChecking) {
    return null; // Or a loading spinner
  }

  // If not authenticated after checking, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the child components (or Outlet for nested routes)
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
