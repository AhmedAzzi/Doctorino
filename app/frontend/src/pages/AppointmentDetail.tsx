import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';
import {
  FaUser, FaCalendarAlt, FaClock, FaClipboardList, FaArrowLeft,
  FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaUserPlus,
  FaFileMedical, FaMobile, FaUserMd, FaIdCard, FaEnvelope, FaPhone, FaVenusMars
} from 'react-icons/fa';

// Interface for the expected user data structure from /api/auth/doctors/me/
interface UserData {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  is_doctor?: boolean; // Assuming backend provides this field
  // Add other fields as needed
}

interface AppointmentData {
  id: string;
  patient_id: string;
  patient_name: string;
  date: string;
  time: string;
  status: string;
  reason: string;
  created_by_mobile: boolean; // Added
  patient_linked_to_doctor: boolean; // Added
  patient_details?: {
    id: string; // Added
    name: string; // Added (can be same as patient_name)
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    gender: string;
  };
  // Add doctor details if needed from backend response
  doctor_id?: string;
  doctor_name?: string;
}

// Interface for the link patient API response
interface LinkPatientResponse {
  message: string;
}


const AppointmentDetail: React.FC = () => {
  // Removed useContext usage
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null); // State for current user
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [linkingPatient, setLinkingPatient] = useState(false); // State for linking action
  const [linkError, setLinkError] = useState<string | null>(null); // State for linking error
  const isDoctor = currentUser?.is_doctor ?? false; // Determine role from fetched user data

  const fetchAppointmentData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both appointment and user details concurrently
      const [appointmentResponse, userResponse] = await Promise.all([
        apiClient.get<AppointmentData>(`/api/appointments/${id}`),
        apiClient.get<UserData>('/api/auth/doctors/me/') // Fetch current user
      ]);

      // Log detailed information for debugging
      console.log('Appointment data:', appointmentResponse.data);
      console.log('Patient linked to doctor:', appointmentResponse.data.patient_linked_to_doctor);
      console.log('Created by mobile:', appointmentResponse.data.created_by_mobile);
      console.log('Current user is doctor:', userResponse.data.is_doctor);

      // Show a small notification instead of an alert
      console.log(`Debug Info:
Patient ID: ${appointmentResponse.data.patient_id}
Patient linked: ${appointmentResponse.data.patient_linked_to_doctor ? 'Yes' : 'No'}
Mobile app: ${appointmentResponse.data.created_by_mobile ? 'Yes' : 'No'}
You are a doctor: ${userResponse.data.is_doctor ? 'Yes' : 'No'}`);

      setAppointment(appointmentResponse.data);
      setCurrentUser(userResponse.data);
    } catch (err: any) {
      // Handle potential combined errors or individual errors
      let errorMessage = 'Failed to fetch data.';
      if (err.response) {
        // Try to get specific error detail
        errorMessage = err.response.data?.detail || `Error ${err.response.status}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error('Error fetching data:', err);
      // Clear potentially partially set state
      setAppointment(null);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointmentData();
  }, [id]);

  // Removed fetchAppointmentDetails as logic is now in useEffect

  const handleStatusChange = async (newStatus: string) => {
    if (!appointment) return;

    try {
      setStatusUpdating(true);
      await apiClient.put(`/api/appointments/${id}`, null, {
        params: { status: newStatus }
      });
      setAppointment({ ...appointment, status: newStatus });
    } catch (err) {
      console.error('Error updating appointment status:', err);
      alert('Failed to update appointment status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleLinkPatient = async () => {

    setLinkingPatient(true);
    setLinkError(null);

    console.log('Linking patient:', appointment?.patient_id);
    console.log('Current doctor:', currentUser?.id);
    console.log('Patient is from mobile app:', appointment?.created_by_mobile);
    console.log('Patient is already linked:', appointment?.patient_linked_to_doctor);

    try {
      // Apply the response type here
      const response = await apiClient.post<LinkPatientResponse>(`/api/appointments/link-patient/${appointment?.patient_id}`);

      console.log('Link patient response:', response.data);

      // Refetch the appointment data to get updated information
      const appointmentResponse = await apiClient.get<AppointmentData>(`/api/appointments/${id}`);
      setAppointment(appointmentResponse.data);

      // Show success message
      alert(response.data.message || 'Patient linked successfully!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to link patient.';
      console.error('Error linking patient:', err);
      setLinkError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setLinkingPatient(false);
    }
  };


  const handleDeleteAppointment = async () => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      await apiClient.delete(`/api/appointments/${id}`);
      navigate('/appointments');
    } catch (err) {
      console.error('Error deleting appointment:', err);
      alert('Failed to delete appointment');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-12 bg-white rounded-xl shadow">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600 font-medium">Loading appointment details...</p>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md" role="alert">
        <div className="flex items-center">
          <div className="py-1">
            <svg className="h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-bold">Error</p>
            <p className="text-sm">{error || 'Appointment not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <Link to="/app/appointments" className="bg-white p-2 rounded-full shadow-md mr-4 flex items-center justify-center hover:bg-gray-100 transition-colors">
              <FaArrowLeft className="text-primary-600 text-lg" />
            </Link>
            <div className="flex items-center">
              <div className="bg-white p-3 rounded-full shadow-md mr-4">
                <FaCalendarAlt className="text-primary-600 text-xl" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Appointment Details</h1>
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${appointment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'Canceled' ? 'bg-red-100 text-red-800' :
                      appointment.status === 'Confirmed' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                    {appointment.status === 'Completed' ? <FaCheckCircle className="mr-1" /> :
                      appointment.status === 'Canceled' ? <FaTimesCircle className="mr-1" /> :
                        appointment.status === 'Confirmed' ? <FaCheckCircle className="mr-1" /> :
                          <FaHourglassHalf className="mr-1" />
                    }
                    {appointment.status}
                  </span>
                  <span className="mx-2 text-gray-300">•</span>
                  <span className="text-gray-200 text-sm">{appointment.date} at {appointment.time}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDeleteAppointment}
              className="btn bg-red-600 hover:bg-red-700 text-white flex items-center"
            >
              <FaTimesCircle className="mr-2" />
              Delete Appointment
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Information */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
          <div className="bg-gradient-to-r from-secondary-600 to-secondary-800 p-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="bg-white p-3 rounded-full shadow-md mr-3">
                <FaUser className="text-secondary-600 text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Client Information</h2>
                <p className="text-secondary-100 text-sm">{appointment.patient_name}</p>
              </div>
              {appointment.created_by_mobile && (
                <div className="ml-auto bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                  <FaMobile className="mr-1" />
                  Mobile User
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* Patient Avatar and Status */}
            <div className="flex flex-col sm:flex-row items-center mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="bg-secondary-100 rounded-full p-6 mb-4 sm:mb-0 sm:mr-6 flex items-center justify-center">
                <FaUser className="text-secondary-600 text-4xl" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-xl font-bold text-gray-800">{appointment.patient_name}</h3>
                <div className="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                  {appointment.patient_linked_to_doctor ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <FaCheckCircle className="mr-1" />
                      Linked to Doctor
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <FaUserMd className="mr-1" />
                      Not Linked
                    </span>
                  )}
                  {appointment.created_by_mobile && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <FaMobile className="mr-1" />
                      Mobile App User
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Patient Details */}
            <div className="space-y-6">
              {appointment.patient_details ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <FaIdCard className="text-gray-500 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">First Name</p>
                      <p className="font-medium">{appointment.patient_details.firstName || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <FaIdCard className="text-gray-500 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Last Name</p>
                      <p className="font-medium">{appointment.patient_details.lastName || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <FaEnvelope className="text-gray-500 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium">{appointment.patient_details.email || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <FaPhone className="text-gray-500 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium">{appointment.patient_details.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <FaVenusMars className="text-gray-500 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Gender</p>
                      <p className="font-medium">{appointment.patient_details.gender || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Patient details not available or permission denied.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                {appointment.patient_id && (
                  <Link
                    to={`/app/patients/${appointment.patient_id}`}
                    className={`btn flex items-center justify-center ${!appointment.patient_details
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    aria-disabled={!appointment.patient_details}
                    onClick={(e) => !appointment.patient_details && e.preventDefault()}
                  >
                    <FaUser className="mr-2" />
                    View Client Profile
                  </Link>
                )}

                <button
                  onClick={handleLinkPatient}
                  className={`btn flex items-center justify-center ${linkingPatient ? 'bg-gray-400' :
                    appointment.patient_linked_to_doctor ? 'bg-green-600 hover:bg-green-700' :
                      appointment.created_by_mobile ? 'bg-purple-600 hover:bg-purple-700 animate-pulse' :
                        'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                  disabled={linkingPatient}
                >
                  {linkingPatient ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Linking...
                    </>
                  ) : appointment.patient_linked_to_doctor ? (
                    <>
                      <FaCheckCircle className="mr-2" />
                      Patient Already in Your List
                    </>
                  ) : appointment.created_by_mobile ? (
                    <>
                      <FaUserPlus className="mr-2" />
                      Add Mobile Patient to Your List
                    </>
                  ) : (
                    <>
                      <FaUserPlus className="mr-2" />
                      Add Patient to My List
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Information */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="bg-white p-3 rounded-full shadow-md mr-3">
                <FaCalendarAlt className="text-primary-600 text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Appointment Information</h2>
                <p className="text-primary-100 text-sm">
                  {appointment.doctor_name ? `With ${appointment.doctor_name}` : 'Details'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Date and Time Card */}
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 mb-6">
              <div className="flex flex-col sm:flex-row items-center">
                <div className="bg-primary-100 rounded-full p-4 mb-4 sm:mb-0 sm:mr-6 flex items-center justify-center">
                  <FaCalendarAlt className="text-primary-600 text-3xl" />
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-lg font-semibold text-gray-800">Scheduled for</h3>
                  <p className="text-2xl font-bold text-primary-700">{appointment.date}</p>
                  <div className="flex items-center justify-center sm:justify-start mt-1">
                    <FaClock className="text-gray-500 mr-2" />
                    <span className="text-gray-700">{appointment.time}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="space-y-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FaClipboardList className="mr-2 text-gray-500" />
                  Status
                </label>
                <div className="relative">
                  <select
                    className={`block w-full px-4 py-3 border rounded-lg shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-opacity-50 ${statusUpdating ? 'bg-gray-100 cursor-wait' :
                      appointment.status === 'Completed' ? 'border-green-300 focus:ring-green-500 focus:border-green-500' :
                        appointment.status === 'Canceled' ? 'border-red-300 focus:ring-red-500 focus:border-red-500' :
                          appointment.status === 'Confirmed' ? 'border-blue-300 focus:ring-blue-500 focus:border-blue-500' :
                            'border-yellow-300 focus:ring-yellow-500 focus:border-yellow-500'
                      }`}
                    value={appointment.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={statusUpdating}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Canceled">Canceled</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
                {statusUpdating && (
                  <div className="mt-2 text-sm text-gray-500 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                    Updating status...
                  </div>
                )}
              </div>

              {/* Status Indicators */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className={`flex flex-col items-center p-3 rounded-lg border ${appointment.status === 'Pending' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                  <FaHourglassHalf className={`text-2xl mb-2 ${appointment.status === 'Pending' ? 'text-yellow-500' : 'text-gray-400'
                    }`} />
                  <span className="text-xs font-medium text-center">Pending</span>
                </div>
                <div className={`flex flex-col items-center p-3 rounded-lg border ${appointment.status === 'Confirmed' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                  <FaCheckCircle className={`text-2xl mb-2 ${appointment.status === 'Confirmed' ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                  <span className="text-xs font-medium text-center">Confirmed</span>
                </div>
                <div className={`flex flex-col items-center p-3 rounded-lg border ${appointment.status === 'Completed' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                  <FaCheckCircle className={`text-2xl mb-2 ${appointment.status === 'Completed' ? 'text-green-500' : 'text-gray-400'
                    }`} />
                  <span className="text-xs font-medium text-center">Completed</span>
                </div>
                <div className={`flex flex-col items-center p-3 rounded-lg border ${appointment.status === 'Canceled' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                  <FaTimesCircle className={`text-2xl mb-2 ${appointment.status === 'Canceled' ? 'text-red-500' : 'text-gray-400'
                    }`} />
                  <span className="text-xs font-medium text-center">Canceled</span>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FaClipboardList className="mr-2 text-gray-500" />
                  Appointment Reason
                </label>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full mr-3 ${appointment.reason?.includes('Consultation') ? 'bg-blue-100 text-blue-600' :
                      appointment.reason?.includes('Séance') ? 'bg-purple-100 text-purple-600' :
                        appointment.reason?.includes('Suivie') ? 'bg-green-100 text-green-600' :
                          appointment.reason?.includes('Education') ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-600'
                      }`}>
                      <FaClipboardList className="text-xl" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{appointment.reason || 'Not specified'}</p>
                      {appointment.reason?.includes('Consultation') && <p className="text-sm text-gray-500">Standard consultation appointment</p>}
                      {appointment.reason?.includes('Séance') && <p className="text-sm text-gray-500">Imaging session appointment</p>}
                      {appointment.reason?.includes('Suivie') && <p className="text-sm text-gray-500">Follow-up appointment</p>}
                      {appointment.reason?.includes('Education') && <p className="text-sm text-gray-500">Educational appointment</p>}
                    </div>
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>

      {/* Generate Report Button */}
      <div className="flex justify-center mt-8">
        <button
          className="btn btn-primary flex items-center justify-center px-6 py-3 text-lg shadow-lg transform transition-transform hover:scale-102 hover:shadow-xl"
          onClick={() => setShowReportModal(true)}
        >
          <FaFileMedical className="mr-2" />
          Generate Medical Report
        </button>
      </div>

      {/* Generate Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"></div>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md z-10 p-6 transform transition-all scale-100 opacity-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="bg-primary-100 p-2 rounded-full mr-3">
                  <FaFileMedical className="text-primary-600 text-xl" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Generate Medical Report</h2>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Diagnosis
                </label>
                <input
                  type="text"
                  placeholder="Enter diagnosis or condition"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Medications
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    placeholder="Add medication"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button className="px-4 py-3 bg-primary-600 rounded-r-lg border border-l-0 border-primary-600 text-white hover:bg-primary-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {/* Example medication pills - these would be dynamically generated */}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Paracetamol
                    <button className="ml-1 text-blue-500 hover:text-blue-700">×</button>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cost
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">DA</span>
                  </div>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter additional notes, observations, or recommendations"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                ></textarea>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150 flex items-center"
                onClick={() => setShowReportModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentDetail;
