from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from bson import ObjectId
from pydantic import BaseModel

# Import database collections
from core.database import doctor_collection, patient_collection

# Import security for authentication
from core.security import get_current_user, get_current_doctor

# Define doctor response model
class DoctorResponse(BaseModel):
    id: str
    name: str
    specialty: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None

router = APIRouter(prefix="/doctors", tags=["Doctors"])

@router.get("", response_model=List[DoctorResponse])
async def get_doctors():
    """
    Get a list of all doctors.
    This endpoint is used by the mobile app to display the list of doctors.
    """
    try:
        print("Fetching all doctors")

        # Get all doctors from the database
        doctors = await doctor_collection.find().to_list(length=100)
        print(f"Found {len(doctors)} doctors in database")

        # Convert the doctors to the response model format
        result = []
        for doc in doctors:
            # Create the name from first_name and last_name or use full_name
            if "first_name" in doc and "last_name" in doc:
                name = f"Dr. {doc.get('first_name', '')} {doc.get('last_name', '')}"
            else:
                name = doc.get("full_name", "Unknown Doctor")
                if not name.startswith("Dr."):
                    name = f"Dr. {name}"

            # Create the doctor response with clean ID
            doctor_id = str(doc["_id"]).strip()

            doctor_data = {
                "id": doctor_id,
                "name": name,
                "specialty": doc.get("specialty", None),
                "email": doc.get("email", None),
                "phone": doc.get("phone_number", doc.get("phone", None)),
                "address": doc.get("address", None),
                "bio": doc.get("bio", None)
            }
            result.append(doctor_data)
            print(f"Added doctor: ID='{doctor_id}', Name='{name}'")

        print(f"Returning {len(result)} doctors")
        return result
    except Exception as e:
        print(f"Error retrieving doctors: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving doctors: {str(e)}")

@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(doctor_id: str):
    """
    Get a specific doctor by ID.
    This endpoint is used by the mobile app to display doctor details.
    """
    try:
        # Clean up the doctor_id to handle potential format issues
        doctor_id = doctor_id.strip()
        print(f"Fetching doctor with ID: '{doctor_id}'")

        # Try to find the doctor by ID
        try:
            doc = await doctor_collection.find_one({"_id": ObjectId(doctor_id)})
        except Exception as e:
            print(f"Error with ObjectId conversion: {e}")
            # Try to find by string ID as fallback
            doc = await doctor_collection.find_one({"id": doctor_id})

        if not doc:
            # If still not found, get all doctors and log their IDs for debugging
            all_doctors = await doctor_collection.find().to_list(length=100)
            print(f"Doctor not found. Available doctors: {[str(d.get('_id')) for d in all_doctors]}")
            raise HTTPException(status_code=404, detail="Doctor not found")

        # Create the name from first_name and last_name or use full_name
        if "first_name" in doc and "last_name" in doc:
            name = f"Dr. {doc.get('first_name', '')} {doc.get('last_name', '')}"
        else:
            name = doc.get("full_name", "Unknown Doctor")
            if not name.startswith("Dr."):
                name = f"Dr. {name}"

        # Create the doctor response
        doctor_data = {
            "id": str(doc["_id"]),
            "name": name,
            "specialty": doc.get("specialty", None),
            "email": doc.get("email", None),
            "phone": doc.get("phone_number", doc.get("phone", None)),
            "address": doc.get("address", None),
            "bio": doc.get("bio", None)
        }

        print(f"Returning doctor data: {doctor_data}")
        return doctor_data
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"Error retrieving doctor: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving doctor: {str(e)}")