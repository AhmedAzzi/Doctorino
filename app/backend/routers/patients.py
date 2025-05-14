from fastapi import APIRouter, HTTPException, status, Response, Depends
from typing import List, Dict, Any, Optional
from bson import ObjectId
from datetime import datetime
import random
import string
from core.database import patient_collection as collection
from core.database import appointment_collection,doctor_collection
from schemas.schemas import PatientRead, PatientUpdate, PatientBase as SchemaPatientBase
from schemas.schemas import PatientResponse, PatientUpdateFull
from pydantic import BaseModel, EmailStr, Field
from core.security import get_current_user, get_password_hash

router = APIRouter(prefix="/patients", tags=["Patients"])
# collection = patient_collection

def generate_username_and_password(first_name: str, last_name: str, phone: str):
    """
    Generate a username and password for a patient.
    Username is based on first name, last name, and a random number.
    Password is a random string of 8 characters.
    """
    # Generate username (lowercase first name + first letter of last name + last 4 digits of phone)
    first_name_clean = ''.join(e for e in first_name if e.isalnum()).lower()
    last_initial = last_name[0].lower() if last_name else ''
    phone_suffix = ''.join(filter(str.isdigit, phone))[-4:] if phone else ''.join(random.choices(string.digits, k=4))

    username = f"{first_name_clean}{last_initial}{phone_suffix}"

    # Generate a random password (8 characters: letters + digits)
    password_chars = string.ascii_letters + string.digits
    password = ''.join(random.choices(password_chars, k=8))

    return username, password

class PatientBase(BaseModel):
    firstName: str
    lastName: str
    gender: str
    email: Optional[str] = ""  # Make email optional with default empty string
    phone: str
    date_of_birth: Optional[str] = None  # Add date_of_birth field

class PatientCreate(PatientBase):
    pass

class Patient(PatientBase):
    id: str
    password: Optional[str] = None  # For returning the generated password to the doctor
    username: Optional[str] = None  # For returning the generated username to the doctor

    class Config:
        from_attributes = True

@router.post("/", response_model=Patient)
async def create_patient(patient: PatientCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    patient_dict = patient.model_dump()

    # Generate username and password
    username, password = generate_username_and_password(
        patient_dict["firstName"],
        patient_dict["lastName"],
        patient_dict["phone"]
    )

    # Add the user_id to the patient record
    patient_dict["user_id"] = str(current_user.get("_id"))

    # Add username and hashed password
    patient_dict["username"] = username
    patient_dict["hashed_password"] = get_password_hash(password)

    # Add creation timestamp
    patient_dict["created_at"] = datetime.now().isoformat()

    # Store the original password temporarily for return (will not be stored in DB)
    temp_password = password

    result = await collection.insert_one(patient_dict)
    created_patient = await collection.find_one({"_id": result.inserted_id})
    created_patient["id"] = str(created_patient.pop("_id"))

    # Add the plain password to the response (but it's not stored in DB)
    # This is just for the doctor to see and share with the patient
    created_patient["password"] = temp_password

    return created_patient

@router.post("/detailed", response_model=PatientResponse)
async def create_detailed_patient(patient: SchemaPatientBase, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Create a new patient with detailed medical information.
    This endpoint accepts a comprehensive set of patient data including medical history,
    lifestyle factors, allergies, and specialist notes.
    """
    try:
        # Convert the patient model to a dictionary
        patient_dict = patient.model_dump(exclude_unset=True)

        # Generate username and password
        username, password = generate_username_and_password(
            patient_dict["firstName"],
            patient_dict["lastName"],
            patient_dict["phone"]
        )

        # Add username and hashed password
        patient_dict["username"] = username
        patient_dict["hashed_password"] = get_password_hash(password)

        # Add the user_id and creation timestamp
        patient_dict["user_id"] = str(current_user.get("_id"))
        patient_dict["created_at"] = datetime.now().isoformat()

        # Insert the patient record
        result = await collection.insert_one(patient_dict)

        # Retrieve the created patient
        created_patient = await collection.find_one({"_id": result.inserted_id})
        if not created_patient:
            raise HTTPException(status_code=404, detail="Failed to retrieve created patient")

        # Convert ObjectId to string for the response
        created_patient["id"] = str(created_patient.pop("_id"))

        # Add the plain password to the response (but it's not stored in DB)
        # This is just for the doctor to see and share with the patient
        created_patient["password"] = password

        return created_patient
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating patient: {str(e)}")

@router.get("/", response_model=List[Patient])
async def list_patients(current_user: Dict[str, Any] = Depends(get_current_user)):
    patients = []
    # Filter patients by the current user's ID
    user_id = str(current_user.get("_id"))
    async for patient in collection.find({"user_id": user_id}):
        patient["id"] = str(patient.pop("_id"))
        patients.append(patient)
    return patients

@router.get("/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    try:
        user_id = str(current_user.get("_id"))
        patient = await collection.find_one({
            "_id": ObjectId(patient_id),
            "user_id": user_id  # Ensure the patient belongs to the current user
        })
        if patient is None:
            raise HTTPException(status_code=404, detail="Patient not found")
        patient["id"] = str(patient.pop("_id"))
        return patient
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/detailed/{patient_id}", response_model=PatientResponse)
async def get_detailed_patient(patient_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get detailed patient information including medical history and other comprehensive data.
    """
    try:
        user_id = str(current_user.get("_id"))
        patient = await collection.find_one({
            "_id": ObjectId(patient_id),
            "user_id": user_id  # Ensure the patient belongs to the current user
        })
        if patient is None:
            raise HTTPException(status_code=404, detail="Patient not found")

        # Convert ObjectId to string for the response
        patient["id"] = str(patient.pop("_id"))

        return patient
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error retrieving patient: {str(e)}")

@router.put("/{patient_id}", response_model=Patient)
async def update_patient(patient_id: str, patient: PatientCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    try:
        user_id = str(current_user.get("_id"))
        # First check if the patient exists and belongs to the current user
        existing_patient = await collection.find_one({
            "_id": ObjectId(patient_id),
            "user_id": user_id
        })
        if not existing_patient:
            raise HTTPException(status_code=404, detail="Patient not found or you don't have permission to update this patient")

        patient_dict = patient.model_dump()
        # Ensure the user_id remains the same
        patient_dict["user_id"] = user_id

        result = await collection.update_one(
            {"_id": ObjectId(patient_id), "user_id": user_id},
            {"$set": patient_dict}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Patient not found or update failed")

        updated_patient = await collection.find_one({"_id": ObjectId(patient_id)})
        updated_patient["id"] = str(updated_patient.pop("_id"))
        return updated_patient
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/detailed/{patient_id}", response_model=PatientResponse)
async def update_detailed_patient(
    patient_id: str,
    patient: PatientUpdateFull,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a patient with detailed medical information.
    This endpoint accepts partial updates to any of the comprehensive patient data fields.
    """
    try:
        user_id = str(current_user.get("_id"))

        # First check if the patient exists and belongs to the current user
        existing_patient = await collection.find_one({
            "_id": ObjectId(patient_id),
            "user_id": user_id
        })
        if not existing_patient:
            raise HTTPException(
                status_code=404,
                detail="Patient not found or you don't have permission to update this patient"
            )

        # Convert the patient model to a dictionary, excluding unset fields
        patient_dict = patient.model_dump(exclude_unset=True)

        # Ensure the user_id remains the same
        patient_dict["user_id"] = user_id

        # Add update timestamp
        patient_dict["updated_at"] = datetime.now().isoformat()

        # Update the patient record
        result = await collection.update_one(
            {"_id": ObjectId(patient_id), "user_id": user_id},
            {"$set": patient_dict}
        )

        if result.modified_count == 0:
            # No changes were made, but the patient exists
            if result.matched_count > 0:
                # Return the existing patient without changes
                updated_patient = existing_patient
            else:
                raise HTTPException(status_code=404, detail="Patient not found or update failed")
        else:
            # Fetch the updated patient
            updated_patient = await collection.find_one({"_id": ObjectId(patient_id)})

        # Convert ObjectId to string for the response
        updated_patient["id"] = str(updated_patient.pop("_id"))

        return updated_patient
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating patient: {str(e)}")

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(patient_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    try:
        user_id = str(current_user.get("_id"))
        # Delete the patient only if it belongs to the current user
        result = await collection.delete_one({
            "_id": ObjectId(patient_id),
            "user_id": user_id
        })
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Patient not found or you don't have permission to delete this patient")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

