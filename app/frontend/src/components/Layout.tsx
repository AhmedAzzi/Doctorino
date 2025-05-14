import { useTheme } from '@/context/ThemeContext';
import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom'; // Import useNavigate
import ModelLoadingIndicator from './ModelLoadingIndicator';
import { useModelLoading } from '../context/ModelLoadingContext';
import { logout } from '../utils/authUtils';

// Existing Icons (ensure they are defined above or imported)
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>;
const PatientsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1h12z" /></svg>;
const ReportsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>;
const AppointmentsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;
const ScheduleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>;
const AnalyticsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>;
const AIAssistIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1.5 11a1.5 1.5 0 11-3 0V9a1.5 1.5 0 013 0v4zm-3.5-6a1.5 1.5 0 110-3h3a1.5 1.5 0 110 3h-3z" clipRule="evenodd" /></svg>;
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>;

const Layout: React.FC = () => {
  const navigate = useNavigate(); // Hook for navigation
  const { isDarkMode } = useTheme(); // Get dark mode status
  const { startLoading, finishLoading } = useModelLoading(); // Access model loading context
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Get username from localStorage
    const storedUsername = localStorage.getItem('username');
    setUsername(storedUsername);

    // Check if models are already loaded
    const modelsLoaded = localStorage.getItem('modelsLoaded');

    // If models are not loaded yet, trigger loading
    if (modelsLoaded !== 'true') {
      startLoading();

      // Get the auth token
      const token = localStorage.getItem('authToken');
      if (token) {
        // Trigger model loading
        // In development, use relative URL for proxy; in production, use full URL
        const apiUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'https://doctorino-api.onrender.com');
        fetch(`${apiUrl}/api/auth/load-models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(response => response.json())
          .then(modelData => {
            console.log('Models loaded in Layout:', modelData);
            finishLoading(modelData); // Update the model loading context
          })
          .catch(err => {
            console.error('Error loading models in Layout:', err);
            localStorage.setItem('modelsLoaded', 'false');
          });
      }
    }
  }, [startLoading]);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout(); // This will handle everything including redirection
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback in case the logout function fails to redirect
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Helper to generate NavLink className
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-md text-base font-medium ${isActive
      ? isDarkMode
        ? 'bg-primary-900 text-primary-200' // Dark mode active
        : 'bg-blue-100 text-blue-700' // Light mode active
      : isDarkMode
        ? 'text-gray-300 hover:bg-gray-700 hover:text-white' // Dark mode inactive
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' // Light mode inactive
    }`;

  // Helper for the Logout button className (doesn't use isActive)
  const logoutButtonClass = isDarkMode
    ? 'flex items-center space-x-3 px-4 py-3 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white w-full text-left'
    : 'flex items-center space-x-3 px-4 py-3 rounded-md text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full text-left';


  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      {/* Sidebar */}

      <div className={`w-72 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col shadow-sm`}>
        <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {/* You might want a logo here */}
          {/* <h1 className="text-3xl font-bold text-primary-500">Doctorino</h1> */}
          <img
            src="../assets/logo.svg"
            alt="Logo"
            className='p-4 mx-auto'
            style={{ marginTop: '-20px', marginBottom: '-27px', paddingBottom: '15px' }}
          />

        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-4">
          {/* Use /app as base path for links */}
          <NavLink to="/app" className={getNavLinkClass} end>
            <DashboardIcon />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/app/patients" className={getNavLinkClass}>
            <PatientsIcon />
            <span>Patients</span>
          </NavLink>
          <NavLink to="/app/appointments" className={getNavLinkClass}>
            <AppointmentsIcon />
            <span>Appointments</span>
          </NavLink>
          <NavLink to="/app/medical-reports" className={getNavLinkClass}>
            <ReportsIcon />
            <span>Medical Reports</span>
          </NavLink>
          <NavLink to="/app/schedule" className={getNavLinkClass}>
            <ScheduleIcon />
            <span>Schedule</span>
          </NavLink>
          <NavLink to="/app/analytics" className={getNavLinkClass}>
            <AnalyticsIcon />
            <span>Analytics</span>
          </NavLink>
          <NavLink to="/app/ai_models" className={getNavLinkClass}>
            <AIAssistIcon />
            <span>AI Assistant</span>
          </NavLink>
        </nav>

        {/* Footer Navigation / Actions */}
        <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} py-6 px-4 space-y-3`}>
          <NavLink to="/app/profile" className={getNavLinkClass}>
            <ProfileIcon />
            <span>Profile</span>
          </NavLink>
          <NavLink to="/app/settings" className={getNavLinkClass}>
            <SettingsIcon />
            <span>Settings</span>
          </NavLink>
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={logoutButtonClass}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Logging out...</span>
              </>
            ) : (
              <>
                <LogoutIcon />
                <span>Logout</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Optional Header Bar */}
        {/* <header className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm p-4 border-b`}>Header Content</header> */}

        {/* Main content area */}
        <main className={`flex-1 overflow-y-auto p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <Outlet /> {/* Where the routed page component renders */}
        </main>
      </div>
    </div>
  );
};

export default Layout;
