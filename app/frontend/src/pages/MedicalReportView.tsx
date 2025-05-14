import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';
import {
  FaArrowLeft, FaDownload, FaTrash, FaUser, FaCalendarAlt, FaUserMd,
  FaFileMedical, FaFileImage, FaXRay, FaFlask, FaPrescriptionBottleAlt,
  FaFileAlt, FaFileContract
} from 'react-icons/fa';

interface Report {
  id: string;
  patient_name: string;
  patient_id: string;
  doctor: string;
  file_type: string;
  filename: string;
  description?: string;
  title?: string;
  findings?: string;
  recommendations?: string;
  date?: string;
  uploaded_at: string;
  file_path?: string;
  relative_path?: string;
  url?: string;
}

const MedicalReportView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Report>(`/api/medical-reports/${id}`);
      setReport(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Failed to load report. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!report) return;

    try {
      await apiClient.delete(`/api/medical-reports/${report.id}`);
      navigate('/app/medical-reports', { state: { message: 'Report deleted successfully' } });
    } catch (err) {
      console.error('Error deleting report:', err);
      setError('Failed to delete report. Please try again later.');
    }
  };

  const getReportTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'medical_image':
        return <FaFileImage className="text-blue-500" />;
      case 'scan':
        return <FaXRay className="text-indigo-500" />;
      case 'lab_result':
        return <FaFlask className="text-green-500" />;
      case 'prescription':
        return <FaPrescriptionBottleAlt className="text-red-500" />;
      case 'report':
        return <FaFileAlt className="text-purple-500" />;
      case 'other':
      default:
        return <FaFileContract className="text-gray-500" />;
    }
  };

  const getReportTypeLabel = (fileType: string) => {
    switch (fileType) {
      case 'medical_image':
        return 'Medical Image';
      case 'scan':
        return 'Medical Scan';
      case 'lab_result':
        return 'Lab Result';
      case 'prescription':
        return 'Prescription';
      case 'report':
        return 'Text Report';
      case 'other':
      default:
        return 'Other Document';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error || 'Report not found'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button and actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <FaArrowLeft className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {report.title || report.filename || getReportTypeLabel(report.file_type)}
          </h1>
        </div>
        <div className="flex space-x-2">
          <a
            href={`/api/medical-reports/download/${report.id}`}
            className="btn btn-outline flex items-center space-x-1"
            download
          >
            <FaDownload />
            <span>Download</span>
          </a>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="btn btn-outline btn-error flex items-center space-x-1"
          >
            <FaTrash />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Report metadata card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Report Information</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 text-gray-500">
                  {getReportTypeIcon(report.file_type)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{getReportTypeLabel(report.file_type)}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 text-gray-500">
                  <FaCalendarAlt />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{formatDate(report.date || report.uploaded_at)}</p>
                </div>
              </div>
              {report.description && (
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 text-gray-500">
                    <FaFileAlt />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="font-medium">{report.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Patient & Doctor</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 text-gray-500">
                  <FaUser />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Patient</p>
                  <Link
                    to={`/app/patients/${report.patient_id}`}
                    className="font-medium text-primary-600 hover:text-primary-800"
                  >
                    {report.patient_name}
                  </Link>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 text-gray-500">
                  <FaUserMd />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Doctor</p>
                  <p className="font-medium">{report.doctor}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report content based on type */}
      {renderReportContent(report)}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this report? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-error"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Function to render different report content based on type
const renderReportContent = (report: Report) => {
  switch (report.file_type) {
    case 'medical_image':
      return <MedicalImageView report={report} />;
    case 'scan':
      return <ScanView report={report} />;
    case 'lab_result':
      return <LabResultView report={report} />;
    case 'prescription':
      return <PrescriptionView report={report} />;
    case 'report':
      return <TextReportView report={report} />;
    case 'other':
    default:
      return <OtherDocumentView report={report} />;
  }
};

// Individual report type views
const MedicalImageView: React.FC<{ report: Report }> = ({ report }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <FaFileImage className="text-blue-500 mr-2" />
        Medical Image
      </h2>
      <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
        <img
          src={`http://localhost:34664/${report.relative_path}`}
          alt={report.description || "Medical image"}
          className="max-w-full max-h-[600px] object-contain rounded-lg shadow-md"
        />
        {report.description && (
          <p className="mt-4 text-gray-700 text-center max-w-2xl">{report.description}</p>
        )}
      </div>
    </div>
  );
};

const ScanView: React.FC<{ report: Report }> = ({ report }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <FaXRay className="text-indigo-500 mr-2" />
        Medical Scan
      </h2>
      <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
        <img
          src={`http://localhost:34664/${report.relative_path}`}
          alt={report.description || "Medical scan"}
          className="max-w-full max-h-[600px] object-contain rounded-lg shadow-md"
        />
        {report.description && (
          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg w-full max-w-2xl">
            <h3 className="font-medium text-indigo-800 mb-2">Scan Description</h3>
            <p className="text-gray-700">{report.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const LabResultView: React.FC<{ report: Report }> = ({ report }) => {
  // Check if it's an image or PDF
  const isImage = report.filename?.match(/\.(jpeg|jpg|gif|png)$/i);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <FaFlask className="text-green-500 mr-2" />
        Laboratory Result
      </h2>

      {isImage ? (
        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
          <img
            src={`http://localhost:34664/${report.relative_path}`}
            alt="Lab result"
            className="max-w-full max-h-[600px] object-contain rounded-lg shadow-md"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
          <div className="w-full max-w-2xl p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-center mb-4">
              <FaFileAlt className="text-4xl text-green-500" />
            </div>
            <p className="text-center text-gray-700">
              This lab result is available as a {report.filename?.split('.').pop()?.toUpperCase()} file.
            </p>
            <div className="flex justify-center mt-4">
              <a
                href={`/api/medical-reports/download/${report.id}`}
                className="btn btn-primary"
                download
              >
                Download Lab Result
              </a>
            </div>
          </div>
        </div>
      )}

      {report.description && (
        <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg">
          <h3 className="font-medium text-green-800 mb-2">Lab Result Details</h3>
          <p className="text-gray-700">{report.description}</p>
        </div>
      )}
    </div>
  );
};

const PrescriptionView: React.FC<{ report: Report }> = ({ report }) => {
  // Check if it's an image or PDF
  const isImage = report.filename?.match(/\.(jpeg|jpg|gif|png)$/i);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <FaPrescriptionBottleAlt className="text-red-500 mr-2" />
        Prescription
      </h2>

      {isImage ? (
        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
          <img
            src={`http://localhost:34664/${report.relative_path}`}
            alt="Prescription"
            className="max-w-full max-h-[600px] object-contain rounded-lg shadow-md"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
          <div className="w-full max-w-2xl p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-center mb-4">
              <FaFileAlt className="text-4xl text-red-500" />
            </div>
            <p className="text-center text-gray-700">
              This prescription is available as a {report.filename?.split('.').pop()?.toUpperCase()} file.
            </p>
            <div className="flex justify-center mt-4">
              <a
                href={`/api/medical-reports/download/${report.id}`}
                className="btn btn-primary"
                download
              >
                Download Prescription
              </a>
            </div>
          </div>
        </div>
      )}

      {report.description && (
        <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg">
          <h3 className="font-medium text-red-800 mb-2">Prescription Details</h3>
          <p className="text-gray-700">{report.description}</p>
        </div>
      )}
    </div>
  );
};

const TextReportView: React.FC<{ report: Report }> = ({ report }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <FaFileAlt className="text-purple-500 mr-2" />
        {report.title || "Text Report"}
      </h2>

      <div className="grid grid-cols-1 gap-6">
        {report.findings && (
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
            <h3 className="font-medium text-purple-800 mb-2">Findings</h3>
            <div className="text-gray-700 whitespace-pre-line">{report.findings}</div>
          </div>
        )}

        {report.recommendations && (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Recommendations</h3>
            <div className="text-gray-700 whitespace-pre-line">{report.recommendations}</div>
          </div>
        )}

        {!report.findings && !report.recommendations && report.description && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Report Content</h3>
            <div className="text-gray-700 whitespace-pre-line">{report.description}</div>
          </div>
        )}
      </div>
    </div>
  );
};

const OtherDocumentView: React.FC<{ report: Report }> = ({ report }) => {
  // Check if it's an image
  const isImage = report.filename?.match(/\.(jpeg|jpg|gif|png)$/i);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <FaFileContract className="text-gray-500 mr-2" />
        {report.title || "Document"}
      </h2>

      {isImage ? (
        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
          <img
            src={report.url}
            alt={report.description || "Document"}
            className="max-w-full max-h-[600px] object-contain rounded-lg shadow-md"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
          <div className="w-full max-w-2xl p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-center mb-4">
              <FaFileAlt className="text-4xl text-gray-500" />
            </div>
            <p className="text-center text-gray-700">
              This document is available as a {report.filename?.split('.').pop()?.toUpperCase()} file.
            </p>
            <div className="flex justify-center mt-4">
              <a
                href={`/api/medical-reports/download/${report.id}`}
                className="btn btn-primary"
                download
              >
                Download Document
              </a>
            </div>
          </div>
        </div>
      )}

      {report.description && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">Document Description</h3>
          <p className="text-gray-700">{report.description}</p>
        </div>
      )}
    </div>
  );
};

export default MedicalReportView;
