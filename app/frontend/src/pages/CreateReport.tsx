import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';
import MedicalImageReport from '../components/reports/MedicalImageReport';
import ScanReport from '../components/reports/ScanReport';
import LabResultReport from '../components/reports/LabResultReport';
import PrescriptionReport from '../components/reports/PrescriptionReport';
import TextReport from '../components/reports/TextReport';
import OtherReport from '../components/reports/OtherReport';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  phone: string;
}

interface LocationState {
  selectedPatient?: Patient;
  reportType?: string;
}

const CreateReport: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState || {};

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(state.selectedPatient || null);
  const [reportType, setReportType] = useState<string>(state.reportType || '');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState(
    state.selectedPatient ? `${state.selectedPatient.firstName} ${state.selectedPatient.lastName}` : ''
  );
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const reportTypes = [
    {
      id: 'medical_image',
      name: 'Medical Image',
      icon: '🖼️',
      color: 'bg-blue-100 text-blue-800',
      description: 'Upload clinical photographs, dermatological images, or other medical photography.'
    },
    {
      id: 'scan',
      name: 'Scan/X-Ray',
      icon: '🔬',
      color: 'bg-indigo-100 text-indigo-800',
      description: 'Upload X-rays, CT scans, MRIs, ultrasounds, or other diagnostic imaging.'
    },
    {
      id: 'lab_result',
      name: 'Lab Result',
      icon: '🧪',
      color: 'bg-green-100 text-green-800',
      description: 'Upload blood tests, urine analysis, pathology reports, or other laboratory results.'
    },
    {
      id: 'prescription',
      name: 'Prescription',
      icon: '💊',
      color: 'bg-yellow-100 text-yellow-800',
      description: 'Create or upload medication prescriptions and treatment plans.'
    },
    {
      id: 'report',
      name: 'Text Report',
      icon: '📝',
      color: 'bg-purple-100 text-purple-800',
      description: 'Create consultation notes, progress notes, discharge summaries, or other text-based reports.'
    },
    {
      id: 'other',
      name: 'Other Document',
      icon: '📄',
      color: 'bg-gray-100 text-gray-800',
      description: 'Upload consent forms, insurance documents, referral letters, or other medical documentation.'
    }
  ];

  useEffect(() => {
    if (!selectedPatient && !reportType) {
      fetchPatients();
    }
  }, [selectedPatient, reportType]);

  const fetchPatients = async () => {
    try {
      const response = await apiClient.get<Patient[]>('/api/patients');
      setPatients(response.data);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const filteredPatients = patients.filter(patient =>
    `${patient.firstName} ${patient.lastName}`
      .toLowerCase()
      .includes(patientSearchTerm.toLowerCase())
  );

  const handleSelectReportType = (type: string) => {
    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }
    setReportType(type);
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearchTerm(`${patient.firstName} ${patient.lastName}`);
    setShowPatientDropdown(false);
  };

  const handleCancel = () => {
    navigate('/app/medical-reports');
  };

  const renderReportForm = () => {
    switch (reportType) {
      case 'medical_image':
        return (
          <MedicalImageReport
            selectedPatient={selectedPatient}
            onPatientChange={setSelectedPatient}
            onCancel={handleCancel}
          />
        );
      case 'scan':
        return (
          <ScanReport
            selectedPatient={selectedPatient}
            onPatientChange={setSelectedPatient}
            onCancel={handleCancel}
          />
        );
      case 'lab_result':
        return (
          <LabResultReport
            selectedPatient={selectedPatient}
            onPatientChange={setSelectedPatient}
            onCancel={handleCancel}
          />
        );
      case 'prescription':
        return (
          <PrescriptionReport
            selectedPatient={selectedPatient}
            onPatientChange={setSelectedPatient}
            onCancel={handleCancel}
          />
        );
      case 'report':
        return (
          <TextReport
            selectedPatient={selectedPatient}
            onPatientChange={setSelectedPatient}
            onCancel={handleCancel}
          />
        );
      case 'other':
        return (
          <OtherReport
            selectedPatient={selectedPatient}
            onPatientChange={setSelectedPatient}
            onCancel={handleCancel}
          />
        );
      default:
        return null;
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

      {!reportType ? (
        <>
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
                        onClick={() => handlePatientSelect(patient)}
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

          {/* Report Type Selection */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-700 mb-4">Select Report Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportTypes.map((type) => (
                <div
                  key={type.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  onClick={() => handleSelectReportType(type.id)}
                >
                  <div className="flex items-center mb-2">
                    <div className={`p-2 rounded-lg mr-2 ${type.color}`}>
                      <span className="text-xl">{type.icon}</span>
                    </div>
                    <h3 className="text-lg font-medium">{type.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600">{type.description}</p>
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
                    Please select a patient before choosing a report type.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        renderReportForm()
      )}
    </div>
  );
};

export default CreateReport;
