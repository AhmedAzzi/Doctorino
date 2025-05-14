import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../utils/api';
import { FaUserPlus, FaSearch, FaFilter, FaUserMd, FaUserInjured, FaUser } from 'react-icons/fa';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  address?: string;
  national_id?: string;
  health_insurance?: string;


  // Medical Snapshot
  blood_info?: {
    blood_group?: string;
    rh_factor?: string;
    anemia?: string;
    bleeding_disorders?: string;
  };

  // Allergies & Medications
  allergies_medications?: {
    drug_allergies?: string[];
    current_medications?: Array<{ name: string; dosage: string; frequency: string }>;
    supplements?: string[];
  };

  // Chronic Conditions
  diabetes?: {
    has_diabetes?: boolean;
    diabetes_type?: string;
    diagnosis_date?: string;
    treatment?: string;
  };

  // Vitals & Habits
  blood_pressure?: {
    last_bp_systolic?: number;
    last_bp_diastolic?: number;
    hypertension_status?: string;
  };

  // BMI/Weight/Height
  height?: number;
  weight?: number;

  // Lifestyle
  lifestyle?: {
    smoking?: string;
    alcohol_consumption?: string;
    physical_activity?: string;
  };

  // Medical History
  medical_history?: string;

  // Female-Specific Info
  gynecological?: {
    last_menstrual_period?: string;
    menopausal_status?: string;
    pregnancy_status?: string;
    contraceptive_use?: string;
  };

  // Cardiovascular Info
  cardiovascular?: {
    conditions?: string[];
    family_history?: boolean;
  };
}

const Patients: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOption, setFilterOption] = useState('All');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Function to fetch patients using our configured apiClient
  const fetchPatients = async () => {
    try {
      setLoading(true);
      // Using our configured apiClient that includes auth headers
      const response = await apiClient.get<Patient[]>('/api/patients');
      setPatients(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Failed to load patients. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Handler for deleting a patient
  const handleDeletePatient = async (patientId: string) => {
    // Confirmation dialog
    if (!window.confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
      return;
    }

    try {
      // API Call to DELETE patient using our configured apiClient
      await apiClient.delete(`/api/patients/${patientId}`);
      // Remove the patient from the list state
      setPatients(patients.filter(p => p.id !== patientId));
      // Optionally show a success message (could use a state variable for this)
      console.log(`Patient ${patientId} deleted successfully.`);
    } catch (err) {
      console.error('Error deleting patient:', err);
      // Show error to user (could use a state variable)
      alert('Failed to delete patient. Please try again.');
    }
  };

  // Filter patients based on search term and filter option
  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = fullName.includes(search);
    const matchesFilter = filterOption === 'All' || patient.gender === filterOption;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-white p-3 rounded-full shadow-md mr-4">
              <FaUserMd className="text-primary-600 text-xl" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Patient Management</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <FaSearch className="text-gray-400" />
              </span>
              <input
                type="text"
                placeholder="Search patients..."
                className="pl-10 w-full px-4 py-2 bg-white bg-opacity-90 border-0 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Link
              to="/app/patients/add"
              className="flex items-center justify-center gap-2 bg-white text-primary-700 hover:bg-primary-50 px-4 py-2 rounded-lg shadow-md transition-all duration-200 font-medium"
            >
              <FaUserPlus className="text-primary-600" />
              <span>Add New Patient</span>
            </Link>
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
            <FaUser className="text-xs" />
            All Patients
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2
              ${filterOption === 'Male'
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'}`}
            onClick={() => setFilterOption('Male')}
          >
            <FaUserMd className="text-xs" />
            Male
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2
              ${filterOption === 'Female'
                ? 'bg-pink-100 text-pink-800 border border-pink-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'}`}
            onClick={() => setFilterOption('Female')}
          >
            <FaUserInjured className="text-xs" />
            Female
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading patient data...</p>
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
          {filteredPatients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date of Birth
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gender
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            {patient.gender === 'Male' ? (
                              <FaUserMd className="text-primary-600" />
                            ) : (
                              <FaUserInjured className="text-primary-600" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {patient.firstName} {patient.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {patient.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.date_of_birth || 'Not provided'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.email || 'Not provided'}</div>
                        <div className="text-sm text-gray-500">{patient.phone || 'Not provided'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${patient.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                          {patient.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link
                            to={`/app/patients/${patient.id}`}
                            className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
                          >
                            View Details
                          </Link>
                          <button
                            onClick={() => handleDeletePatient(patient.id)}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-700 font-medium text-lg">No patients found</p>
              <p className="text-gray-500 mt-1">
                {searchTerm || filterOption !== 'All' ? 'Try adjusting your search or filter.' : 'Add a new patient to get started.'}
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
    </div>
  );
};

export default Patients;