import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReportBase, { Patient, ReportBaseProps } from './ReportBase';
import apiClient from '../../utils/api';
import { getCurrentUsername } from '../../utils/authUtils';

interface TextReportProps extends ReportBaseProps {
  reportType?: 'report';
}

const TextReport: React.FC<TextReportProps> = ({
  selectedPatient,
  onPatientChange,
  onCancel,
  onSuccess,
  reportType: string = 'report'
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState<string>('');
  const [findings, setFindings] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<string>('consultation');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reportTypes = [
    { value: 'consultation', label: 'Consultation Note' },
    { value: 'progress', label: 'Progress Note' },
    { value: 'discharge', label: 'Discharge Summary' },
    { value: 'referral', label: 'Referral Letter' },
    { value: 'followup', label: 'Follow-up Note' },
    { value: 'assessment', label: 'Assessment Report' },
    { value: 'other', label: 'Other Report' }
  ];

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedPatient) {
      setSubmitError('Please select a patient');
      return;
    }

    if (!title) {
      setSubmitError('Please provide a title for the report');
      return;
    }

    if (!findings) {
      setSubmitError('Please provide findings for the report');
      return;
    }

    if (!reportDate) {
      setSubmitError('Please specify the report date');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Get current username for doctor attribution
      const username = getCurrentUsername() || '';
      let doctorName = 'Doctor';

      const parts = username.split('.');
      doctorName = `Dr. ${parts.map(
        part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join(' ')}`.trim();

      // Create report data
      const reportData = {
        patient_id: selectedPatient.id,
        title: `${reportTypes.find(t => t.value === reportType)?.label || 'Report'}: ${title}`,
        findings: findings,
        creator_type: 'doctor',
        doctor: doctorName,
        recommendations: recommendations || 'None',
        date: reportDate
      };

      // Submit report
      const response = await apiClient.post('/api/medical-reports/text', reportData);

      setSubmitSuccess('Report created successfully!');

      // Call onSuccess callback if provided
      if (onSuccess && (response.data as { id: string }).id) {
        onSuccess((response.data as { id: string }).id);
      }

      // Navigate to medical reports page after a short delay
      setTimeout(() => {
        navigate('/app/medical-reports');
      }, 1500);
    } catch (error: any) {
      console.error('Error creating report:', error);
      setSubmitError(error.message || 'Failed to create report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ReportBase
      selectedPatient={selectedPatient}
      onPatientChange={onPatientChange}
    >
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <span className="text-2xl mr-2">📝</span>
          Create Text Report
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 mb-1">
                Report Type <span className="text-red-500">*</span>
              </label>
              <select
                id="report-type"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                {reportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
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
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Report Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              placeholder="e.g., Initial Assessment, Follow-up Visit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="findings" className="block text-sm font-medium text-gray-700 mb-1">
              Findings/Observations <span className="text-red-500">*</span>
            </label>
            <textarea
              id="findings"
              rows={6}
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter detailed findings, observations, and assessment..."
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="recommendations" className="block text-sm font-medium text-gray-700 mb-1">
              Recommendations/Plan
            </label>
            <textarea
              id="recommendations"
              rows={4}
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter treatment recommendations, follow-up plan, etc."
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
            />
          </div>
        </div>

        {/* Status Messages */}
        {submitSuccess && (
          <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{submitSuccess}</span>
          </div>
        )}

        {submitError && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{submitError}</span>
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
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title || !findings || !reportDate}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isSubmitting || !title || !findings || !reportDate
              ? 'bg-indigo-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 inline-block"
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
                Saving...
              </>
            ) : (
              'Save Report'
            )}
          </button>
        </div>
      </div>
    </ReportBase>
  );
};

export default TextReport;
