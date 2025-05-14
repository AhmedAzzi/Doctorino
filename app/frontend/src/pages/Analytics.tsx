import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import apiClient from '../utils/api';

// Define types for our analytics data
interface PatientData {
  name: string;
  count: number;
}

interface RevenueData {
  name: string;
  revenue: number;
}

interface AppointmentStatusData {
  name: string;
  value: number;
}

interface AppointmentTimeData {
  name: string;
  count: number;
}

interface AnalyticsData {
  monthly_patients: PatientData[];
  revenue: RevenueData[];
  appointment_status: AppointmentStatusData[];
  appointment_time: AppointmentTimeData[];
}

// Default colors for pie chart
const COLORS = ['#4CAF50', '#FFC107', '#F44336'];

const Analytics: React.FC = () => {
  const [patientTimeFrame, setPatientTimeFrame] = useState('yearly');

  // State for analytics data
  const [monthlyPatientData, setMonthlyPatientData] = useState<PatientData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [appointmentStatusData, setAppointmentStatusData] = useState<AppointmentStatusData[]>([]);
  const [appointmentTimeData, setAppointmentTimeData] = useState<AppointmentTimeData[]>([]);

  // State for loading and error
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);



  // Function to fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Pass the selected time frame to the backend
      const response = await apiClient.get<AnalyticsData>(
        `/api/analytics/dashboard-data?time_frame=${patientTimeFrame}`
      );

      // Update state with the fetched data
      setMonthlyPatientData(response.data.monthly_patients || []);
      setRevenueData(response.data.revenue || []);
      setAppointmentStatusData(response.data.appointment_status || []);
      setAppointmentTimeData(response.data.appointment_time || []);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics data from the backend on component mount and when time frame changes
  useEffect(() => {
    fetchAnalyticsData();
  }, [patientTimeFrame]);

  // Handle the map function for appointment status cells with proper typing
  const renderAppointmentStatusCells = () => {
    return displayAppointmentStatusData.map((_, index) => {
      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
    });
  };

  // Check if we have data to display
  const hasData = monthlyPatientData.length > 0 ||
    revenueData.length > 0 ||
    appointmentStatusData.length > 0 ||
    appointmentTimeData.length > 0;

  // Use only real data from the backend
  const displayPatientData = monthlyPatientData;
  const displayRevenueData = revenueData;
  const displayAppointmentStatusData = appointmentStatusData;
  const displayAppointmentTimeData = appointmentTimeData;

  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">


      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {!hasData && !loading && !error && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4" role="alert">
          <div>
            <strong className="font-bold">No Data Available!</strong>
            <span className="block sm:inline"> No analytics data found. You need to add patients and appointments to see analytics data.</span>
          </div>
        </div>
      )}

      {/* Patients Analytics */}
      <div className="bg-white rounded-md shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Patient Analytics</h2>
          <div className="flex space-x-4">
            <button
              className={`text-sm font-medium ${patientTimeFrame === 'monthly' ? 'text-primary-600' : 'text-gray-500'}`}
              onClick={() => setPatientTimeFrame('monthly')}
            >
              Monthly
            </button>
            <button
              className={`text-sm font-medium ${patientTimeFrame === 'yearly' ? 'text-primary-600' : 'text-gray-500'}`}
              onClick={() => setPatientTimeFrame('yearly')}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="h-80">
          {displayPatientData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={displayPatientData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  fill="url(#colorPatients)"
                  name="Patients"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No patient data available for this time period</p>
            </div>
          )}
        </div>
      </div>

      {/* Revenue Analytics */}
      <div className="bg-white rounded-md shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Revenue Analytics</h2>
          <div className="flex space-x-4">
            <button
              className={`text-sm font-medium ${patientTimeFrame === 'monthly' ? 'text-primary-600' : 'text-gray-500'}`}
              onClick={() => setPatientTimeFrame('monthly')}
            >
              Monthly
            </button>
            <button
              className={`text-sm font-medium ${patientTimeFrame === 'yearly' ? 'text-primary-600' : 'text-gray-500'}`}
              onClick={() => setPatientTimeFrame('yearly')}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="h-80">
          {displayRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayRevenueData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value.toLocaleString()} DZD`, 'Revenue']} />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="#4CAF50"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No revenue data available for this time period</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Status */}
        <div className="bg-white rounded-md shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Appointment Status</h2>

          <div className="h-72 flex items-center justify-center">
            {displayAppointmentStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayAppointmentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => {
                      // Calculate the total value of all segments
                      const total = displayAppointmentStatusData.reduce((sum, item) => sum + item.value, 0);
                      // Calculate the actual percentage based on the value and total
                      const actualPercent = total > 0 ? (value / total * 100).toFixed(0) : '0';

                      return `${name}: ${actualPercent}%`;
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {renderAppointmentStatusCells()}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500">No appointment status data available</p>
            )}
          </div>
        </div>

        {/* Appointment Time Distribution */}
        <div className="bg-white rounded-md shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Appointment Time Distribution</h2>

          <div className="h-72">
            {displayAppointmentTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={displayAppointmentTimeData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" name="Appointments" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No appointment time data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
