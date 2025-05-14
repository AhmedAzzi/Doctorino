import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import {
  FaUserFriends, FaCalendarCheck, FaMoneyBillWave,
  FaChartLine, FaUserClock, FaCheckCircle, FaTimesCircle,
  FaHourglassHalf, FaCalendarAlt, FaClock
} from 'react-icons/fa';
import apiClient from '../utils/api'; // Import the apiClient

// Define interfaces for the expected API response data
interface DashboardSummary {
  totalPatients: { count: number; change?: string }; // Assuming change is a string like "+20%"
  upcomingAppointments: { count: number; change?: string };
  monthlyRevenue: { amount: number; currency: string; change?: string };
}

interface ChartDataPoint {
  name: string; // e.g., 'January', 'Monday'
  value: number; // e.g., patient count, revenue amount
}

interface UpcomingAppointment {
  id: string;
  patientId: string;
  patientName: string;
  time: string;
  date: string;
  status: string;
  reason?: string;
}

const Dashboard: React.FC = () => {
  // State for dashboard data
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [patientsChartData, setPatientsChartData] = useState<ChartDataPoint[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<ChartDataPoint[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all data in parallel for better performance
        const [summaryRes, patientsRes, revenueRes, appointmentsRes] = await Promise.all([
          apiClient.get('/api/dashboard/summary'),
          apiClient.get('/api/dashboard/charts/patients'),
          apiClient.get('/api/dashboard/charts/revenue'),
          apiClient.get('/api/dashboard/upcoming-appointments')
        ]);

        // Set state with the fetched data
        setSummary(summaryRes.data as DashboardSummary);
        setPatientsChartData(patientsRes.data as ChartDataPoint[]);
        setRevenueChartData(revenueRes.data as ChartDataPoint[]);
        setUpcomingAppointments(appointmentsRes.data as UpcomingAppointment[]);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        <p className="ml-3 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="text-red-600 bg-red-100 p-6 rounded-lg shadow-sm border border-red-200 flex items-center">
        <FaTimesCircle className="h-6 w-6 mr-3" />
        <p>{error}</p>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Render dashboard content
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome to Your Dashboard</h1>
        <p className="opacity-90">Here's an overview of your practice at a glance.</p>
      </div>

      {/* Stats Cards - Use fetched data */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Patients Card */}
          <div className="bg-white rounded-xl shadow-md p-6 transition duration-300 hover:shadow-lg hover:scale-102 border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-gray-500 text-sm font-medium mb-1">Total Patients</h2>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">{summary.totalPatients.count}</span>
                  {summary.totalPatients.change && (
                    <span className={`ml-2 text-sm font-medium ${summary.totalPatients.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                      {summary.totalPatients.change}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-primary-100 p-3 rounded-full">
                <FaUserFriends className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link to="/app/patients" className="text-primary-600 text-sm font-medium hover:underline">
                View all patients →
              </Link>
            </div>
          </div>

          {/* Upcoming Appointments Card */}
          <div className="bg-white rounded-xl shadow-md p-6 transition duration-300 hover:shadow-lg hover:scale-102 border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-gray-500 text-sm font-medium mb-1">Upcoming Appointments</h2>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">{summary.upcomingAppointments.count}</span>
                  {summary.upcomingAppointments.change && (
                    <span className={`ml-2 text-sm font-medium ${summary.upcomingAppointments.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                      {summary.upcomingAppointments.change}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <FaCalendarCheck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link to="/app/appointments" className="text-blue-600 text-sm font-medium hover:underline">
                Manage appointments →
              </Link>
            </div>
          </div>

          {/* Revenue Card */}
          <div className="bg-white rounded-xl shadow-md p-6 transition duration-300 hover:shadow-lg hover:scale-102 border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-gray-500 text-sm font-medium mb-1">Revenue (Monthly)</h2>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">
                    {new Intl.NumberFormat('en-DZ', { style: 'currency', currency: summary.monthlyRevenue.currency || 'DZD' }).format(summary.monthlyRevenue.amount)}
                  </span>
                  {summary.monthlyRevenue.change && (
                    <span className={`ml-2 text-sm font-medium ${summary.monthlyRevenue.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                      {summary.monthlyRevenue.change}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <FaMoneyBillWave className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link to="/app/analytics" className="text-green-600 text-sm font-medium hover:underline">
                View analytics →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-8">
          {/* Patient Growth Chart */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Patient Growth</h2>
              <div className="bg-primary-50 p-2 rounded-full">
                <FaChartLine className="h-5 w-5 text-primary-600" />
              </div>
            </div>
            <div className="h-72">
              {patientsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={patientsChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4b67af" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#4b67af" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
                    <YAxis tick={{ fill: '#6b7280' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#4b67af"
                      fillOpacity={1}
                      fill="url(#colorPatients)"
                      name="Patients"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No patient data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Monthly Revenue</h2>
              <div className="bg-green-50 p-2 rounded-full">
                <FaMoneyBillWave className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="h-72">
              {revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
                    <YAxis tick={{ fill: '#6b7280' }} />
                    <Tooltip
                      formatter={(value) => [`${value.toLocaleString()} DZD`, 'Revenue']}
                      contentStyle={{
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar
                      dataKey="value"
                      name="Revenue"
                      fill="#4CAF50"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No revenue data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Upcoming Appointments */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Upcoming Appointments</h2>
              <Link
                to="/app/appointments"
                className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
              >
                View All
              </Link>
            </div>

            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appt) => (
                  <div key={appt.id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{appt.patientName}</h3>
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                          <FaCalendarAlt className="h-3 w-3 mr-1" />
                          <span>{formatDate(appt.date)}</span>
                          <span className="mx-2">•</span>
                          <FaClock className="h-3 w-3 mr-1" />
                          <span>{appt.time}</span>
                        </div>
                        {appt.reason && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-1">{appt.reason}</p>
                        )}
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${appt.status.toLowerCase() === 'confirmed' || appt.status.toLowerCase() === 'scheduled' ? 'bg-green-100 text-green-800' :
                            appt.status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                          }`}>
                          {appt.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Link
                        to={`/app/patients/${appt.patientId}`}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                      >
                        View Patient
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FaCalendarCheck className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">No upcoming appointments</p>
                <Link
                  to="/app/appointments"
                  className="mt-2 text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  Schedule an appointment
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
