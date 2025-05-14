import { useTheme } from '@/context/ThemeContext';
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faUndo,
  faCheck,
  faBell,
  faPalette,
  faGlobe,
  faShieldAlt,
  faSpinner,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Settings data
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      sms: false,
      appointment: true,
      marketing: false,
    },
    appearance: {
      theme: theme, // Use the theme from context
      compactMode: false,
    },
    preferences: {
      language: 'English',
      timeFormat: '24h',
      dateFormat: 'MM/DD/YYYY',
      currency: 'DZD',
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: '30',
    }
  });

  // Fetch settings from API on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Function to fetch settings from API
  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await apiClient.get('/api/settings/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = response.data;

      // Update settings with data from API
      setSettings({
        ...data,
        appearance: {
          ...data.appearance,
          theme: data.appearance.theme || theme // Fallback to context theme if not set
        }
      });
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handler for toggling checkboxes
  const handleToggle = (category: string, setting: string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: !prev[category as keyof typeof prev][setting as keyof typeof prev[keyof typeof prev]]
      }
    }));
  };

  // Handler for changing select/input values
  const handleChange = (category: string, setting: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value
      }
    }));
  };

  // Save all settings
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Update theme context with the selected theme
      setTheme(settings.appearance.theme as 'light' | 'dark' | 'system');

      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        setSaving(false);
        return;
      }

      // Send settings to backend
      const response = await apiClient.put('/api/settings/', settings, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Response is handled by axios

      // Show success message
      setSuccessMessage('Settings saved successfully!');

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Reset settings to defaults
  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all settings to default values?')) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        setSaving(false);
        return;
      }

      // Reset settings on backend
      const response = await apiClient.post('/api/settings/reset', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Get default settings from response
      const defaultSettings = response.data;

      // Update local settings
      setSettings(defaultSettings);

      // Update theme context
      setTheme(defaultSettings.appearance.theme as 'light' | 'dark' | 'system');

      // Show success message
      setSuccessMessage('Settings reset to defaults!');

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

    } catch (err) {
      console.error('Failed to reset settings:', err);
      setError('Failed to reset settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className={`text-2xl font-bold ${settings.appearance.theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
          <FontAwesomeIcon icon={faGlobe} className="mr-2 text-primary-500" />
          Settings
        </h1>

        <div className="flex space-x-3">
          <button
            className="btn btn-outline-secondary flex items-center"
            onClick={handleReset}
            disabled={loading || saving}
          >
            <FontAwesomeIcon icon={faUndo} className="mr-2" />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="bg-blue-50 text-blue-700 p-4 rounded-md flex items-center">
          <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
          Loading your settings...
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
          {error}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="bg-green-50 text-green-700 p-4 rounded-md flex items-center">
          <FontAwesomeIcon icon={faCheck} className="mr-2" />
          {successMessage}
        </div>
      )}

      {/* Notifications Settings */}
      <div className={`${settings.appearance.theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'} rounded-md shadow p-6`}>
        <h2 className={`text-lg font-semibold ${settings.appearance.theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-4 flex items-center`}>
          <FontAwesomeIcon icon={faBell} className="mr-2 text-primary-500" />
          Notifications
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Email Notifications</h3>
              <p className="text-sm text-gray-500">Receive email notifications for important updates</p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.notifications.email ? 'bg-primary-600' : 'bg-gray-200'}`}
                onClick={() => handleToggle('notifications', 'email')}
              >
                <span className="sr-only">Toggle email notifications</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.notifications.email ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700">SMS Notifications</h3>
              <p className="text-sm text-gray-500">Receive text message notifications</p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.notifications.sms ? 'bg-primary-600' : 'bg-gray-200'}`}
                onClick={() => handleToggle('notifications', 'sms')}
              >
                <span className="sr-only">Toggle SMS notifications</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.notifications.sms ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Appointment Reminders</h3>
              <p className="text-sm text-gray-500">Get reminders about upcoming appointments</p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.notifications.appointment ? 'bg-primary-600' : 'bg-gray-200'}`}
                onClick={() => handleToggle('notifications', 'appointment')}
              >
                <span className="sr-only">Toggle appointment reminders</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.notifications.appointment ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>


        </div>
      </div>

      {/* Appearance Settings */}
      <div className={`${settings.appearance.theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'} rounded-md shadow p-6`}>
        <h2 className={`text-lg font-semibold ${settings.appearance.theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-4 flex items-center`}>
          <FontAwesomeIcon icon={faPalette} className="mr-2 text-primary-500" />
          Appearance
        </h2>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${settings.appearance.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Theme</label>
            <select
              className={`w-full sm:w-64 px-3 py-2 border ${settings.appearance.theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
              value={settings.appearance.theme}
              onChange={(e) => handleChange('appearance', 'theme', e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System Default</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium ${settings.appearance.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Compact Mode</h3>
              <p className={`text-sm ${settings.appearance.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Use a more space-efficient layout</p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.appearance.compactMode ? 'bg-primary-600' : 'bg-gray-200'}`}
                onClick={() => handleToggle('appearance', 'compactMode')}
              >
                <span className="sr-only">Toggle compact mode</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.appearance.compactMode ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Settings */}
      <div className={`${settings.appearance.theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'} rounded-md shadow p-6`}>
        <h2 className={`text-lg font-semibold ${settings.appearance.theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-4 flex items-center`}>
          <FontAwesomeIcon icon={faGlobe} className="mr-2 text-primary-500" />
          Preferences
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium ${settings.appearance.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Language</label>
            <select
              className={`w-full px-3 py-2 border ${settings.appearance.theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
              value={settings.preferences.language}
              onChange={(e) => handleChange('preferences', 'language', e.target.value)}
            >
              <option value="English">English</option>
              <option value="French">French</option>
              <option value="Arabic">Arabic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={settings.preferences.timeFormat}
              onChange={(e) => handleChange('preferences', 'timeFormat', e.target.value)}
            >
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={settings.preferences.dateFormat}
              onChange={(e) => handleChange('preferences', 'dateFormat', e.target.value)}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={settings.preferences.currency}
              onChange={(e) => handleChange('preferences', 'currency', e.target.value)}
            >
              <option value="DZD">Algerian Dinar (DZD)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className={`${settings.appearance.theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'} rounded-md shadow p-6`}>
        <h2 className={`text-lg font-semibold ${settings.appearance.theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-4 flex items-center`}>
          <FontAwesomeIcon icon={faShieldAlt} className="mr-2 text-primary-500" />
          Security
        </h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium ${settings.appearance.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Two-Factor Authentication</h3>
              <p className={`text-sm ${settings.appearance.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Add an extra layer of security to your account</p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.security.twoFactorAuth ? 'bg-primary-600' : 'bg-gray-200'}`}
                onClick={() => handleToggle('security', 'twoFactorAuth')}
              >
                <span className="sr-only">Toggle two-factor authentication</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.security.twoFactorAuth ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${settings.appearance.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Session Timeout (minutes)</label>
            <select
              className={`w-full sm:w-64 px-3 py-2 border ${settings.appearance.theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
              value={settings.security.sessionTimeout}
              onChange={(e) => handleChange('security', 'sessionTimeout', e.target.value)}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="240">4 hours</option>
            </select>
            <p className={`mt-1 text-sm ${settings.appearance.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Time before you're automatically logged out due to inactivity</p>
          </div>

          <div>
            <button className="btn btn-primary flex items-center">
              <FontAwesomeIcon icon={faShieldAlt} className="mr-2" />
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          className="btn btn-primary flex items-center px-6 py-3 text-base"
          onClick={handleSave}
          disabled={loading || saving}
        >
          {saving ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faSave} className="mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Settings;