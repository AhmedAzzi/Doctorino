import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';
import { FaUser, FaKey, FaClipboard, FaCheck } from 'react-icons/fa';

// Define the Patient interface with all the essential data fields
interface Patient {
    id: string;
    // Patient Identifiers
    firstName: string;
    lastName: string;
    date_of_birth: string;
    gender: string;
    phone: string;
    email: string;
    address: string;
    national_id: string;
    health_insurance: string;
    // Mobile app credentials
    username?: string;
    password?: string;


    // Medical Snapshot
    blood_info: {
        blood_group: string;
        rh_factor: string;
    };

    // Allergies & Chronic Conditions
    allergies: string[];
    chronic_conditions: string[];

    // Vitals & Habits
    blood_pressure: {
        last_bp_systolic: number;
        last_bp_diastolic: number;
    };
    height: number;
    weight: number;
    bmi?: number;

    // Lifestyle
    lifestyle: {
        smoking: string;
        alcohol_consumption: string;
        physical_activity: string;
    };

    // Medications
    medications: {
        current_medications: Array<{ name: string; dosage: string; frequency: string }>;
        supplements: string[];
    };

    // Medical History
    medical_history: {
        surgeries: Array<{ procedure: string; date: string; notes: string }>;
        hospitalizations: Array<{ reason: string; date: string; duration: string }>;
        family_history: {
            heart_disease: boolean;
            diabetes: boolean;
            cancer: boolean;
            other: string;
        };
    };

    // Female-Specific Info
    gynecological?: {
        pregnancy_status: string;
        last_menstrual_period: string;
        contraceptive_use: string;
    };
}

// Define a type for the new patient form data, excluding the ID
type NewPatientData = Omit<Patient, 'id' | 'bmi'>;

const AddPatient: React.FC = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<string>('identifiers');

    // State for credentials modal
    const [showCredentialsModal, setShowCredentialsModal] = useState<boolean>(false);
    const [patientCredentials, setPatientCredentials] = useState<{ id: string, username: string, password: string } | null>(null);
    const [copiedUsername, setCopiedUsername] = useState<boolean>(false);
    const [copiedPassword, setCopiedPassword] = useState<boolean>(false);

    // Initialize form data with all required fields
    const [formData, setFormData] = useState<NewPatientData>({
        // Patient Identifiers
        firstName: '',
        lastName: '',
        date_of_birth: '',
        gender: '',
        phone: '',
        email: '',
        address: '',
        national_id: '',
        health_insurance: '',


        // Medical Snapshot
        blood_info: {
            blood_group: '',
            rh_factor: '',
        },

        // Allergies & Chronic Conditions
        allergies: [],
        chronic_conditions: [],

        // Vitals & Habits
        blood_pressure: {
            last_bp_systolic: 0,
            last_bp_diastolic: 0,
        },
        height: 0,
        weight: 0,

        // Lifestyle
        lifestyle: {
            smoking: '',
            alcohol_consumption: '',
            physical_activity: '',
        },

        // Medications
        medications: {
            current_medications: [],
            supplements: [],
        },

        // Medical History
        medical_history: {
            surgeries: [],
            hospitalizations: [],
            family_history: {
                heart_disease: false,
                diabetes: false,
                cancer: false,
                other: '',
            },
        },

        // Female-Specific Info (optional)
        gynecological: {
            pregnancy_status: '',
            last_menstrual_period: '',
            contraceptive_use: '',
        },
    });

    // State for temporary medication input
    const [tempMedication, setTempMedication] = useState({ name: '', dosage: '', frequency: '' });
    const [tempSupplement, setTempSupplement] = useState('');
    const [tempAllergy, setTempAllergy] = useState('');
    const [tempChronicCondition, setTempChronicCondition] = useState('');
    const [tempSurgery, setTempSurgery] = useState({ procedure: '', date: '', notes: '' });
    const [tempHospitalization, setTempHospitalization] = useState({ reason: '', date: '', duration: '' });

    // Common chronic conditions list
    const commonChronicConditions = [
        "Hypertension (High Blood Pressure)",
        "Diabetes Mellitus Type 2",
        "Diabetes Mellitus Type 1",
        "Coronary Artery Disease",
        "Heart Failure",
        "Atrial Fibrillation",
        "Stroke",
        "Chronic Obstructive Pulmonary Disease (COPD)",
        "Asthma",
        "Chronic Kidney Disease",
        "Liver Cirrhosis",
        "Hypothyroidism",
        "Hyperthyroidism",
        "Rheumatoid Arthritis",
        "Osteoarthritis",
        "Osteoporosis",
        "Alzheimer's Disease",
        "Parkinson's Disease",
        "Multiple Sclerosis",
        "Epilepsy",
        "Depression",
        "Anxiety Disorder",
        "Bipolar Disorder",
        "Schizophrenia",
        "HIV/AIDS",
        "Cancer",
        "Obesity",
        "Sleep Apnea",
        "Gastroesophageal Reflux Disease (GERD)",
        "Irritable Bowel Syndrome (IBS)",
        "Crohn's Disease",
        "Ulcerative Colitis",
        "Celiac Disease",
        "Migraine",
        "Fibromyalgia",
        "Lupus",
        "Psoriasis",
        "Eczema"
    ];

    // Common allergies list
    const commonAllergies = [
        "Penicillin",
        "Amoxicillin",
        "Cephalosporins",
        "Sulfonamides",
        "NSAIDs (Aspirin, Ibuprofen)",
        "Codeine",
        "Morphine",
        "Local Anesthetics",
        "Contrast Dye",
        "Latex",
        "Peanuts",
        "Tree Nuts",
        "Shellfish",
        "Fish",
        "Eggs",
        "Milk",
        "Soy",
        "Wheat",
        "Sesame",
        "Bee/Wasp Stings",
        "Dust Mites",
        "Mold",
        "Pollen",
        "Animal Dander",
        "Adhesive Tape",
        "Iodine"
    ];

    // State for dropdown visibility and selected conditions
    const [showChronicConditionsDropdown, setShowChronicConditionsDropdown] = useState(false);
    const [selectedChronicConditions, setSelectedChronicConditions] = useState<{ [key: string]: boolean }>({});

    // State for allergies dropdown
    const [showAllergiesDropdown, setShowAllergiesDropdown] = useState(false);
    const [selectedAllergies, setSelectedAllergies] = useState<{ [key: string]: boolean }>({});

    // Initialize selectedChronicConditions and selectedAllergies based on formData
    useEffect(() => {
        // Initialize chronic conditions
        const initialSelectedConditions: { [key: string]: boolean } = {};
        formData.chronic_conditions.forEach(condition => {
            initialSelectedConditions[condition] = true;
        });
        setSelectedChronicConditions(initialSelectedConditions);

        // Initialize allergies
        const initialSelectedAllergies: { [key: string]: boolean } = {};
        formData.allergies.forEach(allergy => {
            initialSelectedAllergies[allergy] = true;
        });
        setSelectedAllergies(initialSelectedAllergies);
    }, []);

    // Handle click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // Close chronic conditions dropdown
            if (showChronicConditionsDropdown && !target.closest('.chronic-conditions-dropdown')) {
                setShowChronicConditionsDropdown(false);
            }

            // Close allergies dropdown
            if (showAllergiesDropdown && !target.closest('.allergies-dropdown')) {
                setShowAllergiesDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showChronicConditionsDropdown, showAllergiesDropdown]);

    // Functions to handle copying credentials to clipboard
    const copyToClipboard = (text: string): boolean => {
        try {
            navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
        }
    };

    const handleCopyUsername = () => {
        if (patientCredentials?.username) {
            const success = copyToClipboard(patientCredentials.username);
            if (success) {
                setCopiedUsername(true);
                setTimeout(() => setCopiedUsername(false), 2000); // Reset after 2 seconds
            }
        }
    };

    const handleCopyPassword = () => {
        if (patientCredentials?.password) {
            const success = copyToClipboard(patientCredentials.password);
            if (success) {
                setCopiedPassword(true);
                setTimeout(() => setCopiedPassword(false), 2000); // Reset after 2 seconds
            }
        }
    };

    const handleCloseModal = () => {
        setShowCredentialsModal(false);
        if (patientCredentials?.id) {
            navigate(`/app/patients/${patientCredentials.id}`);
        } else {
            navigate('/app/patients');
        }
    };

    // Handle basic input changes
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        // Handle nested properties
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            const parentValue = formData[parent as keyof NewPatientData];
            if (parentValue && typeof parentValue === 'object') {
                setFormData({
                    ...formData,
                    [parent]: {
                        ...parentValue,
                        [child]: value,
                    },
                });
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };


    // Handle blood info changes
    const handleBloodInfoChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            blood_info: {
                ...formData.blood_info,
                [name]: value,
            },
        });
    };

    // Handle blood pressure changes
    const handleBPChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            blood_pressure: {
                ...formData.blood_pressure,
                [name]: parseInt(value) || 0,
            },
        });
    };

    // Handle lifestyle changes
    const handleLifestyleChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            lifestyle: {
                ...formData.lifestyle,
                [name]: value,
            },
        });
    };

    // Handle family history changes
    const handleFamilyHistoryChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            medical_history: {
                ...formData.medical_history,
                family_history: {
                    ...formData.medical_history.family_history,
                    [name]: type === 'checkbox' ? checked : value,
                },
            },
        });
    };

    // Handle gynecological changes
    const handleGynecologicalChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            gynecological: {
                ...formData.gynecological!,
                [name]: value,
            },
        });
    };

    // Add medication to the list
    const handleAddMedication = () => {
        if (tempMedication.name && tempMedication.dosage && tempMedication.frequency) {
            setFormData({
                ...formData,
                medications: {
                    ...formData.medications,
                    current_medications: [...formData.medications.current_medications, { ...tempMedication }],
                },
            });
            setTempMedication({ name: '', dosage: '', frequency: '' });
        }
    };

    // Remove medication from the list
    const handleRemoveMedication = (index: number) => {
        const updatedMedications = [...formData.medications.current_medications];
        updatedMedications.splice(index, 1);
        setFormData({
            ...formData,
            medications: {
                ...formData.medications,
                current_medications: updatedMedications,
            },
        });
    };

    // Add supplement to the list
    const handleAddSupplement = () => {
        if (tempSupplement) {
            setFormData({
                ...formData,
                medications: {
                    ...formData.medications,
                    supplements: [...formData.medications.supplements, tempSupplement],
                },
            });
            setTempSupplement('');
        }
    };

    // Remove supplement from the list
    const handleRemoveSupplement = (index: number) => {
        const updatedSupplements = [...formData.medications.supplements];
        updatedSupplements.splice(index, 1);
        setFormData({
            ...formData,
            medications: {
                ...formData.medications,
                supplements: updatedSupplements,
            },
        });
    };

    // Add allergy to the list
    const handleAddAllergy = () => {
        if (tempAllergy) {
            setFormData({
                ...formData,
                allergies: [...formData.allergies, tempAllergy],
            });
            setTempAllergy('');
        }
    };

    // Toggle an allergy checkbox
    const toggleAllergy = (allergy: string) => {
        const updatedSelection = { ...selectedAllergies };
        updatedSelection[allergy] = !updatedSelection[allergy];
        setSelectedAllergies(updatedSelection);

        // If the allergy is now selected, add it to the allergies array
        // If it's deselected, remove it from the array
        if (updatedSelection[allergy]) {
            if (!formData.allergies.includes(allergy)) {
                setFormData({
                    ...formData,
                    allergies: [...formData.allergies, allergy],
                });
            }
        } else {
            setFormData({
                ...formData,
                allergies: formData.allergies.filter(a => a !== allergy),
            });
        }
    };

    // Filter allergies based on search input
    const getFilteredAllergies = () => {
        if (!tempAllergy) return commonAllergies;

        return commonAllergies.filter(allergy =>
            allergy.toLowerCase().includes(tempAllergy.toLowerCase())
        );
    };

    // Select all filtered allergies
    const selectAllAllergies = () => {
        const filteredAllergies = getFilteredAllergies();
        const updatedSelection = { ...selectedAllergies };

        filteredAllergies.forEach(allergy => {
            updatedSelection[allergy] = true;
        });

        setSelectedAllergies(updatedSelection);

        // Update formData with all selected allergies
        const updatedAllergies = [...formData.allergies];

        filteredAllergies.forEach(allergy => {
            if (!updatedAllergies.includes(allergy)) {
                updatedAllergies.push(allergy);
            }
        });

        setFormData({
            ...formData,
            allergies: updatedAllergies
        });
    };

    // Clear all filtered allergies
    const clearAllAllergies = () => {
        const filteredAllergies = getFilteredAllergies();
        const updatedSelection = { ...selectedAllergies };

        filteredAllergies.forEach(allergy => {
            updatedSelection[allergy] = false;
        });

        setSelectedAllergies(updatedSelection);

        // Remove all filtered allergies from formData
        setFormData({
            ...formData,
            allergies: formData.allergies.filter(
                allergy => !filteredAllergies.includes(allergy)
            )
        });
    };

    // Remove allergy from the list
    const handleRemoveAllergy = (index: number) => {
        const updatedAllergies = [...formData.allergies];
        updatedAllergies.splice(index, 1);
        setFormData({
            ...formData,
            allergies: updatedAllergies,
        });
    };

    // Add chronic condition to the list
    const handleAddChronicCondition = () => {
        if (tempChronicCondition) {
            setFormData({
                ...formData,
                chronic_conditions: [...formData.chronic_conditions, tempChronicCondition],
            });
            setTempChronicCondition('');
        }
    };

    // Toggle a chronic condition checkbox
    const toggleChronicCondition = (condition: string) => {
        const updatedSelection = { ...selectedChronicConditions };
        updatedSelection[condition] = !updatedSelection[condition];
        setSelectedChronicConditions(updatedSelection);

        // If the condition is now selected, add it to the chronic_conditions array
        // If it's deselected, remove it from the array
        if (updatedSelection[condition]) {
            if (!formData.chronic_conditions.includes(condition)) {
                setFormData({
                    ...formData,
                    chronic_conditions: [...formData.chronic_conditions, condition],
                });
            }
        } else {
            setFormData({
                ...formData,
                chronic_conditions: formData.chronic_conditions.filter(c => c !== condition),
            });
        }
    };

    // Filter chronic conditions based on search input
    const getFilteredChronicConditions = () => {
        if (!tempChronicCondition) return commonChronicConditions;

        return commonChronicConditions.filter(condition =>
            condition.toLowerCase().includes(tempChronicCondition.toLowerCase())
        );
    };

    // Select all filtered conditions
    const selectAllConditions = () => {
        const filteredConditions = getFilteredChronicConditions();
        const updatedSelection = { ...selectedChronicConditions };

        filteredConditions.forEach(condition => {
            updatedSelection[condition] = true;
        });

        setSelectedChronicConditions(updatedSelection);

        // Update formData with all selected conditions
        const updatedConditions = [...formData.chronic_conditions];

        filteredConditions.forEach(condition => {
            if (!updatedConditions.includes(condition)) {
                updatedConditions.push(condition);
            }
        });

        setFormData({
            ...formData,
            chronic_conditions: updatedConditions
        });
    };

    // Clear all filtered conditions
    const clearAllConditions = () => {
        const filteredConditions = getFilteredChronicConditions();
        const updatedSelection = { ...selectedChronicConditions };

        filteredConditions.forEach(condition => {
            updatedSelection[condition] = false;
        });

        setSelectedChronicConditions(updatedSelection);

        // Remove all filtered conditions from formData
        setFormData({
            ...formData,
            chronic_conditions: formData.chronic_conditions.filter(
                condition => !filteredConditions.includes(condition)
            )
        });
    };

    // Remove chronic condition from the list
    const handleRemoveChronicCondition = (index: number) => {
        const updatedConditions = [...formData.chronic_conditions];
        updatedConditions.splice(index, 1);
        setFormData({
            ...formData,
            chronic_conditions: updatedConditions,
        });
    };

    // Add surgery to the list
    const handleAddSurgery = () => {
        if (tempSurgery.procedure && tempSurgery.date) {
            setFormData({
                ...formData,
                medical_history: {
                    ...formData.medical_history,
                    surgeries: [...formData.medical_history.surgeries, { ...tempSurgery }],
                },
            });
            setTempSurgery({ procedure: '', date: '', notes: '' });
        }
    };

    // Remove surgery from the list
    const handleRemoveSurgery = (index: number) => {
        const updatedSurgeries = [...formData.medical_history.surgeries];
        updatedSurgeries.splice(index, 1);
        setFormData({
            ...formData,
            medical_history: {
                ...formData.medical_history,
                surgeries: updatedSurgeries,
            },
        });
    };

    // Add hospitalization to the list
    const handleAddHospitalization = () => {
        if (tempHospitalization.reason && tempHospitalization.date) {
            setFormData({
                ...formData,
                medical_history: {
                    ...formData.medical_history,
                    hospitalizations: [...formData.medical_history.hospitalizations, { ...tempHospitalization }],
                },
            });
            setTempHospitalization({ reason: '', date: '', duration: '' });
        }
    };

    // Remove hospitalization from the list
    const handleRemoveHospitalization = (index: number) => {
        const updatedHospitalizations = [...formData.medical_history.hospitalizations];
        updatedHospitalizations.splice(index, 1);
        setFormData({
            ...formData,
            medical_history: {
                ...formData.medical_history,
                hospitalizations: updatedHospitalizations,
            },
        });
    };

    // Handle form submission
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        // Basic validation for required fields
        if (!formData.firstName || !formData.lastName || !formData.date_of_birth || !formData.gender || !formData.phone) {
            setError('Please fill in all required fields (Name, Gender, Date of Birth, Contact Information).');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email)) {
            setError('Please enter a valid email address.');
            return;
        }

        try {
            // Calculate BMI if height and weight are provided
            const heightInMeters = formData.height / 100; // Convert cm to meters
            const calculatedBMI = formData.height && formData.weight
                ? Math.round((formData.weight / (heightInMeters * heightInMeters)) * 10) / 10
                : undefined;

            // Simplify the data we're sending to focus on essential fields
            const patientData = {
                // Basic Information (required fields)
                firstName: formData.firstName,
                lastName: formData.lastName,
                date_of_birth: formData.date_of_birth,
                gender: formData.gender,
                phone: formData.phone,
                email: formData.email,

                // Optional fields - only include if they have values
                ...(formData.address ? { address: formData.address } : {}),
                ...(formData.national_id ? { national_id: formData.national_id } : {}),
                ...(formData.health_insurance ? { health_insurance: formData.health_insurance } : {}),


                // Only include blood info if at least one field is filled
                ...(formData.blood_info.blood_group || formData.blood_info.rh_factor ?
                    {
                        blood_info: {
                            ...(formData.blood_info.blood_group ? { blood_group: formData.blood_info.blood_group } : {}),
                            ...(formData.blood_info.rh_factor ? { rh_factor: formData.blood_info.rh_factor } : {})
                        }
                    } : {}),

                // Only include blood pressure if values are non-zero
                ...(formData.blood_pressure.last_bp_systolic > 0 || formData.blood_pressure.last_bp_diastolic > 0 ?
                    {
                        blood_pressure: {
                            ...(formData.blood_pressure.last_bp_systolic > 0 ? { last_bp_systolic: formData.blood_pressure.last_bp_systolic } : {}),
                            ...(formData.blood_pressure.last_bp_diastolic > 0 ? { last_bp_diastolic: formData.blood_pressure.last_bp_diastolic } : {})
                        }
                    } : {}),

                // Only include height/weight if values are non-zero
                ...(formData.height > 0 ? { height: formData.height } : {}),
                ...(formData.weight > 0 ? { weight: formData.weight } : {}),
                ...(calculatedBMI ? { bmi: calculatedBMI } : {}),

                // Only include allergies_medications if there are any
                ...((formData.allergies && formData.allergies.length > 0) ||
                    (formData.medications.current_medications && formData.medications.current_medications.length > 0) ||
                    (formData.medications.supplements && formData.medications.supplements.length > 0) ?
                    {
                        allergies_medications: {
                            ...(formData.allergies && formData.allergies.length > 0 ? { drug_allergies: formData.allergies } : {}),
                            ...(formData.medications.current_medications && formData.medications.current_medications.length > 0 ?
                                { current_medications: formData.medications.current_medications } : {}),
                            ...(formData.medications.supplements && formData.medications.supplements.length > 0 ?
                                { supplements: formData.medications.supplements } : {})
                        }
                    } : {}),

                // Only include lifestyle if at least one field is filled
                ...(formData.lifestyle.smoking || formData.lifestyle.alcohol_consumption || formData.lifestyle.physical_activity ?
                    {
                        lifestyle: {
                            ...(formData.lifestyle.smoking ? { smoking: formData.lifestyle.smoking } : {}),
                            ...(formData.lifestyle.alcohol_consumption ? { alcohol_consumption: formData.lifestyle.alcohol_consumption } : {}),
                            ...(formData.lifestyle.physical_activity ? { physical_activity: formData.lifestyle.physical_activity } : {})
                        }
                    } : {}),

                // Only include gynecological info for female patients and if at least one field is filled
                ...(formData.gender === 'Female' &&
                    (formData.gynecological?.pregnancy_status ||
                        formData.gynecological?.last_menstrual_period ||
                        formData.gynecological?.contraceptive_use) ?
                    {
                        gynecological: {
                            ...(formData.gynecological?.pregnancy_status ? { pregnancy_status: formData.gynecological.pregnancy_status } : {}),
                            ...(formData.gynecological?.last_menstrual_period ? { last_menstrual_period: formData.gynecological.last_menstrual_period } : {}),
                            ...(formData.gynecological?.contraceptive_use ? { contraceptive_use: formData.gynecological.contraceptive_use } : {})
                        }
                    } : {})
            };

            console.log('Submitting patient data:', patientData);

            // Log the data we're sending for debugging
            console.log('Sending patient data to API:', JSON.stringify(patientData, null, 2));

            try {
                // API call to create new patient with detailed information
                const response = await apiClient.post<Patient>('/api/patients/detailed', patientData);
                console.log('API response:', response.data);

                // Check if username and password were returned
                if (response.data.username && response.data.password) {
                    // Show credentials modal
                    setPatientCredentials({
                        id: response.data.id,
                        username: response.data.username,
                        password: response.data.password
                    });
                    setShowCredentialsModal(true);
                } else {
                    // Redirect to the patient detail page if no credentials
                    navigate(`/app/patients/${response.data.id}`);
                }
            } catch (detailedErr: any) {
                console.error('Detailed endpoint failed:', detailedErr);

                if (detailedErr.response) {
                    console.error('Error response:', detailedErr.response.data);
                    console.error('Status code:', detailedErr.response.status);

                    // If we have a validation error, show it to the user
                    if (detailedErr.response.data && detailedErr.response.data.detail) {
                        throw new Error(`Validation error: ${detailedErr.response.data.detail}`);
                    }
                }

                console.log('Trying basic endpoint as fallback...');

                // If detailed endpoint fails, try the basic endpoint with minimal data
                const basicPatientData = {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    gender: formData.gender,
                    email: formData.email,
                    phone: formData.phone
                };

                const basicResponse = await apiClient.post<Patient>('/api/patients', basicPatientData);
                console.log('Basic API response:', basicResponse.data);

                // Check if username and password were returned
                if (basicResponse.data.username && basicResponse.data.password) {
                    // Show credentials modal
                    setPatientCredentials({
                        id: basicResponse.data.id,
                        username: basicResponse.data.username,
                        password: basicResponse.data.password
                    });
                    setShowCredentialsModal(true);
                } else {
                    // Redirect to the patient detail page if no credentials
                    navigate(`/app/patients/${basicResponse.data.id}`);
                }
            }
        } catch (err: any) {
            console.error('Error adding patient:', err);
            // Provide more specific error message if available
            if (err.response && err.response.data && err.response.data.detail) {
                setError(`Failed to add patient: ${err.response.data.detail}`);
            } else {
                setError('Failed to add patient. Please try again.');
            }
        }
    };

    // Navigation between form sections
    const sections = [
        { id: 'identifiers', label: 'Patient Identifiers' },
        { id: 'medical', label: 'Medical Snapshot' },
        { id: 'vitals', label: 'Vitals & Habits' },
        { id: 'medications', label: 'Medications' },
        { id: 'history', label: 'Medical History' },
        { id: 'female', label: 'Female-Specific Info' },
    ];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Add New Patient</h1>
                <button
                    onClick={() => navigate('/app/patients')}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                    Cancel
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> {error}</span>
                </div>
            )}

            {/* Section Navigation */}
            <div className="mb-6 overflow-x-auto">
                <div className="flex space-x-2 min-w-max">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`px-4 py-2 rounded-t-lg ${activeSection === section.id
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            {section.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Credentials Modal */}
            {showCredentialsModal && patientCredentials && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"></div>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md z-10 p-6 transform transition-all scale-100 opacity-100">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center">
                                <div className="bg-green-100 p-2 rounded-full mr-3">
                                    <FaUser className="text-green-600 text-xl" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">Patient Account Created</h2>
                            </div>
                        </div>

                        <div className="mb-6">
                            <p className="text-gray-600 mb-4">
                                The patient account has been created successfully. Please save these credentials for the patient to use with the mobile app:
                            </p>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center">
                                        <FaUser className="text-gray-500 mr-2" />
                                        <span className="font-medium text-gray-700">Username:</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="mr-2 font-mono bg-gray-100 px-2 py-1 rounded">{patientCredentials.username}</span>
                                        <button
                                            type="button"
                                            onClick={handleCopyUsername}
                                            className="text-blue-500 hover:text-blue-700"
                                            title="Copy username"
                                        >
                                            {copiedUsername ? <FaCheck /> : <FaClipboard />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="flex items-center">
                                        <FaKey className="text-gray-500 mr-2" />
                                        <span className="font-medium text-gray-700">Password:</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="mr-2 font-mono bg-gray-100 px-2 py-1 rounded">{patientCredentials.password}</span>
                                        <button
                                            type="button"
                                            onClick={handleCopyPassword}
                                            className="text-blue-500 hover:text-blue-700"
                                            title="Copy password"
                                        >
                                            {copiedPassword ? <FaCheck /> : <FaClipboard />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-yellow-700">
                                            These credentials will not be shown again. Please make sure to save them.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                            >
                                Continue to Patient Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
                {/* Patient Identifiers Section */}
                {activeSection === 'identifiers' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold border-b pb-2">Patient Identifiers</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                                    First Name*
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                                    Last Name*
                                </label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">
                                    Date of Birth*
                                </label>
                                <input
                                    type="date"
                                    id="date_of_birth"
                                    name="date_of_birth"
                                    value={formData.date_of_birth}
                                    onChange={handleInputChange}
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                                    Gender*
                                </label>
                                <select
                                    id="gender"
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                    Contact Number*
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                                    Address
                                </label>
                                <textarea
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="national_id" className="block text-sm font-medium text-gray-700">
                                    ID Number
                                </label>
                                <input
                                    type="text"
                                    id="national_id"
                                    name="national_id"
                                    value={formData.national_id}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="health_insurance" className="block text-sm font-medium text-gray-700">
                                    Insurance Number
                                </label>
                                <input
                                    type="text"
                                    id="health_insurance"
                                    name="health_insurance"
                                    value={formData.health_insurance}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setActiveSection('medical')}
                                className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                            >
                                Next: Medical Snapshot
                            </button>
                        </div>
                    </div>
                )}



                {/* Medical Snapshot Section */}
                {activeSection === 'medical' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold border-b pb-2">Medical Snapshot</h2>

                        {/* Blood Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="blood_group" className="block text-sm font-medium text-gray-700">
                                    Blood Group
                                </label>
                                <select
                                    id="blood_group"
                                    name="blood_group"
                                    value={formData.blood_info.blood_group}
                                    onChange={handleBloodInfoChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="">Select Blood Group</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="AB">AB</option>
                                    <option value="O">O</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="rh_factor" className="block text-sm font-medium text-gray-700">
                                    Rh Factor
                                </label>
                                <select
                                    id="rh_factor"
                                    name="rh_factor"
                                    value={formData.blood_info.rh_factor}
                                    onChange={handleBloodInfoChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="">Select Rh Factor</option>
                                    <option value="Positive">Positive (+)</option>
                                    <option value="Negative">Negative (-)</option>
                                </select>
                            </div>
                        </div>

                        {/* Allergies */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Allergies (Critical only)
                            </label>

                            {/* Dropdown with checkboxes */}
                            <div className="relative allergies-dropdown">
                                <div
                                    className="flex justify-between items-center w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer"
                                    onClick={() => setShowAllergiesDropdown(!showAllergiesDropdown)}
                                >
                                    <span>{formData.allergies.length > 0
                                        ? `${formData.allergies.length} allergy/allergies selected`
                                        : "Select allergies"}
                                    </span>
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </div>

                                {showAllergiesDropdown && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto allergies-dropdown">
                                        <div className="p-2">
                                            <div className="mb-2 flex justify-between items-center">
                                                <input
                                                    type="text"
                                                    value={tempAllergy}
                                                    onChange={(e) => setTempAllergy(e.target.value)}
                                                    placeholder="Search or add custom allergy"
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddAllergy}
                                                    className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                >
                                                    Add
                                                </button>
                                            </div>

                                            <div className="mb-2 flex justify-between">
                                                <div className="flex space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={selectAllAllergies}
                                                        className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                                    >
                                                        Select All
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={clearAllAllergies}
                                                        className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                                    >
                                                        Clear All
                                                    </button>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {getFilteredAllergies().length} allergies found
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-1">
                                                {getFilteredAllergies().map((allergy) => (
                                                    <div key={allergy} className="flex items-center p-2 hover:bg-gray-100 rounded">
                                                        <input
                                                            type="checkbox"
                                                            id={`allergy-${allergy}`}
                                                            checked={formData.allergies.includes(allergy)}
                                                            onChange={() => toggleAllergy(allergy)}
                                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                        />
                                                        <label htmlFor={`allergy-${allergy}`} className="ml-2 block text-sm text-gray-900 cursor-pointer">
                                                            {allergy}
                                                        </label>
                                                    </div>
                                                ))}

                                                {getFilteredAllergies().length === 0 && (
                                                    <div className="p-2 text-sm text-gray-500">
                                                        No matching allergies found. Use the Add button to add a custom allergy.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Display selected allergies */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.allergies.map((allergy, index) => (
                                    <div key={index} className="bg-gray-100 px-3 py-1 rounded-full flex items-center">
                                        <span>{allergy}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveAllergy(index)}
                                            className="ml-2 text-red-500 hover:text-red-700"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Chronic Conditions */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Chronic Conditions
                            </label>

                            {/* Dropdown with checkboxes */}
                            <div className="relative chronic-conditions-dropdown">
                                <div
                                    className="flex justify-between items-center w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer"
                                    onClick={() => setShowChronicConditionsDropdown(!showChronicConditionsDropdown)}
                                >
                                    <span>{formData.chronic_conditions.length > 0
                                        ? `${formData.chronic_conditions.length} condition(s) selected`
                                        : "Select chronic conditions"}
                                    </span>
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </div>

                                {showChronicConditionsDropdown && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto chronic-conditions-dropdown">
                                        <div className="p-2">
                                            <div className="mb-2 flex justify-between items-center">
                                                <input
                                                    type="text"
                                                    value={tempChronicCondition}
                                                    onChange={(e) => setTempChronicCondition(e.target.value)}
                                                    placeholder="Search or add custom condition"
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddChronicCondition}
                                                    className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                >
                                                    Add
                                                </button>
                                            </div>

                                            <div className="mb-2 flex justify-between">
                                                <div className="flex space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={selectAllConditions}
                                                        className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                                    >
                                                        Select All
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={clearAllConditions}
                                                        className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                                    >
                                                        Clear All
                                                    </button>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {getFilteredChronicConditions().length} conditions found
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-1">
                                                {getFilteredChronicConditions().map((condition) => (
                                                    <div key={condition} className="flex items-center p-2 hover:bg-gray-100 rounded">
                                                        <input
                                                            type="checkbox"
                                                            id={`condition-${condition}`}
                                                            checked={formData.chronic_conditions.includes(condition)}
                                                            onChange={() => toggleChronicCondition(condition)}
                                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                        />
                                                        <label htmlFor={`condition-${condition}`} className="ml-2 block text-sm text-gray-900 cursor-pointer">
                                                            {condition}
                                                        </label>
                                                    </div>
                                                ))}

                                                {getFilteredChronicConditions().length === 0 && (
                                                    <div className="p-2 text-sm text-gray-500">
                                                        No matching conditions found. Use the Add button to add a custom condition.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Display selected conditions */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.chronic_conditions.map((condition, index) => (
                                    <div key={index} className="bg-gray-100 px-3 py-1 rounded-full flex items-center">
                                        <span>{condition}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveChronicCondition(index)}
                                            className="ml-2 text-red-500 hover:text-red-700"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button
                                type="button"
                                onClick={() => setActiveSection('emergency')}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSection('vitals')}
                                className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                            >
                                Next: Vitals & Habits
                            </button>
                        </div>
                    </div>
                )}

                {/* Vitals & Habits Section */}
                {activeSection === 'vitals' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold border-b pb-2">Vitals & Habits</h2>

                        {/* Blood Pressure */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Last Blood Pressure Reading
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="last_bp_systolic" className="block text-sm font-medium text-gray-700">
                                        Systolic (mmHg)
                                    </label>
                                    <input
                                        type="number"
                                        id="last_bp_systolic"
                                        name="last_bp_systolic"
                                        value={formData.blood_pressure.last_bp_systolic || ''}
                                        onChange={handleBPChange}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="last_bp_diastolic" className="block text-sm font-medium text-gray-700">
                                        Diastolic (mmHg)
                                    </label>
                                    <input
                                        type="number"
                                        id="last_bp_diastolic"
                                        name="last_bp_diastolic"
                                        value={formData.blood_pressure.last_bp_diastolic || ''}
                                        onChange={handleBPChange}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Height & Weight */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="height" className="block text-sm font-medium text-gray-700">
                                    Height (cm)
                                </label>
                                <input
                                    type="number"
                                    id="height"
                                    name="height"
                                    value={formData.height || ''}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
                                    Weight (kg)
                                </label>
                                <input
                                    type="number"
                                    id="weight"
                                    name="weight"
                                    value={formData.weight || ''}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* Lifestyle Habits */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="smoking" className="block text-sm font-medium text-gray-700">
                                    Smoking Status
                                </label>
                                <select
                                    id="smoking"
                                    name="smoking"
                                    value={formData.lifestyle.smoking}
                                    onChange={handleLifestyleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="">Select Status</option>
                                    <option value="Never">Never</option>
                                    <option value="Former">Former</option>
                                    <option value="Current">Current</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="alcohol_consumption" className="block text-sm font-medium text-gray-700">
                                    Alcohol Consumption
                                </label>
                                <select
                                    id="alcohol_consumption"
                                    name="alcohol_consumption"
                                    value={formData.lifestyle.alcohol_consumption}
                                    onChange={handleLifestyleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="">Select Status</option>
                                    <option value="Never">Never</option>
                                    <option value="Occasional">Occasional</option>
                                    <option value="Moderate">Moderate</option>
                                    <option value="Heavy">Heavy</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="physical_activity" className="block text-sm font-medium text-gray-700">
                                    Physical Activity
                                </label>
                                <select
                                    id="physical_activity"
                                    name="physical_activity"
                                    value={formData.lifestyle.physical_activity}
                                    onChange={handleLifestyleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="">Select Level</option>
                                    <option value="Sedentary">Sedentary</option>
                                    <option value="Light">Light</option>
                                    <option value="Moderate">Moderate</option>
                                    <option value="Active">Active</option>
                                    <option value="Very Active">Very Active</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button
                                type="button"
                                onClick={() => setActiveSection('medical')}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSection('medications')}
                                className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                            >
                                Next: Medications
                            </button>
                        </div>
                    </div>
                )}

                {/* Medications Section */}
                {activeSection === 'medications' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold border-b pb-2">Medications</h2>

                        {/* Current Medications */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Current Medications
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                                <input
                                    type="text"
                                    value={tempMedication.name}
                                    onChange={(e) => setTempMedication({ ...tempMedication, name: e.target.value })}
                                    placeholder="Medication name"
                                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                                <input
                                    type="text"
                                    value={tempMedication.dosage}
                                    onChange={(e) => setTempMedication({ ...tempMedication, dosage: e.target.value })}
                                    placeholder="Dosage (e.g., 10mg)"
                                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={tempMedication.frequency}
                                        onChange={(e) => setTempMedication({ ...tempMedication, frequency: e.target.value })}
                                        placeholder="Frequency (e.g., twice daily)"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddMedication}
                                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {formData.medications.current_medications.length > 0 && (
                                <div className="mt-4 overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
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
                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {formData.medications.current_medications.map((med, index) => (
                                                <tr key={index}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {med.name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {med.dosage}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {med.frequency}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMedication(index)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Supplements */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                OTC/Supplements
                            </label>
                            <div className="flex space-x-2 mb-2">
                                <input
                                    type="text"
                                    value={tempSupplement}
                                    onChange={(e) => setTempSupplement(e.target.value)}
                                    placeholder="Add supplement"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSupplement}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.medications.supplements.map((supplement, index) => (
                                    <div key={index} className="bg-gray-100 px-3 py-1 rounded-full flex items-center">
                                        <span>{supplement}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSupplement(index)}
                                            className="ml-2 text-red-500 hover:text-red-700"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button
                                type="button"
                                onClick={() => setActiveSection('vitals')}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSection('history')}
                                className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                            >
                                Next: Medical History
                            </button>
                        </div>
                    </div>
                )}

                {/* Medical History Section */}
                {activeSection === 'history' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold border-b pb-2">Medical History</h2>

                        {/* Surgeries */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Surgeries (Last 5 years)
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                                <input
                                    type="text"
                                    value={tempSurgery.procedure}
                                    onChange={(e) => setTempSurgery({ ...tempSurgery, procedure: e.target.value })}
                                    placeholder="Procedure"
                                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                                <input
                                    type="date"
                                    value={tempSurgery.date}
                                    onChange={(e) => setTempSurgery({ ...tempSurgery, date: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={tempSurgery.notes}
                                        onChange={(e) => setTempSurgery({ ...tempSurgery, notes: e.target.value })}
                                        placeholder="Notes"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddSurgery}
                                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {formData.medical_history.surgeries.length > 0 && (
                                <div className="mt-4 overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Procedure
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Date
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Notes
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {formData.medical_history.surgeries.map((surgery, index) => (
                                                <tr key={index}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {surgery.procedure}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(surgery.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {surgery.notes}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveSurgery(index)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Hospitalizations */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Hospitalizations (Last 5 years)
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                                <input
                                    type="text"
                                    value={tempHospitalization.reason}
                                    onChange={(e) => setTempHospitalization({ ...tempHospitalization, reason: e.target.value })}
                                    placeholder="Reason"
                                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                                <input
                                    type="date"
                                    value={tempHospitalization.date}
                                    onChange={(e) => setTempHospitalization({ ...tempHospitalization, date: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={tempHospitalization.duration}
                                        onChange={(e) => setTempHospitalization({ ...tempHospitalization, duration: e.target.value })}
                                        placeholder="Duration (e.g., 3 days)"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddHospitalization}
                                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {formData.medical_history.hospitalizations.length > 0 && (
                                <div className="mt-4 overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Reason
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Date
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Duration
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {formData.medical_history.hospitalizations.map((hospitalization, index) => (
                                                <tr key={index}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {hospitalization.reason}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(hospitalization.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {hospitalization.duration}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveHospitalization(index)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Family History */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Family History
                            </label>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="heart_disease"
                                        name="heart_disease"
                                        checked={formData.medical_history.family_history.heart_disease}
                                        onChange={handleFamilyHistoryChange}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="heart_disease" className="ml-2 block text-sm text-gray-700">
                                        Heart Disease
                                    </label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="diabetes"
                                        name="diabetes"
                                        checked={formData.medical_history.family_history.diabetes}
                                        onChange={handleFamilyHistoryChange}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="diabetes" className="ml-2 block text-sm text-gray-700">
                                        Diabetes
                                    </label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="cancer"
                                        name="cancer"
                                        checked={formData.medical_history.family_history.cancer}
                                        onChange={handleFamilyHistoryChange}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="cancer" className="ml-2 block text-sm text-gray-700">
                                        Cancer
                                    </label>
                                </div>
                                <div>
                                    <label htmlFor="other" className="block text-sm font-medium text-gray-700">
                                        Other Family History
                                    </label>
                                    <input
                                        type="text"
                                        id="other"
                                        name="other"
                                        value={formData.medical_history.family_history.other}
                                        onChange={handleFamilyHistoryChange}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button
                                type="button"
                                onClick={() => setActiveSection('medications')}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSection('female')}
                                className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                            >
                                Next: Female-Specific Info
                            </button>
                        </div>
                    </div>
                )}

                {/* Female-Specific Info Section */}
                {activeSection === 'female' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold border-b pb-2">Female-Specific Information</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Complete this section only if applicable. Skip if not relevant.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="pregnancy_status" className="block text-sm font-medium text-gray-700">
                                    Pregnancy Status
                                </label>
                                <select
                                    id="pregnancy_status"
                                    name="pregnancy_status"
                                    value={formData.gynecological?.pregnancy_status || ''}
                                    onChange={handleGynecologicalChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="">Select Status</option>
                                    <option value="Not Pregnant">Not Pregnant</option>
                                    <option value="Pregnant">Pregnant</option>
                                    <option value="Postpartum">Postpartum</option>
                                    <option value="Unknown">Unknown</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="last_menstrual_period" className="block text-sm font-medium text-gray-700">
                                    Last Menstrual Period
                                </label>
                                <input
                                    type="date"
                                    id="last_menstrual_period"
                                    name="last_menstrual_period"
                                    value={formData.gynecological?.last_menstrual_period || ''}
                                    onChange={handleGynecologicalChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="contraceptive_use" className="block text-sm font-medium text-gray-700">
                                    Contraceptive Use
                                </label>
                                <select
                                    id="contraceptive_use"
                                    name="contraceptive_use"
                                    value={formData.gynecological?.contraceptive_use || ''}
                                    onChange={handleGynecologicalChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="">Select Option</option>
                                    <option value="None">None</option>
                                    <option value="Hormonal">Hormonal</option>
                                    <option value="IUD">IUD</option>
                                    <option value="Barrier">Barrier</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button
                                type="button"
                                onClick={() => setActiveSection('history')}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Previous
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                                Save Patient
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default AddPatient;