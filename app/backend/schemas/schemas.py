from pydantic import BaseModel, Field
from typing import Optional, List  # Added List
from bson import ObjectId
from datetime import datetime # Added datetime

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_after_validator_function(
            cls.validate, core_schema.str_schema()
        )

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {"type": "string", "format": "objectid"}

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)


class PatientRead(BaseModel):
    id: PyObjectId = Field(alias="_id")
    firstName: str
    lastName: str
    email: Optional[str] = ""  # Make email optional with default empty string
    phone: str
    gender: str

    model_config = {
        "populate_by_name": True,
        "from_attributes": True,
        "json_encoders": {ObjectId: str}
    }


class PatientUpdate(BaseModel): # This is the original minimal version used by routers/patients.py
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None


# Schemas moved from main.py
class Token(BaseModel):
    access_token: str
    token_type: str
    username: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    password: str
    email: str
    full_name: Optional[str] = None
    # Add other fields needed during mobile signup
    firstName: Optional[str] = None # Or first_name depending on mobile app field name
    lastName: Optional[str] = None  # Or last_name
    phone: Optional[str] = None
    gender: Optional[str] = None

class WorkLocationResponse(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None

class UserResponse(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    id: str # Assuming id is added after creation, like in main.py
    phone: Optional[str] = None
    specialization: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    work_location: Optional[WorkLocationResponse] = None

# Define nested models for detailed patient information
class EmergencyContact(BaseModel):
    name: Optional[str] = None
    relation: Optional[str] = None
    phone: Optional[str] = None

class DiabetesInfo(BaseModel):
    has_diabetes: Optional[bool] = False
    diabetes_type: Optional[str] = None  # Type 1, Type 2, Gestational, Pre-diabetes
    diagnosis_date: Optional[str] = None
    treatment: Optional[str] = None  # Insulin, Oral meds, Diet-controlled
    last_hba1c: Optional[str] = None
    complications: Optional[List[str]] = None  # Neuropathy, Retinopathy, Nephropathy

class BloodPressureInfo(BaseModel):
    hypertension_status: Optional[str] = None  # Normal, Elevated, Stage 1, Stage 2
    last_bp_systolic: Optional[int] = None
    last_bp_diastolic: Optional[int] = None
    medications: Optional[List[str]] = None
    hypertensive_crisis_history: Optional[bool] = False

class BloodInfo(BaseModel):
    blood_group: Optional[str] = None  # A, B, AB, O
    rh_factor: Optional[str] = None  # +, -
    anemia: Optional[str] = None
    bleeding_disorders: Optional[str] = None
    recent_cbc: Optional[str] = None

class CardiovascularInfo(BaseModel):
    conditions: Optional[List[str]] = None  # CAD, Arrhythmia, Heart Failure
    ecg_history: Optional[str] = None
    cholesterol_ldl: Optional[str] = None
    cholesterol_hdl: Optional[str] = None
    triglycerides: Optional[str] = None
    family_history: Optional[bool] = False

class GynecologicalInfo(BaseModel):
    last_menstrual_period: Optional[str] = None
    menopausal_status: Optional[str] = None
    pap_smear_history: Optional[str] = None
    pregnancy_history: Optional[str] = None  # Gravida/Para
    contraceptive_use: Optional[str] = None
    sti_history: Optional[List[str]] = None

class LifestyleInfo(BaseModel):
    smoking: Optional[str] = None  # Current, Former, Never
    alcohol_consumption: Optional[str] = None
    physical_activity: Optional[str] = None
    diet_preferences: Optional[List[str]] = None
    family_disease_history: Optional[List[str]] = None

class AllergyMedication(BaseModel):
    drug_allergies: Optional[List[str]] = None
    current_medications: Optional[List[dict]] = None  # List of {name, dosage, frequency}
    supplements: Optional[List[str]] = None

class SpecialistNotes(BaseModel):
    cardiology_notes: Optional[str] = None
    gynecology_notes: Optional[str] = None
    other_notes: Optional[str] = None

class PatientBase(BaseModel):
    # Basic Information
    firstName: str
    lastName: str
    date_of_birth: Optional[str] = None
    age: Optional[int] = None
    gender: str
    phone: str
    email: Optional[str] = ""  # Make email optional with default empty string
    address: Optional[str] = None
    national_id: Optional[str] = None
    health_insurance: Optional[str] = None
    # Mobile app authentication fields (will be generated in the backend)
    username: Optional[str] = None
    hashed_password: Optional[str] = None


    # Medical History
    diabetes: Optional[DiabetesInfo] = None
    blood_pressure: Optional[BloodPressureInfo] = None
    blood_info: Optional[BloodInfo] = None
    cardiovascular: Optional[CardiovascularInfo] = None
    gynecological: Optional[GynecologicalInfo] = None

    # Physical Measurements
    height: Optional[float] = None  # Height in cm
    weight: Optional[float] = None  # Weight in kg
    bmi: Optional[float] = None     # Body Mass Index

    # Lifestyle & Risk Factors
    lifestyle: Optional[LifestyleInfo] = None

    # Allergies & Medications
    allergies_medications: Optional[AllergyMedication] = None

    # Specialist Notes
    specialist_notes: Optional[SpecialistNotes] = None

    # General Medical History
    medical_history: Optional[str] = None

    # User ID (doctor who owns this record)
    user_id: Optional[str] = None

class PatientUpdateFull(BaseModel): # Renamed from PatientUpdate in main.py
    # Basic Information
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    date_of_birth: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    national_id: Optional[str] = None
    health_insurance: Optional[str] = None
    # Mobile app authentication fields
    username: Optional[str] = None
    hashed_password: Optional[str] = None

    # Medical History
    diabetes: Optional[DiabetesInfo] = None
    blood_pressure: Optional[BloodPressureInfo] = None
    blood_info: Optional[BloodInfo] = None
    cardiovascular: Optional[CardiovascularInfo] = None
    gynecological: Optional[GynecologicalInfo] = None

    # Physical Measurements
    height: Optional[float] = None  # Height in cm
    weight: Optional[float] = None  # Weight in kg
    bmi: Optional[float] = None     # Body Mass Index

    # Lifestyle & Risk Factors
    lifestyle: Optional[LifestyleInfo] = None

    # Allergies & Medications
    allergies_medications: Optional[AllergyMedication] = None

    # Specialist Notes
    specialist_notes: Optional[SpecialistNotes] = None

    # General Medical History
    medical_history: Optional[str] = None

    # Last visit information
    last_visit: Optional[str] = None

    # User ID (doctor who owns this record)
    user_id: Optional[str] = None

class PatientResponse(PatientBase):
    id: str # Assuming id is added after creation
    last_visit: Optional[str] = None # Assuming this should be datetime or str
    created_at: Optional[str] = None # Assuming this should be datetime or str
    password: Optional[str] = None  # For returning the generated password to the doctor

    model_config = {
        "populate_by_name": True,
        "from_attributes": True,
        "json_encoders": {ObjectId: str}
    }

class ReportCreate(BaseModel):
    patient_id: str
    report_type: str
    file_path: str
    uploaded_at: datetime

class TextReportCreate(BaseModel):
    patient_id: str
    title: str
    findings: Optional[str] = ""
    recommendations: Optional[str] = ""
    date: str

class ReportResponse(BaseModel):
    id: str
    patient_id: str
    report_type: Optional[str] = None
    file_path: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    title: Optional[str] = None
    findings: Optional[str] = None
    recommendations: Optional[str] = None
    date: Optional[str] = None
    doctor: Optional[str] = None
    patient_name: Optional[str] = None

    model_config = {
        "populate_by_name": True,
        "from_attributes": True,
        "json_encoders": {ObjectId: str}
    }

class PatientMobileResponse(BaseModel):
    id: str
    username: str
    firstName: str
    lastName: str
    email: Optional[str] = ""
    phone: str
    gender: str
    date_of_birth: Optional[str] = None

    model_config = {
        "populate_by_name": True,
        "from_attributes": True,
        "json_encoders": {ObjectId: str}
    }
