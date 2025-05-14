import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartPulse,
  faXRay,
  faRobot,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import apiClient from '../utils/api';

interface AIModel {
  id: string;
  title: string;
  description: string;
  icon: any;
  route: string;
  bgGradient: string;
  isNew?: boolean;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  specialization?: string;
}

const AIModels: React.FC = () => {
  const [specialty, setSpecialty] = useState<string>('');
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get the current username from localStorage
    const currentUsername = localStorage.getItem('username') || '';

    // Fetch user data to get specialty
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<UserData>('/api/auth/doctors/me');

        // Get the user's specialty
        const userSpecialty = response.data.specialization || '';
        setSpecialty(userSpecialty);

        // Define all available AI models
        const allModels: AIModel[] = [
          {
            id: 'ecg',
            title: 'ECG Analysis',
            description: 'AI-powered ECG signal analysis for cardiac abnormality detection',
            icon: faHeartPulse,
            route: '/app/ecg_analyze',
            bgGradient: 'from-blue-600 to-blue-500',
          },
          {
            id: 'mammography',
            title: 'Mammography Analysis',
            description: 'AI-powered mammogram analysis for breast density classification',
            icon: faXRay,
            route: '/app/mammography_analyze',
            bgGradient: 'from-pink-600 to-pink-500',
          },
          // More models can be added here in the future
        ];

        // Determine which models to show based on specialty
        let filteredModels: AIModel[] = [];

        if (userSpecialty === 'Mammography') {
          // For Mammography specialists, show ONLY mammography
          const mammographyModel = allModels.find(model => model.id === 'mammography');

          if (mammographyModel) {
            filteredModels = [mammographyModel];
          } else {
            filteredModels = [];
          }
        } else if (userSpecialty === 'Cardiologist') {
          // For Cardiologists, show ONLY ECG
          const ecgModel = allModels.find(model => model.id === 'ecg');

          if (ecgModel) {
            filteredModels = [ecgModel];
          } else {
            filteredModels = [];
          }
        } else {
          // For other specialties or if specialty is not set, show all models
          filteredModels = allModels;
        }

        setAiModels(filteredModels);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data. Please try again later.');
        setLoading(false);

        // Fallback to username-based filtering if API call fails
        const allModels: AIModel[] = [
          {
            id: 'ecg',
            title: 'ECG Analysis',
            description: 'AI-powered ECG signal analysis for cardiac abnormality detection',
            icon: faHeartPulse,
            route: '/app/ecg_analyze',
            bgGradient: 'from-blue-600 to-blue-500',
          },
          {
            id: 'mammography',
            title: 'Mammography Analysis',
            description: 'AI-powered mammogram analysis for breast density classification',
            icon: faXRay,
            route: '/app/mammography_analyze',
            bgGradient: 'from-pink-600 to-pink-500',
          },
        ];

        // Fallback to username-based filtering
        let filteredModels: AIModel[] = [];

        if (currentUsername === 'soumia.rokia') {
          const mammographyModel = allModels.find(model => model.id === 'mammography');
          filteredModels = mammographyModel ? [mammographyModel] : [];
        } else if (currentUsername === 'ahmed.azzi') {
          const ecgModel = allModels.find(model => model.id === 'ecg');
          filteredModels = ecgModel ? [ecgModel] : [];
        } else {
          filteredModels = allModels;
        }

        setAiModels(filteredModels);
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      ) : (
        <>
          <header className="mb-10 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              <FontAwesomeIcon icon={faRobot} className="text-blue-500 mr-3" />
              AI Assistant Models
            </h1>
            {specialty === 'Cardiologist' ? (
              <p className="text-gray-600 max-w-2xl mx-auto">
                Access our cardiology-focused AI tools designed to assist with ECG analysis and cardiac diagnostics.
              </p>
            ) : specialty === 'Mammography' ? (
              <p className="text-gray-600 max-w-2xl mx-auto">
                Access our mammography-focused AI tools designed to assist with breast imaging analysis and diagnostics.
              </p>
            ) : (
              <p className="text-gray-600 max-w-2xl mx-auto">
                Access our suite of AI-powered diagnostic tools designed to assist healthcare professionals in making more accurate and efficient diagnoses.
              </p>
            )}
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {aiModels.map((model) => (
              <div
                key={model.id}
                className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg relative"
              >
                {model.isNew && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      New
                    </span>
                  </div>
                )}
                <div className={`p-6 bg-gradient-to-r ${model.bgGradient} text-white`}>
                  <h2 className="text-xl font-semibold flex items-center">
                    <FontAwesomeIcon icon={model.icon} className="mr-3" />
                    {model.title}
                  </h2>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-6">
                    {model.description}
                  </p>
                  <Link
                    to={model.route}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Launch Tool
                    <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Future Models Section - Conditionally show based on specialty */}
          <div className="mt-16 bg-gray-50 rounded-xl p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Coming Soon</h2>
            <p className="text-gray-600 mb-6">
              We're continuously working on expanding our AI capabilities. Stay tuned for these upcoming models:
            </p>

            {specialty === 'Cardiologist' ? (
              // Cardiology-focused future models
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 mr-3">
                    <FontAwesomeIcon icon={faRobot} className="h-3 w-3" />
                  </span>
                  <span>Advanced ECG Interpretation - Deep learning model for complex arrhythmia detection</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 mr-3">
                    <FontAwesomeIcon icon={faRobot} className="h-3 w-3" />
                  </span>
                  <span>Cardiac MRI Analysis - AI-powered cardiac structure and function assessment</span>
                </li>
              </ul>
            ) : specialty === 'Mammography' ? (
              // Mammography-focused future models
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 mr-3">
                    <FontAwesomeIcon icon={faRobot} className="h-3 w-3" />
                  </span>
                  <span>Advanced Lesion Detection - Improved detection of subtle breast lesions</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 mr-3">
                    <FontAwesomeIcon icon={faRobot} className="h-3 w-3" />
                  </span>
                  <span>3D Tomosynthesis Analysis - AI model for volumetric breast imaging</span>
                </li>
              </ul>
            ) : (
              // General future models for other specialties
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 mr-3">
                    <FontAwesomeIcon icon={faRobot} className="h-3 w-3" />
                  </span>
                  <span>Chest X-Ray Analysis - AI-powered detection of lung abnormalities</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 mr-3">
                    <FontAwesomeIcon icon={faRobot} className="h-3 w-3" />
                  </span>
                  <span>Skin Lesion Classification - Melanoma and skin condition detection</span>
                </li>
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AIModels;
