import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../utils/api';
import {
  FaFileMedical, FaSearch, FaFilter, FaCalendarAlt, FaUserMd,
  FaFlask, FaPrescriptionBottleAlt, FaXRay, FaFileAlt, FaFileImage,
  FaFileUpload, FaFileContract
} from 'react-icons/fa';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  phone: string;
}

interface Report {
  id: string;
  patient_name: string;
  title: string;
  date?: string;
  doctor: string;
  patient_id: string;
  file_type: string;
  filename: string;
  description?: string; // Optional description field
  document_date?: string; // For document reports
  lab_date?: string; // For lab reports
  uploaded_at?: string; // Fallback date
}

interface NewReport {
  patient_id: string;
  title: string;
  findings: string;
  recommendations: string;
  date: string;
}

// Helper function for file types
const getFileTypeLabel = (fileType: string) => {
  switch (fileType) {
    case 'medical_image':
      return 'Medical Image';
    case 'scan':
      return 'Scan (CT, MRI, X-ray)';
    case 'lab_result':
      return 'Lab Result';
    case 'prescription':
      return 'Prescription';
    case 'report':
      return 'Text Report';
    case 'other':
      return 'Other Document';
    default:
      return 'Document';
  }
};

// Get the appropriate URL for the report type
const getReportViewUrl = (report: Report) => {
  switch (report.file_type) {
    case 'medical_image':
      return `/app/medical-reports/medical-image/${report.id}`;
    case 'scan':
      return `/app/medical-reports/scan/${report.id}`;
    case 'lab_result':
      return `/app/medical-reports/lab-result/${report.id}`;
    case 'prescription':
      return `/app/medical-reports/prescription/${report.id}`;
    case 'report':
      return `/app/medical-reports/report/${report.id}`;
    case 'other':
    default:
      return `/app/medical-reports/other/${report.id}`;
  }
};

const formatDate = (dateString: string | undefined) => {
  try {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return 'N/A';
  }
};

const MedicalReports: React.FC = () => {
  const location = useLocation();
  const locationState = location.state as { showAddModal?: boolean; selectedPatient?: Patient } || {};

  const [searchTerm, setSearchTerm] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(locationState.showAddModal || false);

  // Filtering states
  const [filterType, setFilterType] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // States for adding a new report
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState(
    locationState.selectedPatient
      ? `${locationState.selectedPatient.firstName} ${locationState.selectedPatient.lastName}`
      : ''
  );
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(locationState.selectedPatient || null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [newReport, setNewReport] = useState<NewReport>({
    patient_id: locationState.selectedPatient?.id || '',
    title: '',
    findings: '',
    recommendations: '',
    date: new Date().toISOString().substring(0, 10) // Today's date as default in YYYY-MM-DD format
  });

  useEffect(() => {
    fetchReports();
    fetchPatients();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Get all reports created by the current doctor
      const response = await apiClient.get<Report[]>('/api/medical-reports');
      console.log('API Response:', response.data);

      // Set reports directly - the backend is now properly filtering by the current doctor
      setReports(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching medical reports:', err);
      setError('Failed to load medical reports. Please try again later.');
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

  const handleAddReport = async () => {
    if (!selectedPatient) {
      alert('Please select a patient');
      return;
    }

    if (!newReport.title.trim() || !newReport.date) {
      alert('Please fill in all required fields. Report title and date are required.');
      return;
    }

    try {
      // Create the report data object with the required fields
      const reportData = {
        patient_id: selectedPatient.id,
        title: newReport.title,
        findings: newReport.findings || "",
        recommendations: newReport.recommendations || "",
        date: newReport.date
      };

      console.log('Sending report data:', reportData);

      // Use the new endpoint for creating text-based reports
      const response = await apiClient.post('/api/medical-reports/text', reportData);
      console.log('Report created:', response.data);

      // Refresh reports list
      fetchReports();

      // Reset form and close modal
      setNewReport({
        patient_id: '',
        title: '',
        findings: '',
        recommendations: '',
        date: new Date().toISOString().substring(0, 10) // Consistent YYYY-MM-DD format
      });
      setSelectedPatient(null);
      setPatientSearchTerm('');
      setShowAddModal(false);

      // Show success message
      alert('Report added successfully!');
    } catch (err: any) {
      console.error('Error adding report:', err);
      // Show more detailed error message if available
      if (err.response && err.response.data) {
        alert(`Failed to add report: ${JSON.stringify(err.response.data)}`);
      } else {
        alert('Failed to add report. Please check all fields are correct.');
      }
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await apiClient.delete(`/api/medical-reports/${id}`);
      // Refresh the reports list
      fetchReports();
    } catch (err) {
      console.error('Error deleting report:', err);
      alert('Failed to delete report');
    }
  };

  const filteredPatients = patients.filter(patient =>
    `${patient.firstName} ${patient.lastName}`
      .toLowerCase()
      .includes(patientSearchTerm.toLowerCase())
  );

  // Filter reports based on search term, file type, and date range
  const filteredReports = reports.filter(report => {
    // Filter by search term
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      (report.patient_name?.toLowerCase() || '').includes(search) ||
      ((report.title || report.description || '')?.toLowerCase() || '').includes(search);

    // Filter by file type
    const matchesType = filterType === 'all' || report.file_type === filterType;

    // Filter by date range
    let matchesDateRange = true;
    // Get the effective date from any of the date fields
    const effectiveDate = report.date || report.document_date || report.lab_date || report.uploaded_at;

    if (startDate && endDate && effectiveDate) {
      try {
        const reportDate = new Date(effectiveDate);
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Set end date to end of day
        end.setHours(23, 59, 59, 999);

        matchesDateRange = reportDate >= start && reportDate <= end;
      } catch (e) {
        console.error("Error parsing date:", e);
        matchesDateRange = true; // Default to showing the report if date parsing fails
      }
    } else if (startDate && effectiveDate) {
      try {
        const reportDate = new Date(effectiveDate);
        const start = new Date(startDate);
        matchesDateRange = reportDate >= start;
      } catch (e) {
        console.error("Error parsing date:", e);
        matchesDateRange = true;
      }
    } else if (endDate && effectiveDate) {
      try {
        const reportDate = new Date(effectiveDate);
        const end = new Date(endDate);
        // Set end date to end of day
        end.setHours(23, 59, 59, 999);
        matchesDateRange = reportDate <= end;
      } catch (e) {
        console.error("Error parsing date:", e);
        matchesDateRange = true;
      }
    }

    return matchesSearch && matchesType && matchesDateRange;
  });

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-white p-3 rounded-full shadow-md mr-4">
              <FaFileMedical className="text-primary-600 text-xl" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Medical Reports</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <FaSearch className="text-gray-400" />
              </span>
              <input
                type="text"
                placeholder="Search reports..."
                className="pl-10 w-full px-4 py-2 bg-white bg-opacity-90 border-0 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Link
                to="/app/medical-reports/create"
                className="flex items-center justify-center gap-2 bg-white text-primary-700 hover:bg-primary-50 px-4 py-2 rounded-lg shadow-md transition-all duration-200 font-medium"
              >
                <FaFileUpload className="text-primary-600" />
                <span>New Report</span>

              </Link>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center gap-2 bg-green-500 text-white hover:bg-green-600 px-4 py-2 rounded-lg shadow-md transition-all duration-200 font-medium"
              >
                <FaFileAlt className="text-white" />
                <span>Quick Text</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter options */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <div className="flex items-center mb-4">
          <FaFilter className="text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-700">Filter Reports</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* File Type Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Report Type</label>
            <div className="relative">
              <select
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 pr-10"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="medical_image">Medical Images</option>
                <option value="scan">Scans & X-rays</option>
                <option value="lab_result">Lab Results</option>
                <option value="prescription">Prescriptions</option>
                <option value="report">Text Reports</option>
                <option value="other">Other Documents</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors duration-200 flex items-center gap-1
                  ${filterType === 'medical_image' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setFilterType(filterType === 'medical_image' ? 'all' : 'medical_image')}
              >
                <FaFileImage className="text-xs" />
                <span>Images</span>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors duration-200 flex items-center gap-1
                  ${filterType === 'scan' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setFilterType(filterType === 'scan' ? 'all' : 'scan')}
              >
                <FaXRay className="text-xs" />
                <span>Scans</span>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors duration-200 flex items-center gap-1
                  ${filterType === 'lab_result' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setFilterType(filterType === 'lab_result' ? 'all' : 'lab_result')}
              >
                <FaFlask className="text-xs" />
                <span>Lab Results</span>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors duration-200 flex items-center gap-1
                  ${filterType === 'report' ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setFilterType(filterType === 'report' ? 'all' : 'report')}
              >
                <FaFileAlt className="text-xs" />
                <span>Text Reports</span>
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaCalendarAlt className="text-gray-400" />
              </div>
              <input
                type="date"
                className="w-full pl-10 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaCalendarAlt className="text-gray-400" />
              </div>
              <input
                type="date"
                className="w-full pl-10 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Clear filters button */}
        {(filterType !== 'all' || startDate || endDate) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setFilterType('all');
                setStartDate('');
                setEndDate('');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-150 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-12 bg-white rounded-xl shadow">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading medical reports...</p>
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
          <div className="mt-4 flex justify-end">
            <button
              onClick={fetchReports}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-150"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-lg">
          {filteredReports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report Details
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <FaUserMd className="text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {report.patient_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {report.patient_id ? `${report.patient_id.substring(0, 8)}...` : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{report.title || report.description || 'Untitled Report'}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(report.date || report.document_date || report.lab_date || report.uploaded_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg mr-2 ${report.file_type === 'medical_image' ? 'bg-blue-50 text-blue-600' :
                            report.file_type === 'scan' ? 'bg-indigo-50 text-indigo-600' :
                              report.file_type === 'lab_result' ? 'bg-green-50 text-green-600' :
                                report.file_type === 'prescription' ? 'bg-yellow-50 text-yellow-600' :
                                  report.file_type === 'report' ? 'bg-purple-50 text-purple-600' :
                                    'bg-gray-50 text-gray-600'
                            }`}>
                            {report.file_type === 'medical_image' ? <FaFileImage className="text-lg" /> :
                              report.file_type === 'scan' ? <FaXRay className="text-lg" /> :
                                report.file_type === 'lab_result' ? <FaFlask className="text-lg" /> :
                                  report.file_type === 'prescription' ? <FaPrescriptionBottleAlt className="text-lg" /> :
                                    report.file_type === 'report' ? <FaFileAlt className="text-lg" /> :
                                      <FaFileContract className="text-lg" />}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {getFileTypeLabel(report.file_type)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{report.doctor}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {/^[0-9a-fA-F]{24}$/.test(report.id) ? (
                            <>
                              <Link
                                to={getReportViewUrl(report)}
                                className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
                              >
                                View Details
                              </Link>
                            </>
                          ) : (
                            <span className="text-gray-400">ID Format Invalid</span>
                          )}
                          <button
                            onClick={() => handleDeleteReport(report.id)}
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
              <div className="bg-gray-50 p-6 rounded-full mb-4">
                <FaFileMedical className="h-16 w-16 text-gray-400" />
              </div>
              <p className="text-gray-700 font-medium text-lg">No medical reports found</p>
              <p className="text-gray-500 mt-1 max-w-md">
                {filterType !== 'all' || startDate || endDate ?
                  'Try adjusting your filters to see more reports.' :
                  'You can only see reports that you have created. Add reports to keep track of patient diagnoses, treatments, and medical history.'}
              </p>
              <div className="mt-6 flex gap-3">
                <Link
                  to="/app/medical-reports/create"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-150 flex items-center gap-2"
                >
                  <FaFileUpload />
                  Create New Report
                </Link>
                {(filterType !== 'all' || startDate || endDate) && (
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-150 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Report Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"></div>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md z-10 p-6 transform transition-all scale-100 opacity-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="bg-primary-100 p-2 rounded-full mr-3">
                  <FaFileAlt className="text-primary-600 text-xl" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Create Text Report</h2>
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
                                <FaUserMd className="text-primary-600 text-sm" />
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
                        <FaUserMd className="text-primary-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                        <p className="text-xs text-gray-500">{selectedPatient.email} • {selectedPatient.phone || 'No phone'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Report Title and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Report Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    value={newReport.title}
                    onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                    placeholder="e.g., Consultation"
                    required
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaCalendarAlt className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      className="w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                      value={newReport.date}
                      onChange={(e) => setNewReport({ ...newReport, date: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Findings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Findings</label>
                <textarea
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  value={newReport.findings}
                  onChange={(e) => setNewReport({ ...newReport, findings: e.target.value })}
                  placeholder="Enter medical findings, observations, and diagnosis"
                  rows={4}
                />
              </div>

              {/* Recommendations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
                <textarea
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  value={newReport.recommendations}
                  onChange={(e) => setNewReport({ ...newReport, recommendations: e.target.value })}
                  placeholder="Enter treatment plan, medications, and follow-up instructions"
                  rows={4}
                />
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddReport}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150 flex items-center"
                >
                  <FaFileAlt className="mr-2" />
                  Save Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalReports;
