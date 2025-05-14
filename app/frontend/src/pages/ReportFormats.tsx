import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';

interface Patient {
    id: string;
    firstName: string;
    lastName: string;
    gender: string;
    email: string;
    phone: string;
}

interface ReportFormat {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    path: string;
}

const ReportFormats: React.FC = () => {
    const navigate = useNavigate();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get<Patient[]>('/api/patients');
            setPatients(response.data);
        } catch (err) {
            console.error('Error fetching patients:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredPatients = patients.filter(patient =>
        `${patient.firstName} ${patient.lastName}`
            .toLowerCase()
            .includes(patientSearchTerm.toLowerCase())
    );

    const reportFormats: ReportFormat[] = [
        {
            id: 'text',
            name: 'Text Report',
            description: 'Create a simple text-based medical report with findings and recommendations',
            icon: '📝',
            color: 'bg-purple-100 text-purple-800',
            path: '/app/medical-reports/new/text'
        },
        {
            id: 'consultation',
            name: 'Consultation Report',
            description: 'Create a detailed consultation report with diagnosis and treatment plan',
            icon: '👨‍⚕️',
            color: 'bg-blue-100 text-blue-800',
            path: '/app/medical-reports/new/consultation'
        },
        {
            id: 'lab',
            name: 'Lab Results',
            description: 'Record laboratory test results with interpretations',
            icon: '🧪',
            color: 'bg-green-100 text-green-800',
            path: '/app/medical-reports/new/lab'
        },
        {
            id: 'imaging',
            name: 'Imaging Report',
            description: 'Upload and describe medical images (X-rays, MRIs, CT scans)',
            icon: '🔬',
            color: 'bg-indigo-100 text-indigo-800',
            path: '/app/upload-medical-file'
        },
        {
            id: 'prescription',
            name: 'Prescription',
            description: 'Create a medication prescription with dosage and instructions',
            icon: '💊',
            color: 'bg-yellow-100 text-yellow-800',
            path: '/app/medical-reports/new/prescription'
        },
        {
            id: 'other',
            name: 'Other Document',
            description: 'Upload any other type of medical document',
            icon: '📄',
            color: 'bg-gray-100 text-gray-800',
            path: '/app/upload-medical-file'
        }
    ];

    const handleSelectFormat = (format: ReportFormat) => {
        if (!selectedPatient) {
            alert('Please select a patient first');
            return;
        }

        // Map format IDs to report types
        const reportTypeMap: Record<string, string> = {
            'text': 'report',
            'imaging': 'medical_image',
            'lab': 'lab_result',
            'prescription': 'prescription',
            'scan': 'scan',
            'other': 'other'
        };

        const reportType = reportTypeMap[format.id];

        if (reportType) {
            navigate('/app/medical-reports/create', {
                state: {
                    selectedPatient,
                    reportType
                }
            });
        } else {
            // For any unmapped report types
            alert(`${format.name} reports will be implemented soon!`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Create Medical Report</h1>
                <Link to="/app/medical-reports" className="btn btn-outline">
                    Back to Reports
                </Link>
            </div>

            {/* Patient Selection */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-medium text-gray-700 mb-4">Select Patient</h2>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search patient by name..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={patientSearchTerm}
                        onChange={(e) => {
                            setPatientSearchTerm(e.target.value);
                            setShowPatientDropdown(true);
                        }}
                        onFocus={() => setShowPatientDropdown(true)}
                    />
                    {showPatientDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {filteredPatients.length === 0 ? (
                                <div className="px-4 py-2 text-gray-500">No patients found</div>
                            ) : (
                                filteredPatients.map((patient) => (
                                    <div
                                        key={patient.id}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={() => {
                                            setSelectedPatient(patient);
                                            setPatientSearchTerm(`${patient.firstName} ${patient.lastName}`);
                                            setShowPatientDropdown(false);
                                        }}
                                    >
                                        {patient.firstName} {patient.lastName} - {patient.email || patient.phone}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                {selectedPatient && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                            Selected: <span className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                        </p>
                    </div>
                )}
            </div>

            {/* Report Format Selection */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-medium text-gray-700 mb-4">Select Report Format</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reportFormats.map((format) => (
                        <div
                            key={format.id}
                            className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''
                                }`}
                            onClick={() => handleSelectFormat(format)}
                        >
                            <div className="flex items-center mb-2">
                                <div className={`p-2 rounded-lg mr-2 ${format.color}`}>
                                    <span className="text-xl">{format.icon}</span>
                                </div>
                                <h3 className="text-lg font-medium">{format.name}</h3>
                            </div>
                            <p className="text-sm text-gray-600">{format.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {!selectedPatient && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                Please select a patient before choosing a report format.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportFormats;
