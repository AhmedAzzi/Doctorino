import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import ReportBase, { Patient, ReportBaseProps } from './ReportBase';
import { uploadFile } from '../../utils/api';
import { getCurrentUsername } from '../../utils/authUtils';

interface LabResultReportProps extends ReportBaseProps {
  reportType?: 'lab_result';
}

const LabResultReport: React.FC<LabResultReportProps> = ({
  selectedPatient,
  onPatientChange,
  onCancel,
  onSuccess,
  reportType = 'lab_result'
}) => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState<string>('');
  const [labType, setLabType] = useState<string>('blood');
  const [labDate, setLabDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().substring(0, 10)); // Report creation date
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const labTypes = [
    { value: 'blood', label: 'Blood Test' },
    { value: 'urine', label: 'Urine Analysis' },
    { value: 'stool', label: 'Stool Analysis' },
    { value: 'microbiology', label: 'Microbiology' },
    { value: 'pathology', label: 'Pathology' },
    { value: 'genetic', label: 'Genetic Test' },
    { value: 'hormone', label: 'Hormone Test' },
    { value: 'allergy', label: 'Allergy Test' },
    { value: 'toxicology', label: 'Toxicology' },
    { value: 'other', label: 'Other Lab Test' }
  ];

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  // Handle drag and drop
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

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }

      // Update file input
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        const event = new Event('change', { bubbles: true });
        fileInputRef.current.dispatchEvent(event);
      }
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedPatient) {
      setUploadError('Please select a patient');
      return;
    }

    if (!selectedFile) {
      setUploadError('Please select a lab result file to upload');
      return;
    }

    if (!description) {
      setUploadError('Please provide a description for the lab result');
      return;
    }

    if (!labDate) {
      setUploadError('Please specify the date of the lab test');
      return;
    }

    if (!reportDate) {
      setUploadError('Please specify the report date');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Get current username for doctor attribution
      const username = getCurrentUsername() || '';
      let doctorName = 'Doctor';

      const parts = username.split('.');
      doctorName = `Dr. ${parts.map(
        part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join(' ')}`.trim();

      // Create enhanced description with lab type and date
      const urgentPrefix = isUrgent ? '[URGENT] ' : '';
      const enhancedDescription = `${urgentPrefix}${labTypes.find(l => l.value === labType)?.label || 'Lab Test'} - ${labDate} - ${description}`;

      // Create metadata
      const metadata = {
        patient_id: selectedPatient.id,
        description: enhancedDescription,
        file_type: reportType,
        creator_type: 'doctor',
        doctor: doctorName,
        lab_type: labType,
        lab_date: labDate,
        is_urgent: isUrgent,
        date: reportDate // Add report date
      };

      // Upload file
      const result = await uploadFile('/api/medical-reports/upload', selectedFile, metadata);

      setUploadSuccess('Lab result uploaded successfully!');

      // Call onSuccess callback if provided
      if (onSuccess && typeof result === 'object' && result && 'id' in result) {
        onSuccess(result.id as string);
      }

      // Navigate to medical reports page after a short delay
      setTimeout(() => {
        navigate('/app/medical-reports');
      }, 1500);
    } catch (error: any) {
      console.error('Error uploading lab result:', error);
      setUploadError(error.message || 'Failed to upload lab result');
    } finally {
      setIsUploading(false);
    }
  };

  // Get file icon based on file type
  const getFileIcon = () => {
    if (!selectedFile) return null;

    if (selectedFile.type.startsWith('image/')) {
      return filePreview;
    } else if (selectedFile.type === 'application/pdf') {
      return '📄';
    } else if (selectedFile.type.includes('excel') || selectedFile.type.includes('spreadsheet')) {
      return '📊';
    } else if (selectedFile.type.includes('word') || selectedFile.type.includes('document')) {
      return '📝';
    } else {
      return '🧪';
    }
  };

  return (
    <ReportBase
      selectedPatient={selectedPatient}
      onPatientChange={onPatientChange}
    >
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <span className="text-2xl mr-2">🧪</span>
          Lab Result Upload
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="lab-type" className="block text-sm font-medium text-gray-700 mb-1">
                Lab Test Type <span className="text-red-500">*</span>
              </label>
              <select
                id="lab-type"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={labType}
                onChange={(e) => setLabType(e.target.value)}
              >
                {labTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="lab-date" className="block text-sm font-medium text-gray-700 mb-1">
                Test Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="lab-date"
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                value={labDate}
                onChange={(e) => setLabDate(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="report-date" className="block text-sm font-medium text-gray-700 mb-1">
                Report Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="report-date"
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Test Details <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                rows={3}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="e.g., Complete Blood Count with differential"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center">
              <input
                id="is-urgent"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
              />
              <label htmlFor="is-urgent" className="ml-2 block text-sm text-gray-900">
                Mark as urgent
              </label>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || !selectedFile || !description || !labDate || !reportDate}
                className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isUploading || !selectedFile || !description || !labDate || !reportDate
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
                    Upload Lab Result
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lab Result File <span className="text-red-500">*</span>
            </label>
            <div
              className={`mt-1 flex flex-col justify-center items-center px-6 pt-5 pb-6 border-2 ${isDragging
                ? 'border-indigo-300 bg-indigo-50'
                : selectedFile
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300'
                } border-dashed rounded-md h-[250px]`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="text-center w-full h-full flex flex-col items-center justify-center">
                  {filePreview ? (
                    <div className="relative w-full h-[180px] mb-2">
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="max-h-[180px] max-w-full object-contain mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center mb-4 text-5xl">
                      {getFileIcon()}
                    </div>
                  )}
                  <p className="text-sm font-medium text-gray-900">{selectedFile?.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                      <span>Upload lab result</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept="image/*,.pdf,.xlsx,.xls,.csv,.doc,.docx"
                        className="sr-only"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF, PNG, JPG, Excel, Word up to 10MB</p>
                </div>
              )}
            </div>

            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                PDF format is recommended for lab results to preserve formatting.
              </p>
            </div>
          </div>
        </div>

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

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onCancel || (() => navigate('/app/medical-reports'))}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </ReportBase>
  );
};

export default LabResultReport;
