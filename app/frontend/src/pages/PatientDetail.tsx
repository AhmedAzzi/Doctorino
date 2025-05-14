import React, { useEffect, useState, ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../utils/api';
import {
  FaUser, FaCalendarAlt, FaVenusMars, FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaIdCard, FaMedkit, FaHeartbeat, FaWeight, FaRulerVertical, FaCalculator,
  FaSmoking, FaWineGlass, FaRunning, FaAllergies, FaPills, FaVial, FaFileMedical,
  FaEdit, FaSave, FaTimes, FaArrowLeft, FaClipboardList, FaUserMd
} from 'react-icons/fa';
import PatientReports from '../components/PatientReports';

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: string;
  patient_id: string;
  patient_name?: string;
  doctor_id?: string;
  doctor_name?: string;
  reason?: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  address?: string;
  national_id?: string;
  health_insurance?: string;

  // Medical Snapshot
  blood_info?: {
    blood_group?: string;
    rh_factor?: string;
    anemia?: string;
    bleeding_disorders?: string;
  };

  // Allergies & Medications
  allergies_medications?: {
    drug_allergies?: string[];
    current_medications?: Array<{ name: string; dosage: string; frequency: string }>;
    supplements?: string[];
  };

  // Vitals & Habits
  blood_pressure?: {
    last_bp_systolic?: number;
    last_bp_diastolic?: number;
  };
  height?: number;
  weight?: number;
  bmi?: number;

  // Lifestyle
  lifestyle?: {
    smoking?: string;
    alcohol_consumption?: string;
    physical_activity?: string;
  };

  // Medical History
  medical_history?: {
    surgeries?: Array<{ procedure: string; date: string; notes: string }>;
    hospitalizations?: Array<{ reason: string; date: string; duration: string }>;
    family_history?: {
      heart_disease?: boolean;
      diabetes?: boolean;
      cancer?: boolean;
      other?: string;
    };
  };

  // Female-Specific Info
  gynecological?: {
    pregnancy_status?: string;
    last_menstrual_period?: string;
    contraceptive_use?: string;
  };

  // For compatibility with AddPatient.tsx
  allergies?: string[];
  chronic_conditions?: string[];
  medications?: {
    current_medications?: Array<{ name: string; dosage: string; frequency: string }>;
    supplements?: string[];
  };
}

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [editablePatientData, setEditablePatientData] = useState<Patient | null>(null); // State for editable data
  const [isEditing, setIsEditing] = useState(false); // State for edit mode
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null); // State for save errors
  const [appointments, setAppointments] = useState<Appointment[]>([]); // State for patient appointments
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  // State for temporary values in edit mode
  const [tempMedication, setTempMedication] = useState({ name: '', dosage: '', frequency: '' });
  const [tempSupplement, setTempSupplement] = useState('');
  const [tempAllergy, setTempAllergy] = useState('');
  const [tempChronicCondition, setTempChronicCondition] = useState('');
  const [tempSurgery, setTempSurgery] = useState({ procedure: '', date: '', notes: '' });
  const [tempHospitalization, setTempHospitalization] = useState({ reason: '', date: '', duration: '' });
  const [activeSection, setActiveSection] = useState<string>('personal');

  // Function to fetch patient appointments
  const fetchAppointments = async (patientId: string) => {
    setAppointmentsLoading(true);
    setAppointmentsError(null);
    try {
      const response = await apiClient.get<Appointment[]>(`/api/appointments?patient_id=${patientId}`);
      setAppointments(response.data);
      setAppointmentsLoading(false);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setAppointmentsError('Failed to fetch patient appointments.');
      setAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    const fetchPatient = async () => {
      setLoading(true);
      setError(null);
      setSaveError(null); // Clear save error on load
      try {
        // Try to fetch detailed patient information first
        try {
          const response = await apiClient.get<Patient>(`/api/patients/detailed/${id}`);
          setPatient(response.data);

          // Initialize editable data with default values for medical fields if they don't exist
          const patientWithDefaults = {
            ...response.data,
            blood_info: response.data.blood_info || {},
            blood_pressure: response.data.blood_pressure || {},
            allergies_medications: response.data.allergies_medications || {
              drug_allergies: [],
              current_medications: [],
              supplements: []
            },
            lifestyle: response.data.lifestyle || {},
            height: response.data.height || 0,
            weight: response.data.weight || 0
          };

          // Add gynecological info for female patients
          if (response.data.gender === 'Female') {
            patientWithDefaults.gynecological = response.data.gynecological || {};
          }

          setEditablePatientData(patientWithDefaults);
          setLoading(false);

          // After successfully fetching patient, fetch their appointments
          if (response.data && response.data.id) {
            fetchAppointments(response.data.id);
          }
        } catch (detailedErr) {
          // If detailed endpoint fails, fall back to basic patient endpoint
          console.warn("Detailed patient fetch failed, falling back to basic endpoint:", detailedErr);
          const basicResponse = await apiClient.get<Patient>(`/api/patients/${id}`);
          setPatient(basicResponse.data);

          // Initialize editable data with default values for medical fields if they don't exist
          const patientWithDefaults = {
            ...basicResponse.data,
            blood_info: basicResponse.data.blood_info || {},
            blood_pressure: basicResponse.data.blood_pressure || {},
            allergies_medications: basicResponse.data.allergies_medications || {
              drug_allergies: [],
              current_medications: [],
              supplements: []
            },
            lifestyle: basicResponse.data.lifestyle || {},
            height: basicResponse.data.height || 0,
            weight: basicResponse.data.weight || 0
          };

          // Add gynecological info for female patients
          if (basicResponse.data.gender === 'Female') {
            patientWithDefaults.gynecological = basicResponse.data.gynecological || {};
          }

          setEditablePatientData(patientWithDefaults);
          setLoading(false);

          // After successfully fetching patient, fetch their appointments
          if (basicResponse.data && basicResponse.data.id) {
            fetchAppointments(basicResponse.data.id);
          }
        }
      } catch (err) {
        console.error("Error fetching patient:", err);
        setError('Failed to fetch patient details.');
        setLoading(false);
      }
    };

    fetchPatient();
  }, [id]);

  const handleEditToggle = () => {
    if (isEditing && patient) {
      // If canceling, reset editable data to original patient data
      setEditablePatientData(patient);
      setSaveError(null); // Clear any previous save errors
    } else if (!isEditing && patient) {
      // When entering edit mode, ensure all medical fields are initialized
      const patientWithDefaults = {
        ...patient,
        blood_info: patient.blood_info || {},
        blood_pressure: patient.blood_pressure || {},
        allergies_medications: patient.allergies_medications || {
          drug_allergies: [],
          current_medications: [],
          supplements: []
        },
        lifestyle: patient.lifestyle || {},
        height: patient.height || 0,
        weight: patient.weight || 0
      };

      // Add gynecological info for female patients
      if (patient.gender === 'Female') {
        patientWithDefaults.gynecological = patient.gynecological || {};
      }

      setEditablePatientData(patientWithDefaults);
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (editablePatientData) {
      const { name, value } = e.target;

      // Handle nested properties
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        const parentValue = editablePatientData[parent as keyof Patient];
        if (parentValue && typeof parentValue === 'object') {
          setEditablePatientData({
            ...editablePatientData,
            [parent]: {
              ...parentValue,
              [child]: value,
            },
          });
        }
      } else {
        setEditablePatientData({ ...editablePatientData, [name]: value });
      }
    }
  };

  // Handle blood info changes
  const handleBloodInfoChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (editablePatientData) {
      const { name, value } = e.target;
      setEditablePatientData({
        ...editablePatientData,
        blood_info: {
          ...editablePatientData.blood_info || {},
          [name]: value,
        },
      });
    }
  };

  // Handle blood pressure changes
  const handleBPChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (editablePatientData) {
      const { name, value } = e.target;
      setEditablePatientData({
        ...editablePatientData,
        blood_pressure: {
          ...editablePatientData.blood_pressure || {},
          [name]: parseInt(value) || 0,
        },
      });
    }
  };

  // Handle lifestyle changes
  const handleLifestyleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (editablePatientData) {
      const { name, value } = e.target;
      setEditablePatientData({
        ...editablePatientData,
        lifestyle: {
          ...editablePatientData.lifestyle || {},
          [name]: value,
        },
      });
    }
  };

  // Handle gynecological changes
  const handleGynecologicalChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editablePatientData) {
      const { name, value } = e.target;
      setEditablePatientData({
        ...editablePatientData,
        gynecological: {
          ...editablePatientData.gynecological || {},
          [name]: value,
        },
      });
    }
  };

  // Add medication to the list
  const handleAddMedication = () => {
    if (editablePatientData && tempMedication.name && tempMedication.dosage && tempMedication.frequency) {
      // Initialize allergies_medications if it doesn't exist
      const allergies_medications = editablePatientData.allergies_medications || {
        drug_allergies: [],
        current_medications: [],
        supplements: []
      };

      // Initialize current_medications if it doesn't exist
      const current_medications = allergies_medications.current_medications || [];

      setEditablePatientData({
        ...editablePatientData,
        allergies_medications: {
          ...allergies_medications,
          current_medications: [...current_medications, { ...tempMedication }],
        },
      });

      setTempMedication({ name: '', dosage: '', frequency: '' });
    }
  };

  // Remove medication from the list
  const handleRemoveMedication = (index: number) => {
    if (editablePatientData && editablePatientData.allergies_medications?.current_medications) {
      const updatedMedications = [...editablePatientData.allergies_medications.current_medications];
      updatedMedications.splice(index, 1);

      setEditablePatientData({
        ...editablePatientData,
        allergies_medications: {
          ...editablePatientData.allergies_medications,
          current_medications: updatedMedications,
        },
      });
    }
  };

  // Add supplement to the list
  const handleAddSupplement = () => {
    if (editablePatientData && tempSupplement) {
      // Initialize allergies_medications if it doesn't exist
      const allergies_medications = editablePatientData.allergies_medications || {
        drug_allergies: [],
        current_medications: [],
        supplements: []
      };

      // Initialize supplements if it doesn't exist
      const supplements = allergies_medications.supplements || [];

      setEditablePatientData({
        ...editablePatientData,
        allergies_medications: {
          ...allergies_medications,
          supplements: [...supplements, tempSupplement],
        },
      });

      setTempSupplement('');
    }
  };

  // Remove supplement from the list
  const handleRemoveSupplement = (index: number) => {
    if (editablePatientData && editablePatientData.allergies_medications?.supplements) {
      const updatedSupplements = [...editablePatientData.allergies_medications.supplements];
      updatedSupplements.splice(index, 1);

      setEditablePatientData({
        ...editablePatientData,
        allergies_medications: {
          ...editablePatientData.allergies_medications,
          supplements: updatedSupplements,
        },
      });
    }
  };

  // Add allergy to the list
  const handleAddAllergy = () => {
    if (editablePatientData && tempAllergy) {
      // Initialize allergies_medications if it doesn't exist
      const allergies_medications = editablePatientData.allergies_medications || {
        drug_allergies: [],
        current_medications: [],
        supplements: []
      };

      // Initialize drug_allergies if it doesn't exist
      const drug_allergies = allergies_medications.drug_allergies || [];

      setEditablePatientData({
        ...editablePatientData,
        allergies_medications: {
          ...allergies_medications,
          drug_allergies: [...drug_allergies, tempAllergy],
        },
      });

      setTempAllergy('');
    }
  };

  // Remove allergy from the list
  const handleRemoveAllergy = (index: number) => {
    if (editablePatientData && editablePatientData.allergies_medications?.drug_allergies) {
      const updatedAllergies = [...editablePatientData.allergies_medications.drug_allergies];
      updatedAllergies.splice(index, 1);

      setEditablePatientData({
        ...editablePatientData,
        allergies_medications: {
          ...editablePatientData.allergies_medications,
          drug_allergies: updatedAllergies,
        },
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!editablePatientData) return;
    setSaveError(null); // Clear previous errors

    // Basic validation example (can be expanded)
    if (!editablePatientData.firstName || !editablePatientData.lastName) {
      setSaveError('First name and last name cannot be empty.');
      return;
    }

    try {
      // Calculate BMI if height and weight are provided
      let calculatedBMI = editablePatientData.bmi;
      if (editablePatientData.height && editablePatientData.weight) {
        const heightInMeters = editablePatientData.height / 100; // Convert cm to meters
        calculatedBMI = Math.round((editablePatientData.weight / (heightInMeters * heightInMeters)) * 10) / 10;
      }

      // Format the data for the API
      const patientData = {
        // Basic Information (required fields)
        firstName: editablePatientData.firstName,
        lastName: editablePatientData.lastName,
        gender: editablePatientData.gender,
        email: editablePatientData.email,
        phone: editablePatientData.phone,
        date_of_birth: editablePatientData.date_of_birth,

        // Optional fields - only include if they have values
        ...(editablePatientData.address ? { address: editablePatientData.address } : {}),
        ...(editablePatientData.national_id ? { national_id: editablePatientData.national_id } : {}),
        ...(editablePatientData.health_insurance ? { health_insurance: editablePatientData.health_insurance } : {}),


        // Only include blood info if at least one field is filled
        ...(editablePatientData.blood_info?.blood_group || editablePatientData.blood_info?.rh_factor ?
          {
            blood_info: {
              ...(editablePatientData.blood_info?.blood_group ? { blood_group: editablePatientData.blood_info.blood_group } : {}),
              ...(editablePatientData.blood_info?.rh_factor ? { rh_factor: editablePatientData.blood_info.rh_factor } : {}),
              ...(editablePatientData.blood_info?.anemia ? { anemia: editablePatientData.blood_info.anemia } : {}),
              ...(editablePatientData.blood_info?.bleeding_disorders ? { bleeding_disorders: editablePatientData.blood_info.bleeding_disorders } : {})
            }
          } : {}),

        // Only include blood pressure if values are non-zero
        ...(editablePatientData.blood_pressure?.last_bp_systolic || editablePatientData.blood_pressure?.last_bp_diastolic ?
          {
            blood_pressure: {
              ...(editablePatientData.blood_pressure?.last_bp_systolic ? { last_bp_systolic: editablePatientData.blood_pressure.last_bp_systolic } : {}),
              ...(editablePatientData.blood_pressure?.last_bp_diastolic ? { last_bp_diastolic: editablePatientData.blood_pressure.last_bp_diastolic } : {})
            }
          } : {}),

        // Always include height/weight/bmi if they exist, even if they're zero
        // This ensures these fields are explicitly sent to the backend
        height: editablePatientData.height || 0,
        weight: editablePatientData.weight || 0,
        ...(calculatedBMI ? { bmi: calculatedBMI } : {}),

        // Only include allergies_medications if there are any
        ...((editablePatientData.allergies_medications?.drug_allergies && editablePatientData.allergies_medications.drug_allergies.length > 0) ||
          (editablePatientData.allergies_medications?.current_medications && editablePatientData.allergies_medications.current_medications.length > 0) ||
          (editablePatientData.allergies_medications?.supplements && editablePatientData.allergies_medications.supplements.length > 0) ?
          {
            allergies_medications: {
              ...(editablePatientData.allergies_medications?.drug_allergies && editablePatientData.allergies_medications.drug_allergies.length > 0 ?
                { drug_allergies: editablePatientData.allergies_medications.drug_allergies } : {}),
              ...(editablePatientData.allergies_medications?.current_medications && editablePatientData.allergies_medications.current_medications.length > 0 ?
                { current_medications: editablePatientData.allergies_medications.current_medications } : {}),
              ...(editablePatientData.allergies_medications?.supplements && editablePatientData.allergies_medications.supplements.length > 0 ?
                { supplements: editablePatientData.allergies_medications.supplements } : {})
            }
          } : {}),

        // Only include lifestyle if at least one field is filled
        ...(editablePatientData.lifestyle?.smoking || editablePatientData.lifestyle?.alcohol_consumption || editablePatientData.lifestyle?.physical_activity ?
          {
            lifestyle: {
              ...(editablePatientData.lifestyle?.smoking ? { smoking: editablePatientData.lifestyle.smoking } : {}),
              ...(editablePatientData.lifestyle?.alcohol_consumption ? { alcohol_consumption: editablePatientData.lifestyle.alcohol_consumption } : {}),
              ...(editablePatientData.lifestyle?.physical_activity ? { physical_activity: editablePatientData.lifestyle.physical_activity } : {})
            }
          } : {}),

        // Only include gynecological info for female patients and if at least one field is filled
        ...(editablePatientData.gender === 'Female' &&
          (editablePatientData.gynecological?.pregnancy_status ||
            editablePatientData.gynecological?.last_menstrual_period ||
            editablePatientData.gynecological?.contraceptive_use) ?
          {
            gynecological: {
              ...(editablePatientData.gynecological?.pregnancy_status ? { pregnancy_status: editablePatientData.gynecological.pregnancy_status } : {}),
              ...(editablePatientData.gynecological?.last_menstrual_period ? { last_menstrual_period: editablePatientData.gynecological.last_menstrual_period } : {}),
              ...(editablePatientData.gynecological?.contraceptive_use ? { contraceptive_use: editablePatientData.gynecological.contraceptive_use } : {})
            }
          } : {})
      };

      console.log('Saving patient data:', patientData);
      // Log the height and weight specifically to verify they're being included
      console.log('Height:', patientData.height, 'Weight:', patientData.weight);

      // Try to use the detailed endpoint first
      try {
        // Use the detailed endpoint for updating
        const response = await apiClient.put<Patient>(`/api/patients/detailed/${id}`, patientData);
        // Assuming the API returns the updated patient data
        setPatient(response.data);
        setEditablePatientData(response.data);
        setIsEditing(false); // Exit edit mode
      } catch (detailedErr) {
        // If detailed endpoint fails, fall back to basic endpoint
        console.warn("Detailed patient update failed, falling back to basic endpoint:", detailedErr);
        const basicResponse = await apiClient.put<Patient>(`/api/patients/${id}`, {
          firstName: editablePatientData.firstName,
          lastName: editablePatientData.lastName,
          gender: editablePatientData.gender,
          email: editablePatientData.email,
          phone: editablePatientData.phone
        });
        setPatient(basicResponse.data);
        setEditablePatientData(basicResponse.data);
        setIsEditing(false); // Exit edit mode
      }
    } catch (err: any) {
      console.error("Error saving patient:", err);
      // Provide more specific error if possible (e.g., from API response)
      if (err.response && err.response.data && err.response.data.detail) {
        setSaveError(`Failed to save changes: ${err.response.data.detail}`);
      } else {
        setSaveError('Failed to save changes. Please check the details and try again.');
      }
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
  if (error) return <div className="text-center text-red-600 mt-10">Error: {error}</div>;
  if (!patient || !editablePatientData) return <div className="text-center mt-10">Patient not found</div>;

  // Appointments data is now fetched from the API

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Sticky Header with Patient Info */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm shadow-md rounded-lg p-4 mb-6 transition-all duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl shadow-lg">
              <FaUser />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                {isEditing ? `${editablePatientData.firstName} ${editablePatientData.lastName}` : `${patient.firstName} ${patient.lastName}`}
                {patient.gender === 'Male' ?
                  <span className="ml-2 text-blue-500"><FaVenusMars /></span> :
                  patient.gender === 'Female' ?
                    <span className="ml-2 text-pink-500"><FaVenusMars /></span> :
                    null
                }
              </h1>
              <div className="flex items-center text-gray-600 mt-1">
                <FaIdCard className="mr-1" />
                <span className="mr-4">ID: {patient.id.substring(0, 8)}</span>
                {patient.date_of_birth && (
                  <>
                    <FaCalendarAlt className="mr-1" />
                    <span>{patient.date_of_birth}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex space-x-2 flex-shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveChanges}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out shadow-md flex items-center"
                >
                  <FaSave className="mr-2" /> Save Changes
                </button>
                <button
                  onClick={handleEditToggle}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out shadow-md flex items-center"
                >
                  <FaTimes className="mr-2" /> Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEditToggle}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out shadow-md flex items-center"
                >
                  <FaEdit className="mr-2" /> Edit Patient
                </button>
                <Link
                  to="/app/patients"
                  className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out shadow-md flex items-center"
                >
                  <FaArrowLeft className="mr-2" /> Back to List
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {saveError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md mb-6 animate-pulse" role="alert">
          <div className="flex items-center">
            <div className="py-1">
              <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Error!</p>
              <p>{saveError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabbed Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveSection('personal')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeSection === 'personal'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <FaUser className="mr-2" /> Personal Information
            </button>
            <button
              onClick={() => setActiveSection('appointments')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeSection === 'appointments'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <FaCalendarAlt className="mr-2" /> Appointments
            </button>
            <button
              onClick={() => setActiveSection('medical')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeSection === 'medical'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <FaMedkit className="mr-2" /> Medical Information
            </button>
            <button
              onClick={() => setActiveSection('lifestyle')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeSection === 'lifestyle'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <FaRunning className="mr-2" /> Lifestyle
            </button>
            {patient.gender === 'Female' && (
              <button
                onClick={() => setActiveSection('gynecological')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeSection === 'gynecological'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <FaVenusMars className="mr-2" /> Gynecological
              </button>
            )}
            <button
              onClick={() => setActiveSection('files')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeSection === 'files'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <FaFileMedical className="mr-2" /> Medical Reports
            </button>
          </nav>
        </div>
      </div>

      {/* Personal Information Section */}
      {activeSection === 'personal' && (
        <div className="bg-white shadow-lg rounded-xl p-6 transition-all duration-300 transform hover:shadow-xl">
          <div className="flex items-center mb-4">
            <FaUser className="text-indigo-600 mr-2 text-xl" />
            <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaUser className="text-gray-500 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    name="firstName"
                    value={editablePatientData.firstName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                  />
                ) : (
                  <p className="text-gray-800 text-lg font-medium">{patient.firstName}</p>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaUser className="text-gray-500 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    name="lastName"
                    value={editablePatientData.lastName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                  />
                ) : (
                  <p className="text-gray-800 text-lg font-medium">{patient.lastName}</p>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaCalendarAlt className="text-gray-500 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                </div>
                {isEditing ? (
                  <input
                    type="date"
                    name="date_of_birth"
                    value={editablePatientData.date_of_birth || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                  />
                ) : (
                  <p className="text-gray-800 text-lg font-medium">{patient.date_of_birth || 'Not provided'}</p>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaVenusMars className="text-gray-500 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                </div>
                {isEditing ? (
                  <select
                    name="gender"
                    value={editablePatientData.gender}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white transition-colors duration-200"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <p className="text-gray-800 text-lg font-medium">{patient.gender}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaEnvelope className="text-gray-500 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                </div>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={editablePatientData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                  />
                ) : (
                  <p className="text-gray-800 text-lg font-medium">{patient.email}</p>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaPhone className="text-gray-500 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                </div>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={editablePatientData.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                  />
                ) : (
                  <p className="text-gray-800 text-lg font-medium">{patient.phone}</p>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaMapMarkerAlt className="text-gray-500 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                </div>
                {isEditing ? (
                  <textarea
                    name="address"
                    value={editablePatientData.address || ''}
                    onChange={handleInputChange}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                  />
                ) : (
                  <p className="text-gray-800 text-lg font-medium">{patient.address || 'Not provided'}</p>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaIdCard className="text-gray-500 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">National ID</label>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    name="national_id"
                    value={editablePatientData.national_id || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                  />
                ) : (
                  <p className="text-gray-800 text-lg font-medium">{patient.national_id || 'Not provided'}</p>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaMedkit className="text-gray-500 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">Health Insurance</label>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    name="health_insurance"
                    value={editablePatientData.health_insurance || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                  />
                ) : (
                  <p className="text-gray-800 text-lg font-medium">{patient.health_insurance || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointments Section */}
      {activeSection === 'appointments' && (
        <div className="bg-white shadow-lg rounded-xl p-6 transition-all duration-300 transform hover:shadow-xl">
          <div className="flex items-center mb-4">
            <FaCalendarAlt className="text-indigo-600 mr-2 text-xl" />
            <h2 className="text-xl font-semibold text-gray-800">Appointments</h2>
          </div>
          {appointmentsLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : appointmentsError ? (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md mb-6" role="alert">
              <div className="flex items-center">
                <div className="py-1">
                  <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold">Error!</p>
                  <p>{appointmentsError}</p>
                </div>
              </div>
            </div>
          ) : appointments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map(app => (
                <div key={app.id} className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className={`h-3 w-3 rounded-full mr-2 ${app.status.toLowerCase() === 'completed' ? 'bg-green-500' :
                        app.status.toLowerCase() === 'pending' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></div>
                      <span className={`capitalize font-medium ${app.status.toLowerCase() === 'completed' ? 'text-green-600' :
                        app.status.toLowerCase() === 'pending' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>{app.status}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        <FaCalendarAlt className="inline mr-1" /> {app.date}
                      </div>
                      <div className="text-sm text-gray-500">
                        <svg className="inline h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {app.time}
                      </div>
                    </div>
                  </div>

                  {app.doctor_name && (
                    <div className="mt-2 flex items-center text-gray-700">
                      <FaUserMd className="mr-1 text-indigo-500" />
                      <span>{app.doctor_name}</span>
                    </div>
                  )}

                  {app.reason && (
                    <div className="mt-2 text-gray-700">
                      <div className="font-medium">Reason:</div>
                      <p className="text-sm">{app.reason}</p>
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <Link
                      to={`/app/appointments/${app.id}`}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
              <p className="mt-1 text-sm text-gray-500">No appointments have been scheduled for this patient yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Medical Information Section */}
      {activeSection === 'medical' && (
        <div className="bg-white shadow-lg rounded-xl p-6 transition-all duration-300 transform hover:shadow-xl">
          <div className="flex items-center mb-4">
            <FaMedkit className="text-indigo-600 mr-2 text-xl" />
            <h2 className="text-xl font-semibold text-gray-800">Medical Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Blood Information */}
            <div className="bg-gray-50 p-5 rounded-lg shadow-sm">
              <div className="flex items-center mb-3">
                <FaVial className="text-red-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Blood Information</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <div className="flex items-center mb-2">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-red-800 mr-2 text-xs font-medium">
                      BG
                    </span>
                    <label className="block text-sm font-medium text-gray-700">Blood Group</label>
                  </div>
                  {isEditing ? (
                    <select
                      name="blood_group"
                      value={editablePatientData.blood_info?.blood_group || ''}
                      onChange={(e) => handleBloodInfoChange(e)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white transition-colors duration-200"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                    </select>
                  ) : (
                    <p className="text-gray-800 text-lg font-medium">
                      {patient.blood_info?.blood_group ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          {patient.blood_info.blood_group}
                        </span>
                      ) : (
                        'Not provided'
                      )}
                    </p>
                  )}
                </div>
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <div className="flex items-center mb-2">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-red-800 mr-2 text-xs font-medium">
                      Rh
                    </span>
                    <label className="block text-sm font-medium text-gray-700">Rh Factor</label>
                  </div>
                  {isEditing ? (
                    <select
                      name="rh_factor"
                      value={editablePatientData.blood_info?.rh_factor || ''}
                      onChange={(e) => handleBloodInfoChange(e)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white transition-colors duration-200"
                    >
                      <option value="">Select Rh Factor</option>
                      <option value="Positive">Positive (+)</option>
                      <option value="Negative">Negative (-)</option>
                    </select>
                  ) : (
                    <p className="text-gray-800 text-lg font-medium">
                      {patient.blood_info?.rh_factor ? (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${patient.blood_info.rh_factor === 'Positive' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {patient.blood_info.rh_factor}
                        </span>
                      ) : (
                        'Not provided'
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Vitals */}
            <div className="bg-gray-50 p-5 rounded-lg shadow-sm">
              <div className="flex items-center mb-3">
                <FaHeartbeat className="text-pink-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Vitals</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <div className="flex items-center mb-2">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-pink-100 text-pink-800 mr-2 text-xs font-medium">
                      BP
                    </span>
                    <label className="block text-sm font-medium text-gray-700">Blood Pressure</label>
                  </div>
                  {isEditing ? (
                    <div className="flex space-x-2 items-center">
                      <input
                        type="number"
                        name="last_bp_systolic"
                        value={editablePatientData.blood_pressure?.last_bp_systolic || ''}
                        onChange={(e) => handleBPChange(e)}
                        placeholder="Systolic"
                        className="mt-1 block w-24 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                      />
                      <span className="text-gray-500 font-bold">/</span>
                      <input
                        type="number"
                        name="last_bp_diastolic"
                        value={editablePatientData.blood_pressure?.last_bp_diastolic || ''}
                        onChange={(e) => handleBPChange(e)}
                        placeholder="Diastolic"
                        className="mt-1 block w-24 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                      />
                      <span className="text-gray-500">mmHg</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="text-2xl font-bold text-gray-800">
                        {patient.blood_pressure?.last_bp_systolic || '?'}<span className="text-gray-400">/</span>{patient.blood_pressure?.last_bp_diastolic || '?'}
                      </div>
                      <span className="ml-2 text-gray-500">mmHg</span>
                      {patient.blood_pressure?.last_bp_systolic && patient.blood_pressure?.last_bp_diastolic && (
                        <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${patient.blood_pressure.last_bp_systolic > 140 || patient.blood_pressure.last_bp_diastolic > 90
                          ? 'bg-red-100 text-red-800'
                          : patient.blood_pressure.last_bp_systolic > 120 || patient.blood_pressure.last_bp_diastolic > 80
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                          }`}>
                          {patient.blood_pressure.last_bp_systolic > 140 || patient.blood_pressure.last_bp_diastolic > 90
                            ? 'High'
                            : patient.blood_pressure.last_bp_systolic > 120 || patient.blood_pressure.last_bp_diastolic > 80
                              ? 'Elevated'
                              : 'Normal'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <div className="flex items-center mb-2">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 mr-2 text-xs font-medium">
                        <FaRulerVertical className="h-3 w-3" />
                      </span>
                      <label className="block text-sm font-medium text-gray-700">Height</label>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          name="height"
                          value={editablePatientData.height || ''}
                          onChange={handleInputChange}
                          placeholder="Height"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                        />
                        <span className="text-gray-500 whitespace-nowrap">cm</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="text-2xl font-bold text-gray-800">
                          {patient.height || '?'}
                        </div>
                        <span className="ml-2 text-gray-500">cm</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <div className="flex items-center mb-2">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-800 mr-2 text-xs font-medium">
                        <FaWeight className="h-3 w-3" />
                      </span>
                      <label className="block text-sm font-medium text-gray-700">Weight</label>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          name="weight"
                          value={editablePatientData.weight || ''}
                          onChange={handleInputChange}
                          placeholder="Weight"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                        />
                        <span className="text-gray-500 whitespace-nowrap">kg</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="text-2xl font-bold text-gray-800">
                          {patient.weight || '?'}
                        </div>
                        <span className="ml-2 text-gray-500">kg</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-md shadow-sm">
                  <div className="flex items-center mb-2">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-purple-100 text-purple-800 mr-2 text-xs font-medium">
                      <FaCalculator className="h-3 w-3" />
                    </span>
                    <label className="block text-sm font-medium text-gray-700">BMI</label>
                  </div>
                  {isEditing && editablePatientData.height && editablePatientData.weight ? (
                    <div className="flex items-center">
                      <div className="text-lg text-gray-500">
                        Will be calculated on save
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="text-2xl font-bold text-gray-800">
                        {patient.bmi || '?'}
                      </div>
                      {patient.bmi && (
                        <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${patient.bmi < 18.5
                          ? 'bg-blue-100 text-blue-800'
                          : patient.bmi < 25
                            ? 'bg-green-100 text-green-800'
                            : patient.bmi < 30
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                          {patient.bmi < 18.5
                            ? 'Underweight'
                            : patient.bmi < 25
                              ? 'Normal'
                              : patient.bmi < 30
                                ? 'Overweight'
                                : 'Obese'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Allergies & Medications */}
            <div className="md:col-span-2 bg-gray-50 p-5 rounded-lg shadow-sm mt-6">
              <div className="flex items-center mb-3">
                <FaAllergies className="text-red-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Allergies & Medications</h3>
              </div>

              {/* Allergies */}
              <div className="mb-6 bg-white p-4 rounded-md shadow-sm">
                <div className="flex items-center mb-3">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-red-800 mr-2 text-xs font-medium">
                    <FaAllergies className="h-3 w-3" />
                  </span>
                  <label className="block text-sm font-medium text-gray-700">Allergies</label>
                </div>
                {isEditing ? (
                  <div>
                    <div className="flex space-x-2 mb-3">
                      <input
                        type="text"
                        value={tempAllergy}
                        onChange={(e) => setTempAllergy(e.target.value)}
                        placeholder="Add allergy"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                      />
                      <button
                        type="button"
                        onClick={handleAddAllergy}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {editablePatientData.allergies_medications?.drug_allergies?.map((allergy, index) => (
                        <div key={index} className="bg-red-100 px-3 py-1 rounded-full flex items-center shadow-sm">
                          <span className="text-red-800 text-sm">{allergy}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAllergy(index)}
                            className="ml-2 text-red-500 hover:text-red-700 transition-colors duration-200"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(patient.allergies_medications?.drug_allergies && patient.allergies_medications.drug_allergies.length > 0) ? (
                      patient.allergies_medications.drug_allergies.map((allergy, index) => (
                        <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm shadow-sm">
                          {allergy}
                        </span>
                      ))
                    ) : (
                      <div className="flex items-center text-gray-500">
                        <svg className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        No known allergies
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Current Medications */}
              <div className="mb-6 bg-white p-4 rounded-md shadow-sm">
                <div className="flex items-center mb-3">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 mr-2 text-xs font-medium">
                    <FaPills className="h-3 w-3" />
                  </span>
                  <label className="block text-sm font-medium text-gray-700">Current Medications</label>
                </div>
                {isEditing ? (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 bg-gray-50 p-3 rounded-lg">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Medication Name</label>
                        <input
                          type="text"
                          value={tempMedication.name}
                          onChange={(e) => setTempMedication({ ...tempMedication, name: e.target.value })}
                          placeholder="e.g., Lisinopril"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Dosage</label>
                        <input
                          type="text"
                          value={tempMedication.dosage}
                          onChange={(e) => setTempMedication({ ...tempMedication, dosage: e.target.value })}
                          placeholder="e.g., 10mg"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={tempMedication.frequency}
                            onChange={(e) => setTempMedication({ ...tempMedication, frequency: e.target.value })}
                            placeholder="e.g., Once daily"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                          />
                          <button
                            type="button"
                            onClick={handleAddMedication}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                    {(editablePatientData.allergies_medications?.current_medications && editablePatientData.allergies_medications.current_medications.length > 0) ? (
                      <div className="overflow-x-auto mt-3 bg-gray-50 rounded-lg p-2">
                        <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                          <thead className="bg-gray-100">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Medication
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Dosage
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Frequency
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {editablePatientData.allergies_medications.current_medications.map((med, index) => (
                              <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{med.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{med.dosage}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{med.frequency}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMedication(index)}
                                    className="text-red-500 hover:text-red-700 transition-colors duration-200"
                                  >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-gray-50 rounded-lg">
                        <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-500">No medications added yet</p>
                      </div>
                    )}
                  </div>
                ) : (
                  (patient.allergies_medications?.current_medications && patient.allergies_medications.current_medications.length > 0) ? (
                    <div className="overflow-x-auto bg-gray-50 rounded-lg p-2">
                      <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-100">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Medication
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Dosage
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Frequency
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {patient.allergies_medications.current_medications.map((med, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <FaPills className="text-blue-500 mr-2" />
                                  <div className="text-sm font-medium text-gray-900">{med.name}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{med.dosage}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{med.frequency}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No medications</h3>
                      <p className="mt-1 text-sm text-gray-500">No medications have been recorded for this patient.</p>
                    </div>
                  )
                )}
              </div>

              {/* Supplements */}
              <div className="bg-white p-4 rounded-md shadow-sm">
                <div className="flex items-center mb-3">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-800 mr-2 text-xs font-medium">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l3 3m0 0l3-3m-3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
                    </svg>
                  </span>
                  <label className="block text-sm font-medium text-gray-700">Supplements</label>
                </div>
                {isEditing ? (
                  <div>
                    <div className="flex space-x-2 mb-3">
                      <input
                        type="text"
                        value={tempSupplement}
                        onChange={(e) => setTempSupplement(e.target.value)}
                        placeholder="Add supplement (e.g., Vitamin D, Omega-3)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                      />
                      <button
                        type="button"
                        onClick={handleAddSupplement}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {editablePatientData.allergies_medications?.supplements?.map((supplement, index) => (
                        <div key={index} className="bg-green-100 px-3 py-1 rounded-full flex items-center shadow-sm">
                          <span className="text-green-800 text-sm">{supplement}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSupplement(index)}
                            className="ml-2 text-green-500 hover:text-green-700 transition-colors duration-200"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {!editablePatientData.allergies_medications?.supplements?.length && (
                        <p className="text-gray-500 italic">No supplements added yet</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(patient.allergies_medications?.supplements && patient.allergies_medications.supplements.length > 0) ? (
                      patient.allergies_medications.supplements.map((supplement, index) => (
                        <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm shadow-sm">
                          {supplement}
                        </span>
                      ))
                    ) : (
                      <div className="flex items-center text-gray-500">
                        <svg className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        No supplements recorded
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lifestyle Section */}
      {activeSection === 'lifestyle' && (
        <div className="bg-white shadow-lg rounded-xl p-6 transition-all duration-300 transform hover:shadow-xl">
          <div className="flex items-center mb-4">
            <FaRunning className="text-indigo-600 mr-2 text-xl" />
            <h2 className="text-xl font-semibold text-gray-800">Lifestyle</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <div className="flex items-center mb-3">
                <FaSmoking className="text-gray-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Smoking</h3>
              </div>
              {isEditing ? (
                <select
                  name="smoking"
                  value={editablePatientData.lifestyle?.smoking || ''}
                  onChange={(e) => handleLifestyleChange(e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white transition-colors duration-200"
                >
                  <option value="">Select Option</option>
                  <option value="Non-smoker">Non-smoker</option>
                  <option value="Former smoker">Former smoker</option>
                  <option value="Occasional smoker">Occasional smoker</option>
                  <option value="Regular smoker">Regular smoker</option>
                  <option value="Heavy smoker">Heavy smoker</option>
                </select>
              ) : (
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <p className="text-gray-800 text-lg font-medium">
                    {patient.lifestyle?.smoking ? (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${patient.lifestyle.smoking === 'Non-smoker'
                        ? 'bg-green-100 text-green-800'
                        : patient.lifestyle.smoking === 'Former smoker'
                          ? 'bg-blue-100 text-blue-800'
                          : patient.lifestyle.smoking === 'Occasional smoker'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                        {patient.lifestyle.smoking}
                      </span>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <div className="flex items-center mb-3">
                <FaWineGlass className="text-purple-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Alcohol Consumption</h3>
              </div>
              {isEditing ? (
                <select
                  name="alcohol_consumption"
                  value={editablePatientData.lifestyle?.alcohol_consumption || ''}
                  onChange={(e) => handleLifestyleChange(e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white transition-colors duration-200"
                >
                  <option value="">Select Option</option>
                  <option value="Non-drinker">Non-drinker</option>
                  <option value="Occasional drinker">Occasional drinker</option>
                  <option value="Moderate drinker">Moderate drinker</option>
                  <option value="Heavy drinker">Heavy drinker</option>
                </select>
              ) : (
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <p className="text-gray-800 text-lg font-medium">
                    {patient.lifestyle?.alcohol_consumption ? (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${patient.lifestyle.alcohol_consumption === 'Non-drinker'
                        ? 'bg-green-100 text-green-800'
                        : patient.lifestyle.alcohol_consumption === 'Occasional drinker'
                          ? 'bg-blue-100 text-blue-800'
                          : patient.lifestyle.alcohol_consumption === 'Moderate drinker'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                        {patient.lifestyle.alcohol_consumption}
                      </span>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <div className="flex items-center mb-3">
                <FaRunning className="text-green-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Physical Activity</h3>
              </div>
              {isEditing ? (
                <select
                  name="physical_activity"
                  value={editablePatientData.lifestyle?.physical_activity || ''}
                  onChange={(e) => handleLifestyleChange(e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white transition-colors duration-200"
                >
                  <option value="">Select Option</option>
                  <option value="Sedentary">Sedentary</option>
                  <option value="Lightly active">Lightly active</option>
                  <option value="Moderately active">Moderately active</option>
                  <option value="Very active">Very active</option>
                  <option value="Extremely active">Extremely active</option>
                </select>
              ) : (
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <p className="text-gray-800 text-lg font-medium">
                    {patient.lifestyle?.physical_activity ? (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${patient.lifestyle.physical_activity === 'Sedentary'
                        ? 'bg-red-100 text-red-800'
                        : patient.lifestyle.physical_activity === 'Lightly active'
                          ? 'bg-yellow-100 text-yellow-800'
                          : patient.lifestyle.physical_activity === 'Moderately active'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                        {patient.lifestyle.physical_activity}
                      </span>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Female-Specific Information */}
      {activeSection === 'gynecological' && patient.gender === 'Female' && (
        <div className="bg-white shadow-lg rounded-xl p-6 transition-all duration-300 transform hover:shadow-xl">
          <div className="flex items-center mb-4">
            <FaVenusMars className="text-pink-600 mr-2 text-xl" />
            <h2 className="text-xl font-semibold text-gray-800">Gynecological Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <div className="flex items-center mb-3">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-pink-100 text-pink-800 mr-2 text-xs font-medium">
                  PS
                </span>
                <h3 className="text-lg font-medium text-gray-800">Pregnancy Status</h3>
              </div>
              {isEditing ? (
                <select
                  name="pregnancy_status"
                  value={editablePatientData.gynecological?.pregnancy_status || ''}
                  onChange={(e) => handleGynecologicalChange(e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white transition-colors duration-200"
                >
                  <option value="">Select Status</option>
                  <option value="Not pregnant">Not pregnant</option>
                  <option value="Pregnant">Pregnant</option>
                  <option value="Trying to conceive">Trying to conceive</option>
                  <option value="Postpartum">Postpartum</option>
                </select>
              ) : (
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <p className="text-gray-800 text-lg font-medium">
                    {patient.gynecological?.pregnancy_status ? (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${patient.gynecological.pregnancy_status === 'Pregnant'
                        ? 'bg-pink-100 text-pink-800'
                        : patient.gynecological.pregnancy_status === 'Trying to conceive'
                          ? 'bg-purple-100 text-purple-800'
                          : patient.gynecological.pregnancy_status === 'Postpartum'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                        {patient.gynecological.pregnancy_status}
                      </span>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <div className="flex items-center mb-3">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-pink-100 text-pink-800 mr-2 text-xs font-medium">
                  LMP
                </span>
                <h3 className="text-lg font-medium text-gray-800">Last Menstrual Period</h3>
              </div>
              {isEditing ? (
                <input
                  type="date"
                  name="last_menstrual_period"
                  value={editablePatientData.gynecological?.last_menstrual_period || ''}
                  onChange={(e) => handleGynecologicalChange(e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors duration-200"
                />
              ) : (
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <p className="text-gray-800 text-lg font-medium">
                    {patient.gynecological?.last_menstrual_period || 'Not provided'}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <div className="flex items-center mb-3">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-pink-100 text-pink-800 mr-2 text-xs font-medium">
                  CU
                </span>
                <h3 className="text-lg font-medium text-gray-800">Contraceptive Use</h3>
              </div>
              {isEditing ? (
                <select
                  name="contraceptive_use"
                  value={editablePatientData.gynecological?.contraceptive_use || ''}
                  onChange={(e) => handleGynecologicalChange(e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white transition-colors duration-200"
                >
                  <option value="">Select Option</option>
                  <option value="None">None</option>
                  <option value="Oral contraceptives">Oral contraceptives</option>
                  <option value="IUD">IUD</option>
                  <option value="Implant">Implant</option>
                  <option value="Injection">Injection</option>
                  <option value="Condoms">Condoms</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <p className="text-gray-800 text-lg font-medium">
                    {patient.gynecological?.contraceptive_use ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        {patient.gynecological.contraceptive_use}
                      </span>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Patient Files Section */}
      {activeSection === 'files' && patient && (
        <div className="bg-white shadow-lg rounded-xl p-6 transition-all duration-300 transform hover:shadow-xl">
          <div className="flex items-center mb-4">
            {/* <FaFileMedical className="text-indigo-600 mr-2 text-xl" /> */}
            {/* <h2 className="text-xl font-semibold text-gray-800">Files & Documents</h2> */}
          </div>
          {/* Use the MongoDB ID from the URL parameter as the patient ID */}
          <PatientReports patientId={patient.id} />
        </div>
      )}
    </div>
  );
};

export default PatientDetail;
