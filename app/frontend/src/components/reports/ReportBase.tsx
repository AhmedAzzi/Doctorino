import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/api';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  phone: string;
}

export interface ReportBaseProps {
  selectedPatient: Patient | null;
  onPatientChange?: (patient: Patient | null) => void;
  onCancel?: () => void;
  onSuccess?: (reportId: string) => void;
  initialValues?: any;
}

const ReportBase: React.FC<ReportBaseProps & { children: React.ReactNode }> = ({
  selectedPatient,
  onPatientChange,
  onCancel,
  onSuccess,
  children,
  initialValues
}) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState(
    selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : ''
  );
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPatient) {
      fetchPatients();
    }
  }, [selectedPatient]);

  useEffect(() => {
    if (selectedPatient) {
      setPatientSearchTerm(`${selectedPatient.firstName} ${selectedPatient.lastName}`);
    }
  }, [selectedPatient]);

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

  const handlePatientSelect = (patient: Patient) => {
    if (onPatientChange) {
      onPatientChange(patient);
    }
    setPatientSearchTerm(`${patient.firstName} ${patient.lastName}`);
    setShowPatientDropdown(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/app/medical-reports');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {/* Patient Selection */}
      {!selectedPatient && (
        <div className="mb-6 pb-6 border-b border-gray-200">
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
        </div>
      )}

      {/* Selected Patient Display */}
      {selectedPatient && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-700">Patient</h2>
            {onPatientChange && (
              <button
                onClick={() => onPatientChange(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Change
              </button>
            )}
          </div>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800">
              <span className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</span>
              {selectedPatient.email && <span className="ml-2 text-sm">({selectedPatient.email})</span>}
            </p>
          </div>
        </div>
      )}

      {/* Report Form Content - Passed as children */}
      {selectedPatient && children}
    </div>
  );
};

export default ReportBase;
