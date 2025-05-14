import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../utils/api'; // Use our configured apiClient
import { FaCalendarAlt, FaCalendarPlus, FaSearch, FaFilter, FaUserClock, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaUserInjured, FaUserMd } from 'react-icons/fa';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  phone: string;
}

interface Appointment {
  id: string;
  patient_name: string;
  date: string;
  time: string;
  status: string;
  patient_id: string;
  doctor_id?: string;
  doctor_name?: string;
  reason?: string;
  patient_added_to_doctor?: boolean;
  created_by_patient?: boolean;
}

interface NewAppointment {
  patient_id: string;
  date: string;
  time: string;
  reason: string;
  status: string;
  cost?: number;
}

interface TimeSlot {
  time: string;
  isBooked: boolean;
}

const Appointments: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOption, setFilterOption] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New states for the add appointment form
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const [customReason, setCustomReason] = useState('');
  const [isOtherReasonSelected, setIsOtherReasonSelected] = useState(false);
  const [newAppointment, setNewAppointment] = useState<NewAppointment>({
    patient_id: '',
    date: '',
    time: '',
    reason: '',
    status: 'Pending',
    cost: 0
  });

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, []);

  // Fetch available time slots when date changes
  useEffect(() => {
    if (newAppointment.date) {
      fetchAvailableTimeSlots(newAppointment.date);
    } else {
      setAvailableTimeSlots([]);
    }
  }, [newAppointment.date]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Appointment[]>('/api/appointments');
      setAppointments(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch appointments');
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await apiClient.get<Patient[]>('/api/patients');
      setPatients(response.data);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const fetchAvailableTimeSlots = async (date: string) => {
    if (!date) return;

    try {
      setIsLoadingTimeSlots(true);

      // Get the day of the week from the selected date
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }); // e.g., "Monday"

      // Fetch available slots from the doctor's schedule
      const scheduleResponse = await apiClient.get(`/api/schedule/available-slots?day=${dayOfWeek}`);
      const scheduleData = scheduleResponse.data as { slots?: string[] };
      const availableSlots = scheduleData.slots || [];

      // Fetch existing appointments for this date to mark booked slots
      const appointmentsResponse = await apiClient.get(`/api/appointments?date=${date}`);
      const bookedAppointments = (appointmentsResponse.data as Appointment[]) || [];

      // Create time slots array with booking status
      const timeSlots = availableSlots.map((time: string) => {
        const isBooked = bookedAppointments.some((appointment: Appointment) =>
          appointment.date === date && appointment.time === time
        );
        return { time, isBooked };
      });

      setAvailableTimeSlots(timeSlots);

      // If the currently selected time is not available, clear it
      if (newAppointment.time) {
        const isCurrentTimeAvailable = timeSlots.some(
          (slot: TimeSlot) => slot.time === newAppointment.time && !slot.isBooked
        );

        if (!isCurrentTimeAvailable) {
          setNewAppointment(prev => ({ ...prev, time: '' }));
        }
      }
    } catch (err) {
      console.error('Error fetching available time slots:', err);
      setAvailableTimeSlots([]);
    } finally {
      setIsLoadingTimeSlots(false);
    }
  };

  const handleReasonChange = (selectedReason: string) => {
    let cost = 0;

    // Set cost based on selected reason
    switch (selectedReason) {
      case 'Consultation':
        cost = 1500;
        break;
      case 'Séance d\'imagerie':
        cost = 3000;
        break;
      case 'Suivie':
        cost = 2000;
        break;
      case 'Education':
        cost = 1500;
        break;
      case 'Other':
        // For "Other", we'll use the custom cost input
        cost = newAppointment.cost || 0;
        // Set flag to show custom reason field
        setIsOtherReasonSelected(true);
        break;
      default:
        cost = 0;
    }

    // Update appointment with new reason and cost
    setNewAppointment({ ...newAppointment, reason: selectedReason, cost });

    // Reset custom reason if not "Other"
    if (selectedReason !== 'Other') {
      setCustomReason('');
      setIsOtherReasonSelected(false);
    }
  };

  const handleCustomReasonChange = (customText: string) => {
    // Only update the custom reason state, not the appointment reason
    setCustomReason(customText);
  };

  const handleCustomCostChange = (cost: number) => {
    setNewAppointment({ ...newAppointment, cost });
  };

  const handleAddAppointment = async () => {
    if (!selectedPatient) {
      alert('Please select a patient');
      return;
    }

    if (!newAppointment.date || !newAppointment.time || !newAppointment.reason) {
      alert('Please fill in all required fields');
      return;
    }

    // For "Other" reason, make sure we have a custom reason text
    if (isOtherReasonSelected && !customReason) {
      alert('Please specify the reason for the appointment');
      return;
    }

    try {
      // Prepare the reason text - if "Other" is selected, use the custom reason
      const finalReason = isOtherReasonSelected
        ? customReason
        : newAppointment.reason;

      const params = new URLSearchParams({
        patient_id: selectedPatient.id,
        date: newAppointment.date,
        time: newAppointment.time,
        reason: finalReason,
        status: newAppointment.status,
        cost: newAppointment.cost?.toString() || '0'
      });

      await apiClient.post(`/api/appointments/?${params.toString()}`);

      // Refresh appointments list
      fetchAppointments();

      // Reset form and close modal
      setNewAppointment({
        patient_id: '',
        date: '',
        time: '',
        reason: '',
        status: 'Pending',
        cost: 0
      });
      setSelectedPatient(null);
      setPatientSearchTerm('');
      setCustomReason('');
      setIsOtherReasonSelected(false);
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding appointment:', err);
      alert('Failed to add appointment. Please check all fields are correct.');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      await apiClient.delete(`/api/appointments/${id}`);
      // Refresh the appointments list
      fetchAppointments();
    } catch (err) {
      console.error('Error deleting appointment:', err);
      alert('Failed to delete appointment');
    }
  };

  const filteredPatients = patients.filter(patient =>
    `${patient.firstName} ${patient.lastName}`
      .toLowerCase()
      .includes(patientSearchTerm.toLowerCase())
  );

  // Filter appointments based on search term and filter option
  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.patient_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterOption === 'All' || appointment.status.toLowerCase() === filterOption.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-white p-3 rounded-full shadow-md mr-4">
              <FaCalendarAlt className="text-primary-600 text-xl" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Appointment Management</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <FaSearch className="text-gray-400" />
              </span>
              <input
                type="text"
                placeholder="Search appointments..."
                className="pl-10 w-full px-4 py-2 bg-white bg-opacity-90 border-0 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 bg-white text-primary-700 hover:bg-primary-50 px-4 py-2 rounded-lg shadow-md transition-all duration-200 font-medium"
            >
              <FaCalendarPlus className="text-primary-600" />
              <span>New Appointment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter options */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center">
          <FaFilter className="text-gray-400 mr-2" />
          <span className="text-gray-700 font-medium">Filter by:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2
              ${filterOption === 'All'
                ? 'bg-primary-100 text-primary-800 border border-primary-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'}`}
            onClick={() => setFilterOption('All')}
          >
            <FaCalendarAlt className="text-xs" />
            All Appointments
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2
              ${filterOption === 'Pending'
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'}`}
            onClick={() => setFilterOption('Pending')}
          >
            <FaHourglassHalf className="text-xs" />
            Pending
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2
              ${filterOption === 'Completed'
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'}`}
            onClick={() => setFilterOption('Completed')}
          >
            <FaCheckCircle className="text-xs" />
            Completed
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2
              ${filterOption === 'Canceled'
                ? 'bg-red-100 text-red-800 border border-red-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'}`}
            onClick={() => setFilterOption('Canceled')}
          >
            <FaTimesCircle className="text-xs" />
            Canceled
          </button>
        </div>
        <div className="ml-auto">
          <input
            type="date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-12 bg-white rounded-xl shadow">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading appointment data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-lg shadow-md" role="alert">
          <div className="flex items-center">
            <svg className="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-bold text-red-700">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-lg">
          {filteredAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schedule
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <FaUserClock className="text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.patient_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {appointment.patient_id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{appointment.date}</div>
                        <div className="text-sm text-gray-500">{appointment.time}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {appointment.reason || 'General Consultation'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${appointment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            appointment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'}`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link
                            to={`/app/appointments/${appointment.id}`}
                            className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
                          >
                            View Details
                          </Link>
                          <button
                            onClick={() => handleDeleteAppointment(appointment.id)}
                            className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <svg className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-700 font-medium text-lg">No appointments found</p>
              <p className="text-gray-500 mt-1">
                {searchTerm || filterOption !== 'All' ? 'Try adjusting your search or filter.' : 'Schedule a new appointment to get started.'}
              </p>
              {(searchTerm || filterOption !== 'All') && (
                <button
                  onClick={() => { setSearchTerm(''); setFilterOption('All'); }}
                  className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-150"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"></div>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md z-10 p-6 transform transition-all scale-100 opacity-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="bg-primary-100 p-2 rounded-full mr-3">
                  <FaCalendarPlus className="text-primary-600 text-xl" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Schedule Appointment</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              {/* Patient Search/Select */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Information</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search patient by name or email..."
                    className="w-full pl-10 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    value={patientSearchTerm}
                    onChange={(e) => {
                      setPatientSearchTerm(e.target.value);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                  />
                </div>
                {showPatientDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((patient) => (
                        <div
                          key={patient.id}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors duration-150"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setPatientSearchTerm(`${patient.firstName} ${patient.lastName}`);
                            setShowPatientDropdown(false);
                          }}
                        >
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                              {patient.gender === 'Male' ? (
                                <FaUserMd className="text-primary-600 text-sm" />
                              ) : (
                                <FaUserInjured className="text-primary-600 text-sm" />
                              )}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{patient.firstName} {patient.lastName}</p>
                              <p className="text-xs text-gray-500">{patient.email}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500">No patients found</div>
                    )}
                  </div>
                )}
                {selectedPatient && (
                  <div className="mt-2 p-3 bg-primary-50 rounded-lg border border-primary-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        {selectedPatient.gender === 'Male' ? (
                          <FaUserMd className="text-primary-600" />
                        ) : (
                          <FaUserInjured className="text-primary-600" />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                        <p className="text-xs text-gray-500">{selectedPatient.email} • {selectedPatient.phone}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Date and Time Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    value={newAppointment.date}
                    min={new Date().toISOString().split('T')[0]} // This sets the minimum date to today
                    onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
                  {isLoadingTimeSlots ? (
                    <div className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                      <div className="animate-spin h-4 w-4 border-b-2 border-primary-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-500">Loading slots...</span>
                    </div>
                  ) : availableTimeSlots.length > 0 ? (
                    <select
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                      value={newAppointment.time}
                      onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                    >
                      <option value="">Select a time slot</option>
                      {availableTimeSlots.map((slot) => (
                        <option
                          key={slot.time}
                          value={slot.time}
                          disabled={slot.isBooked}
                          className={slot.isBooked ? 'text-gray-400' : ''}
                        >
                          {slot.time} {slot.isBooked ? '(Booked)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : newAppointment.date ? (
                    <div className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-center">
                      <span className="text-sm text-gray-500">No available slots for this date</span>
                    </div>
                  ) : (
                    <div className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-center">
                      <span className="text-sm text-gray-500">Please select a date first</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reason and Status Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Reason</label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  value={newAppointment.reason}
                  onChange={(e) => handleReasonChange(e.target.value)}
                >
                  <option value="">Select a reason</option>
                  <option value="Consultation">Consultation (1500 DA)</option>
                  <option value="Séance d'imagerie">Séance d'imagerie (3000 DA)</option>
                  <option value="Suivie">Suivie (2000 DA)</option>
                  <option value="Education">Education (1500 DA)</option>
                  <option value="Other">Other (specify)</option>
                </select>
              </div>

              {/* Custom Reason (only shown when "Other" is selected) */}
              {isOtherReasonSelected && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specify Reason</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                      value={customReason}
                      onChange={(e) => handleCustomReasonChange(e.target.value)}
                      placeholder="Please specify the reason"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost (DA)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                      value={newAppointment.cost || ''}
                      onChange={(e) => handleCustomCostChange(Number(e.target.value))}
                      placeholder="Enter cost in DA"
                      min="0"
                    />
                  </div>
                </div>
              )}

              {/* Display Cost (for non-Other reasons) */}
              {newAppointment.reason && !isOtherReasonSelected && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                  <div className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium">
                    {newAppointment.cost} DA
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 ${newAppointment.status === 'Pending'
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                      }`}
                    onClick={() => setNewAppointment({ ...newAppointment, status: 'Pending' })}
                  >
                    <FaHourglassHalf className="text-xs" />
                    <span>Pending</span>
                  </button>
                  <button
                    type="button"
                    className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 ${newAppointment.status === 'Confirmed'
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                      }`}
                    onClick={() => setNewAppointment({ ...newAppointment, status: 'Confirmed' })}
                  >
                    <FaCheckCircle className="text-xs" />
                    <span>Confirmed</span>
                  </button>
                  <button
                    type="button"
                    className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 ${newAppointment.status === 'Canceled'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                      }`}
                    onClick={() => setNewAppointment({ ...newAppointment, status: 'Canceled' })}
                  >
                    <FaTimesCircle className="text-xs" />
                    <span>Canceled</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150 flex items-center"
                onClick={handleAddAppointment}
              >
                <FaCalendarPlus className="mr-2" />
                Schedule Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
