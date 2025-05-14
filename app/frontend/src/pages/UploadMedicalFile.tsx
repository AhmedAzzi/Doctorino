import React, { useState, useEffect, useRef, ChangeEvent, DragEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import apiClient, { uploadFile } from '../utils/api';
import { getCurrentUsername } from '../utils/authUtils';

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
}

const UploadMedicalFile: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>('medical_image');
  const [description, setDescription] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Patient state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(state?.selectedPatient || null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState<string>(
    state?.selectedPatient ? `${state.selectedPatient.firstName} ${state.selectedPatient.lastName}` : ''
  );
  const [showPatientDropdown, setShowPatientDropdown] = useState<boolean>(false);

  // Current user
  const [currentUser, setCurrentUser] = useState<{ username: string, fullName: string }>({
    username: '',
    fullName: 'Doctor'
  });

  const fileTypes = [
    { value: 'medical_image', label: 'Medical Image' },
    { value: 'scan', label: 'Scan (CT, MRI, X-ray)' },
    { value: 'lab_result', label: 'Lab Result' },
    { value: 'prescription', label: 'Prescription' },
    { value: 'report', label: 'Text Report' },
    { value: 'other', label: 'Other Document' },
  ];

  // Fetch patients if not provided in state
  useEffect(() => {
    if (!selectedPatient) {
      fetchPatients();
    }
    fetchCurrentUser();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await apiClient.get<Patient[]>('/api/patients');
      setPatients(response.data);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setUploadError('Failed to load patients. Please try again later.');
    }
  };

  // Fetch current user information
  const fetchCurrentUser = async () => {
    try {
      // Get username from localStorage
      const username = getCurrentUsername() || localStorage.getItem('username') || '';

      // Determine doctor name based on username
      let doctorName = 'Doctor';
      const parts = username.split('.');
      doctorName = `Dr. ${parts.map(
        part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join(' ')}`.trim();

      setCurrentUser({
        username,
        fullName: doctorName
      });
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const filteredPatients = patients.filter(patient =>
    `${patient.firstName} ${patient.lastName}`
      .toLowerCase()
      .includes(patientSearchTerm.toLowerCase())
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);

      // Create a new DataTransfer object
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      // Update the file input element with the dropped file
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;

        // Trigger change event to update any native UI
        const event = new Event('change', { bubbles: true });
        fileInputRef.current.dispatchEvent(event);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file to upload');
      return;
    }

    if (!description) {
      setUploadError('Please provide a description for the file');
      return;
    }

    if (!selectedPatient) {
      setUploadError('Please select a patient');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      console.log('Starting file upload with:', {
        patientId: selectedPatient.id,
        description,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });

      // Determine the appropriate file type based on the file extension and selected type
      let determinedFileType = fileType;

      // If the user selected 'other', try to determine a more specific type from the file
      if (determinedFileType === 'other' && selectedFile) {
        const filename = selectedFile.name.toLowerCase();
        if (filename.endsWith('.jpg') || filename.endsWith('.png') || filename.endsWith('.gif')) {
          determinedFileType = 'medical_image';
        } else if (filename.includes('xray') || filename.includes('x-ray') ||
          filename.includes('mri') || filename.includes('ct') ||
          filename.includes('scan') || filename.endsWith('.dcm')) {
          determinedFileType = 'scan';
        } else if (filename.includes('lab') || filename.includes('test') ||
          filename.includes('result')) {
          determinedFileType = 'lab_result';
        } else if (filename.includes('prescription') || filename.includes('medication')) {
          determinedFileType = 'prescription';
        } else if (filename.includes('report') || filename.includes('assessment') ||
          filename.includes('summary') || filename.includes('analysis') ||
          filename.endsWith('.txt') || filename.endsWith('.doc') || filename.endsWith('.docx')) {
          determinedFileType = 'report';
        } else if (filename.endsWith('.pdf')) {
          // Check if PDF might be a report based on name
          if (filename.includes('report') || filename.includes('summary') ||
            filename.includes('analysis') || filename.includes('assessment')) {
            determinedFileType = 'report';
          } else {
            determinedFileType = 'other';
          }
        }
      }

      // Create metadata object with patient ID and set creator_type to doctor
      const metadata = {
        file_type: determinedFileType,
        patient_id: selectedPatient.id,
        description: description,
        creator_type: 'doctor', // All uploads from this app are from doctors
        doctor: currentUser.fullName // Add doctor's name
      };

      console.log('Upload metadata:', JSON.stringify(metadata));

      const result = await uploadFile('/api/medical-reports/upload', selectedFile, metadata);

      console.log('Upload successful, result:', result);
      setUploadSuccess('File uploaded successfully!');

      // Clear form after successful upload
      setSelectedFile(null);
      setDescription('');

      // Redirect to medical reports page after a short delay
      setTimeout(() => {
        navigate('/app/medical-reports');
      }, 2000);
    } catch (error: unknown) {
      console.error("File upload error:", error);

      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        setUploadError(error.message);
      } else {
        setUploadError('An unknown error occurred during upload');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Upload Medical File</h1>
        <Link to="/app/medical-reports" className="btn btn-outline">
          Back to Reports
        </Link>
      </div>

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
          </div>
        )}

        {/* Selected Patient Display */}
        {selectedPatient && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-700">Patient</h2>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Change
              </button>
            </div>
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800">
                <span className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                {selectedPatient.email && <span className="ml-2 text-sm">({selectedPatient.email})</span>}
              </p>
            </div>
          </div>
        )}

        {/* File Upload Form */}
        {selectedPatient && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="file-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="file-type"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                >
                  {fileTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="description"
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="e.g., Chest X-ray from 01/15/2023"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading || !selectedFile || !description}
                  className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isUploading || !selectedFile || !description
                    ? 'bg-indigo-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                    }`}
                >
                  {isUploading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"></path>
                      </svg>
                      Upload Document
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File <span className="text-red-500">*</span>
              </label>
              <div
                className={`mt-1 flex flex-col justify-center items-center px-6 pt-5 pb-6 border-2 ${isDragging ? 'border-indigo-300 bg-indigo-50' : selectedFile ? 'border-green-300 bg-green-50' : 'border-gray-300'
                  } border-dashed rounded-md h-[200px]`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="mt-3 inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Change file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                          ref={fileInputRef}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, PNG, JPG, DICOM up to 32MB</p>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Files uploaded here will be visible to all healthcare providers with access to this patient's record
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {uploadSuccess && (
          <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{uploadSuccess}</span>
          </div>
        )}

        {uploadError && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{uploadError}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadMedicalFile;
