import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../utils/api';
import { FaFileMedical } from 'react-icons/fa';

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

// Helper functions for file types
const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
        case 'medical_image':
            return '🖼️';
        case 'scan':
            return '🔬';
        case 'lab_result':
            return '🧪';
        case 'prescription':
            return '💊';
        case 'report':
            return '📝';
        case 'other':
            return '📄';
        default:
            return '📎';
    }
};

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

interface PatientReportsProps {
    patientId: string;
}

const PatientReports: React.FC<PatientReportsProps> = ({ patientId }) => {
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

    // State for patient data
    const [patients, setPatients] = useState<Patient[]>([]);
    const [newReport, setNewReport] = useState<NewReport>({
        patient_id: patientId,
        title: '',
        findings: '',
        recommendations: '',
        date: new Date().toISOString().substring(0, 10) // Today's date as default in YYYY-MM-DD format
    });

    useEffect(() => {
        fetchReports();
        fetchPatients();
    }, [patientId]);

    const fetchReports = async () => {
        try {
            setLoading(true);

            // Check if patientId is valid
            if (!patientId) {
                setError('Invalid patient ID. Please try again.');
                setLoading(false);
                return;
            }

            // Fetch reports for the specific patient created by the current doctor
            const response = await apiClient.get<Report[]>(`/api/medical-reports/patient/${patientId}`);
            console.log('Patient Reports API Response:', response.data);

            // Set reports directly - we no longer need to try fetching by type since the backend
            // is now properly filtering by the current doctor
            setReports(response.data || []);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching patient medical reports:', err);

            // Show more specific error message if available
            if (err.response && err.response.data && err.response.data.detail) {
                setError(`Error: ${err.response.data.detail}`);
            } else if (err.message) {
                setError(`Error: ${err.message}`);
            } else {
                setError('Failed to load medical reports for this patient. Please try again later.');
            }

            // Log additional details for debugging
            if (err.response) {
                console.error('Response status:', err.response.status);
                console.error('Response data:', err.response.data);
            }
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
        if (!newReport.title.trim() || !newReport.date) {
            alert('Please fill in all required fields. Report title and date are required.');
            return;
        }

        try {
            // Create the report data object with the required fields
            const reportData = {
                patient_id: patientId, // Use the patientId prop directly
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
                patient_id: patientId, // Keep the current patient ID
                title: '',
                findings: '',
                recommendations: '',
                date: new Date().toISOString().substring(0, 10) // Consistent YYYY-MM-DD format
            });
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



    // Filter reports based on search term, file type, and date range
    const filteredReports = reports.filter(report => {
        // Filter by search term
        const search = searchTerm.toLowerCase();
        const matchesSearch =
            report.patient_name.toLowerCase().includes(search) ||
            report.title.toLowerCase().includes(search);

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
        <div className="space-y-4">

            <div className="flex items-center mb-4 ">

                {/* Icon + Title in left and buttons in right */}
                <div className="flex-grow flex items-center">
                    {/* Icon */}
                    <FaFileMedical className="text-4xl text-primary-500 mr-4" />

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-800">Medical Reports</h1>
                </div>

                {/* Buttons */}
                <div className="flex space-x-2">
                    <Link
                        to="/app/medical-reports/create"
                        className="btn bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Report
                    </Link>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Quick Text Report
                    </button>
                </div>
            </div>



            {/* Filter controls */}
            <div className="bg-white p-4 rounded-md shadow mb-4">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* File Type Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">File Type</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
                    </div>

                    {/* Date Range Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-md shadow overflow-hidden">
                {loading ? (
                    <div className="text-center py-8 flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
                        <p className="text-gray-600">Loading medical reports...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-8 flex flex-col items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-red-600 mb-2 font-medium">{error}</p>
                        <div className="mt-4">
                            <button
                                onClick={fetchReports}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-md flex items-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh Reports
                            </button>
                        </div>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Patient
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Report Title
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Doctor
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Report Date
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center">
                                        <div className="py-8 flex flex-col items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p className="text-gray-600 mb-2 font-medium">No medical reports created by you for this patient</p>
                                            <p className="text-gray-500 text-sm mb-4 max-w-md text-center">
                                                You can only see reports that you have created. Add reports to keep track of this patient's diagnoses, treatments, and medical history.
                                            </p>

                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredReports.map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {report.patient_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {report.title || report.description || 'Untitled Report'}
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
                                                    <span className="text-xl">{getFileTypeIcon(report.file_type)}</span>
                                                </div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {getFileTypeLabel(report.file_type)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {report.doctor}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(report.date || report.document_date || report.lab_date || report.uploaded_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            {/^[0-9a-fA-F]{24}$/.test(report.id) ? (
                                                <Link
                                                    to={`/app/medical-reports/${report.file_type}/${report.id}`}
                                                    className="btn btn-primary text-sm"
                                                >
                                                    View Report
                                                </Link>
                                            ) : (
                                                <span className="text-gray-400">ID Format Invalid</span>
                                            )}
                                            <button
                                                onClick={() => handleDeleteReport(report.id)}
                                                className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add Report Modal */}
            {showAddModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="fixed inset-0 bg-black opacity-50"></div>
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md z-10 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Add Medical Report</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Patient Info - Read Only */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                                    {patients.find(p => p.id === patientId)?.firstName} {patients.find(p => p.id === patientId)?.lastName}
                                </div>
                            </div>

                            {/* Report Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Report Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                    value={newReport.title}
                                    onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                                    placeholder="e.g., General Consultation, Routine Check-up"
                                    required
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                    value={newReport.date}
                                    onChange={(e) => setNewReport({ ...newReport, date: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Findings */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Findings</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                    value={newReport.findings}
                                    onChange={(e) => setNewReport({ ...newReport, findings: e.target.value })}
                                    placeholder="Medical findings"
                                    rows={3}
                                />
                            </div>

                            {/* Recommendations */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                    value={newReport.recommendations}
                                    onChange={(e) => setNewReport({ ...newReport, recommendations: e.target.value })}
                                    placeholder="Treatment recommendations"
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddReport}
                                    className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                                >
                                    Add Report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientReports;
