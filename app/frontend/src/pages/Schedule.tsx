import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  FaCalendarAlt, FaCalendarCheck, FaCalendarTimes, FaClock,
  FaUserClock, FaEdit, FaSave, FaTrash, FaExclamationTriangle,
  FaRegClock, FaHourglassHalf, FaToggleOn, FaToggleOff
} from 'react-icons/fa';

interface ScheduleDay {
  day: string;
  startTime?: string;
  endTime?: string;
  interval?: string;
  start_time?: string;
  end_time?: string;
}

const Schedule: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [interval, setInterval] = useState('15');
  const [scheduleData, setScheduleData] = useState<ScheduleDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('authToken'));

  const fetchSchedule = async () => {
    setIsLoading(true);
    setError(null);

    // Check if token exists
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error("No authentication token found");
      setError("You are not logged in. Please log in to view your schedule.");
      setIsLoading(false);
      return;
    }

    console.log("Auth token exists:", token.substring(0, 10) + "...");

    try {
      // Add authorization header explicitly for debugging
      const response = await api.get<ScheduleDay[]>('/api/schedule/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log("API response:", response.data); // Debug log

      const formattedData = response.data.map((item: any) => ({
        day: item.day,
        startTime: item.start_time, // Use start_time directly from backend
        endTime: item.end_time,     // Use end_time directly from backend
        interval: item.interval ? `${item.interval} min` : 'N/A' // Example formatting
      }));
      setScheduleData(formattedData);
    } catch (err: any) {
      console.error("Failed to fetch schedule:", err);

      // More detailed error message
      if (err.response) {
        console.error("Response status:", err.response.status);
        console.error("Response data:", err.response.data);

        if (err.response.status === 401) {
          setError("Authentication failed. Please log in again.");
          // Clear the invalid token
          localStorage.removeItem('authToken');
          setIsAuthenticated(false);
        } else {
          setError(`Error: ${err.response.data.detail || 'Failed to load schedule'}`);
        }
      } else {
        setError("Failed to connect to the server. Please try again later.");
      }

      setScheduleData([]); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleSaveChanges = async () => {
    // Check authentication first
    if (!isAuthenticated) {
      setError("You need to be logged in to update your schedule.");
      return;
    }

    if (!selectedDay) {
      alert('Please select a day to modify.');
      return;
    }

    if (parseInt(interval) < 5) {
      alert('Interval must be at least 5 minutes.');
      return;
    }

    // If start time equals end time, treat it as a day off (set both to null)
    const isDayOff = startTime === endTime || (startTime === '00:00' && endTime === '00:00');

    // Check if this day already has a schedule
    const existingDay = scheduleData.find(day => day.day === selectedDay);
    const isChangingToOff = isDayOff && existingDay && existingDay.startTime;

    // If changing from a working day to a day off, show confirmation dialog
    if (isChangingToOff) {
      const confirmMessage = `Setting ${selectedDay} as a day off will automatically cancel all future appointments scheduled for this day. Continue?`;
      if (!window.confirm(confirmMessage)) {
        return; // User canceled the operation
      }
    }

    const scheduleUpdate = {
      day: selectedDay,
      start_time: isDayOff ? null : startTime,
      end_time: isDayOff ? null : endTime,
      interval: parseInt(interval),
    };

    try {
      // Get the token for explicit authorization
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError("Authentication token missing. Please log in again.");
        setIsAuthenticated(false);
        return;
      }

      // Show loading state
      setIsLoading(true);

      // Using POST request to create/update the schedule with explicit token
      const response = await api.post(`/api/schedule/`, scheduleUpdate, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Display the response message which may include appointment cancellation info
      const responseMessage = (response.data as { message?: string }).message || 'Schedule updated successfully';
      console.log('Schedule update response:', response.data);
      alert(responseMessage);

      // Refetch schedule to show updated data
      fetchSchedule();

      // Clear the form
      setSelectedDay('');
      setStartTime('');
      setEndTime('');
      setInterval('15');
    } catch (err: any) {
      console.error('Error updating schedule:', err);

      if (err.response && err.response.status === 401) {
        setError("Authentication failed. Please log in again.");
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
      } else {
        const errorMessage = err.response?.data?.detail || 'Failed to update schedule. Please try again.';
        alert(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };


  // Helper function to generate time slots for preview
  const generateTimeSlots = (start: string, end: string, intervalMinutes: number): string[] => {
    if (!start || !end || !intervalMinutes) return [];

    const slots: string[] = [];
    const startTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);

    // Ensure valid times
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return [];
    }

    // Generate slots
    let currentTime = new Date(startTime);
    while (currentTime < endTime) {
      // Format the time as HH:MM
      const hours = currentTime.getHours().toString().padStart(2, '0');
      const minutes = currentTime.getMinutes().toString().padStart(2, '0');
      slots.push(`${hours}:${minutes}`);

      // Add interval minutes
      currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
    }

    return slots;
  };

  const handleLogin = () => {
    navigate('/');
  };

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-white p-3 rounded-full shadow-md mr-4">
              <FaCalendarAlt className="text-primary-600 text-xl" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Schedule Management</h1>
          </div>
          <div className="text-white text-sm md:text-base">
            <p className="opacity-90">Set your working hours and manage your availability</p>
          </div>
        </div>
      </div>

      {/* Authentication Error */}
      {!isAuthenticated && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-5 rounded-lg shadow-md flex items-start" role="alert">
          <FaExclamationTriangle className="text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-grow">
            <p className="font-medium text-yellow-700 mb-2">Authentication Required</p>
            <p className="text-yellow-600 mb-3">You need to be logged in to view and manage your schedule.</p>
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-150 flex items-center gap-2"
            >
              <FaUserClock />
              Go to Login
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-lg shadow-md flex items-start" role="alert">
          <FaExclamationTriangle className="text-red-500 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-grow">
            <p className="font-medium text-red-700 mb-2">Error</p>
            <p className="text-red-600 mb-3">{error}</p>
            {error.includes("Authentication failed") && (
              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-150 flex items-center gap-2"
              >
                <FaUserClock />
                Go to Login
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex flex-col justify-center items-center py-12 bg-white rounded-xl shadow">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading schedule data...</p>
        </div>
      )}

      {/* Current Schedule */}
      {!isLoading && isAuthenticated && !error && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-lg">
          <div className="p-5 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center">
              <FaCalendarCheck className="text-primary-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-800">Your Weekly Schedule</h2>
            </div>
          </div>

          {scheduleData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 p-5">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(dayName => {
                const dayData = scheduleData.find(d => d.day === dayName);
                const isDayOff = !dayData?.startTime;

                return (
                  <div
                    key={dayName}
                    className={`rounded-lg border p-4 transition-all duration-200 ${isDayOff
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-white border-primary-100 shadow-sm'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium text-gray-800">{dayName}</h3>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${isDayOff
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        {isDayOff ? 'Day Off' : 'Working'}
                      </div>
                    </div>

                    {isDayOff ? (
                      <div className="flex items-center justify-center h-16 text-gray-400">
                        <FaCalendarTimes className="mr-2" />
                        <span>Not Available</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center text-gray-700">
                          <FaRegClock className="text-primary-500 mr-2" />
                          <span className="text-sm">
                            {dayData?.startTime} - {dayData?.endTime}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-700">
                          <FaHourglassHalf className="text-primary-500 mr-2" />
                          <span className="text-sm">
                            {dayData?.interval} between appointments
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      className="mt-3 w-full py-1.5 px-2 text-xs font-medium rounded border border-gray-300
                        text-gray-600 hover:bg-gray-50 transition-colors duration-150 flex items-center justify-center"
                      onClick={() => {
                        setSelectedDay(dayName);
                        if (dayData) {
                          setStartTime(dayData.startTime || '');
                          setEndTime(dayData.endTime || '');
                          setInterval(dayData.interval?.replace(' min', '') || '15');
                        }
                        // Scroll to the modify section
                        document.getElementById('modify-schedule')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <FaEdit className="mr-1" />
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="bg-gray-50 p-6 rounded-full mb-4">
                <FaCalendarAlt className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-gray-700 font-medium text-lg">No schedule data available</p>
              <p className="text-gray-500 mt-1 max-w-md">
                Set up your working hours below to start managing your availability.
              </p>
            </div>
          )}
        </div>
      )}

      {isAuthenticated && !error && (
        <div id="modify-schedule" className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-lg">
          <div className="p-5 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center">
              <FaEdit className="text-primary-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-800">Modify Schedule</h2>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Day Selection */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Day to Modify</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const isSelected = selectedDay === day;
                  const dayData = scheduleData.find(d => d.day === day);
                  const isDayOff = !dayData?.startTime;

                  return (
                    <button
                      key={day}
                      type="button"
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex flex-col items-center justify-center ${isSelected
                        ? 'bg-primary-100 text-primary-800 border border-primary-300 shadow-sm'
                        : isDayOff
                          ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                        }`}
                      onClick={() => {
                        setSelectedDay(day);
                        if (dayData) {
                          setStartTime(dayData.startTime || '');
                          setEndTime(dayData.endTime || '');
                          setInterval(dayData.interval?.replace(' min', '') || '15');
                        } else {
                          // Default values for a new day
                          setStartTime('09:00');
                          setEndTime('17:00');
                          setInterval('15');
                        }
                      }}
                    >
                      <span>{day.substring(0, 3)}</span>
                      {isDayOff ? (
                        <span className="text-xs mt-1 text-red-500">Off</span>
                      ) : dayData ? (
                        <span className="text-xs mt-1 text-green-500">Set</span>
                      ) : (
                        <span className="text-xs mt-1 text-gray-400">Not Set</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDay && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-800">
                    {selectedDay} Schedule
                  </h3>

                  {/* Day Off Toggle */}
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">Day Off</span>
                    <button
                      type="button"
                      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 focus:outline-none ${startTime === '' || endTime === '' || startTime === endTime || (startTime === '00:00' && endTime === '00:00')
                        ? 'bg-red-500'
                        : 'bg-gray-300'
                        }`}
                      onClick={() => {
                        // Toggle day off status
                        if (startTime === '' || endTime === '' || startTime === endTime || (startTime === '00:00' && endTime === '00:00')) {
                          // Currently day off, change to working day with default hours
                          setStartTime('09:00');
                          setEndTime('17:00');
                        } else {
                          // Currently working day, change to day off
                          const existingDay = scheduleData.find(day => day.day === selectedDay);
                          const isChangingToOff = existingDay && existingDay.startTime;

                          if (isChangingToOff) {
                            const confirmMessage = `Setting ${selectedDay} as a day off will automatically cancel all future appointments scheduled for this day. Continue?`;
                            if (window.confirm(confirmMessage)) {
                              setStartTime('');
                              setEndTime('');
                            }
                          } else {
                            setStartTime('');
                            setEndTime('');
                          }
                        }
                      }}
                    >
                      <span
                        className={`inline-block w-5 h-5 bg-white rounded-full transform transition-transform duration-200 ${startTime === '' || endTime === '' || startTime === endTime || (startTime === '00:00' && endTime === '00:00')
                          ? 'translate-x-6'
                          : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Working Hours Section - Only show if not a day off */}
                {!(startTime === '' || endTime === '' || startTime === endTime || (startTime === '00:00' && endTime === '00:00')) && (
                  <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <div>
                        <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaClock className="text-gray-400" />
                          </div>
                          <input
                            id="start-time"
                            type="time"
                            className="w-full pl-10 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaClock className="text-gray-400" />
                          </div>
                          <input
                            id="end-time"
                            type="time"
                            className="w-full pl-10 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="interval" className="block text-sm font-medium text-gray-700 mb-2">Appointment Duration (minutes)</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaHourglassHalf className="text-gray-400" />
                          </div>
                          <select
                            id="interval"
                            className="w-full pl-10 px-4 py-2.5 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 pr-10"
                            value={interval}
                            onChange={(e) => setInterval(e.target.value)}
                          >
                            <option value="5">5 minutes</option>
                            <option value="10">10 minutes</option>
                            <option value="15">15 minutes</option>
                            <option value="20">20 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="45">45 minutes</option>
                            <option value="60">60 minutes</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Working Hours Preview */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Appointment Slots Preview</h4>
                      <div className="flex flex-wrap gap-2">
                        {startTime && endTime && interval && generateTimeSlots(startTime, endTime, parseInt(interval)).map((slot, index) => (
                          <div key={index} className="px-3 py-1 bg-white text-xs font-medium rounded-full border border-gray-200 text-gray-700">
                            {slot}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Day Off Message - Only show if it's a day off */}
                {(startTime === '' || endTime === '' || startTime === endTime || (startTime === '00:00' && endTime === '00:00')) && (
                  <div className="bg-red-50 rounded-lg border border-red-200 p-5">
                    <div className="flex items-start">
                      <FaCalendarTimes className="text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-red-800 font-medium">Day Off Selected</h4>
                        <p className="text-red-600 text-sm mt-1">
                          {selectedDay} is set as a day off. You will not be available for appointments on this day.
                          {scheduleData.find(day => day.day === selectedDay)?.startTime &&
                            " Note: Changing this to a day off will cancel all future appointments on this day."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-150 flex items-center gap-2"
                    onClick={() => {
                      setSelectedDay('');
                      setStartTime('');
                      setEndTime('');
                      setInterval('15');
                    }}
                  >
                    <FaTrash className="text-gray-500" />
                    Cancel
                  </button>
                  <button
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150 flex items-center gap-2"
                    onClick={handleSaveChanges}
                    disabled={isLoading || !selectedDay}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {!selectedDay && (
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-5">
                <div className="flex items-start">
                  <FaCalendarAlt className="text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-blue-800 font-medium">Select a Day</h4>
                    <p className="text-blue-600 text-sm mt-1">
                      Please select a day from the options above to modify your schedule.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )} {/* End of isAuthenticated conditional and Modify Schedule div */}
    </div>
  );
};

export default Schedule;
