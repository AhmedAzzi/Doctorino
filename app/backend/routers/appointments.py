from fastapi import APIRouter, HTTPException, status, Depends, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId

# Import database collections
from core.database import appointment_collection, patient_collection

# Import security for authentication
from core.security import get_current_user

# Import schemas if needed (though these endpoints currently return dicts)
# from schemas.schemas import AppointmentResponse # Example if you create specific schemas

# Define a model for appointment creation
class AppointmentCreate(BaseModel):
    patient_id: str
    date: str
    time: str
    reason: str
    status: str = "Pending"
    doctor_id: Optional[str] = None
    created_by_mobile: Optional[bool] = None
    created_by_mobile_str: Optional[str] = None  # For string representation
    cost: Optional[float] = None  # Cost for the appointment

router = APIRouter(prefix="/appointments", tags=["Appointments"])

@router.get("/")
async def get_appointments(
    patient_id: Optional[str] = None,
    date: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a list of all appointments.

    If patient_id is provided, returns appointments for that patient.
    If date is provided, returns appointments for that specific date.
    Otherwise, returns appointments for all patients belonging to the current user.
    """
    user_id = str(current_user.get("_id"))

    # Determine if the current user is a doctor or a patient
    is_doctor = current_user.get("is_doctor", False)

    # Build the query based on parameters
    query = {}

    if patient_id:
        # If patient_id is provided, get appointments for that specific patient
        query["patient_id"] = patient_id
    elif is_doctor:
        # If user is a doctor, get appointments where doctor_id matches user_id
        # or where user_id matches (for backward compatibility)
        query["$or"] = [
            {"doctor_id": user_id},
            {"user_id": user_id}
        ]
    else:
        # If user is a patient, get appointments where patient_id matches user_id
        query["patient_id"] = user_id

    # If date is provided, filter by that specific date
    if date:
        query["date"] = date

    # Find appointments based on the query
    appointments_cursor = appointment_collection.find(query)
    appointments = []

    async for appointment in appointments_cursor:
        # Get patient name
        patient_id = appointment.get("patient_id")
        patient_name = "Unknown"
        doctor_name = "Unknown"

        # Try to get patient name
        if patient_id:
            try:
                if ObjectId.is_valid(patient_id):
                    # First try to find in patient_collection (standard patients)
                    patient = await patient_collection.find_one({"_id": ObjectId(patient_id)})

                    # If not found in patient_collection, trydoctor_collection (mobile app users)
                    if not patient:
                        #  import doctor_collection here to avoid circular imports
                        from core.database  import doctor_collection
                        patient = await doctor_collection.find_one({"_id": ObjectId(patient_id)})

                    if patient:
                        # Try different name fields that might exist
                        first_name = patient.get('firstName', patient.get('first_name', ''))
                        last_name = patient.get('lastName', patient.get('last_name', ''))
                        full_name = patient.get('full_name', '')

                        print(f"Patient data found: first_name={first_name}, last_name={last_name}, full_name={full_name}")

                        if full_name:
                            patient_name = full_name
                        elif first_name or last_name:
                            patient_name = f"{first_name} {last_name}".strip()
                        else:
                            patient_name = patient.get('username', 'Unknown')

                        # If we still have "Unknown", try email as last resort
                        if patient_name == "Unknown" and patient.get('email'):
                            patient_name = patient.get('email')
            except Exception as e:
                print(f"Error fetching patient {patient_id} for appointment {appointment['_id']}: {e}")

        # Try to get doctor name from either doctor_id or user_id
        doctor_id = appointment.get("doctor_id")
        user_id = appointment.get("user_id")
        doctor_id_to_use = doctor_id if doctor_id else user_id

        if doctor_id_to_use:
            try:
                if ObjectId.is_valid(doctor_id_to_use):
                    #  import doctor_collection here to avoid circular imports
                    from core.database  import doctor_collection
                    doctor = await doctor_collection.find_one({"_id": ObjectId(doctor_id_to_use)})
                    if doctor:
                        # Try to get the doctor's name from various possible fields
                        # full_name = doctor.get("full_name")
                        first_name = doctor.get("first_name", doctor.get("firstName", ""))
                        last_name = doctor.get("last_name", doctor.get("lastName", ""))

                        if first_name or last_name:
                            doctor_name = f"Dr. {first_name.capitalize()} {last_name.capitalize()}".strip()
                        else:
                            doctor_name = doctor.get("username", "Unknown")
            except Exception as e:
                print(f"Error determining doctor name for {doctor_id_to_use}: {e}")

        appointments.append({
            "id": str(appointment["_id"]),
            "patient_id": patient_id,
            "patient_name": patient_name,
            "doctor_id": doctor_id,
            "doctor_name": doctor_name,
            "date": appointment.get("date", "Unknown"),
            "time": appointment.get("time", "Unknown"),
            "status": appointment.get("status", "Pending"),
            "reason": appointment.get("reason", ""),
            "patient_added_to_doctor": appointment.get("patient_added_to_doctor", False),
            "created_by_patient": appointment.get("doctor_id") is not None and appointment.get("user_id") != user_id
        })

    return appointments


@router.get("/{appointment_id}")
async def get_appointment(appointment_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get details for a specific appointment, including patient info if permitted."""
    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID format")

    try:
        appointment_obj_id = ObjectId(appointment_id)
    except Exception as e:
        # Handle potential errors during ObjectId conversion
        raise HTTPException(status_code=400, detail=f"Invalid appointment ID format: {e}")

    appointment = await appointment_collection.find_one({"_id": appointment_obj_id})

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    patient_id = appointment.get("patient_id")
    patient_details = None
    patient_name_display = "Unknown"
    is_appointment_mobile_created = appointment.get("created_by_mobile", False)
    patient_linked_to_current_doctor = False  # Initialize this variable here to avoid errors

    # Get user info first
    user_id = str(current_user.get("_id"))
    is_current_user_doctor = current_user.get("is_doctor", False)

    # Additional check: if the patient exists in thedoctor_collection, consider it a mobile user
    from core.database  import doctor_collection

    # Check if patient exists indoctor_collection (mobile app)
    if patient_id and ObjectId.is_valid(patient_id):
        try:
            # First check if the patient exists in thedoctor_collection (mobile app users)
            mobile_user = await doctor_collection.find_one({"_id": ObjectId(patient_id)})

            # Also check if the patient exists in the patient_collection
            patient_exists = await patient_collection.find_one({"_id": ObjectId(patient_id)})

            # If the patient exists indoctor_collection, they're from the mobile app
            if mobile_user:
                is_appointment_mobile_created = True
                # Update the appointment to mark it as created_by_mobile for future queries
                await appointment_collection.update_one(
                    {"_id": ObjectId(appointment_id)},
                    {"$set": {"created_by_mobile": True}}
                )
                print(f"[Appt Detail {appointment_id}] Found patient indoctor_collection, marking as mobile user")

            # Check if the patient is linked to the current doctor
            if patient_exists and patient_exists.get("user_id") == user_id:
                patient_linked_to_current_doctor = True
                print(f"[Appt Detail {appointment_id}] Patient is linked to the current doctor")

            # Debug info
            print(f"[Appt Detail {appointment_id}] Patient check: mobile_user={mobile_user is not None}, patient_exists={patient_exists is not None}, linked_to_doctor={patient_linked_to_current_doctor}")
        except Exception as e:
            print(f"Error checking if patient is from mobile app: {e}")
            # Make sure we don't propagate the error
            pass

    # Debug info
    print(f"[Appt Detail {appointment_id}] Current state: mobile={is_appointment_mobile_created}, linked={patient_linked_to_current_doctor}, doctor={is_current_user_doctor}")

    if patient_id and ObjectId.is_valid(patient_id):
        print(f"[Appt Detail {appointment_id}] Attempting to fetch patient/user doc for ID: {patient_id}")
        patient_doc = None
        try:
            # First, try finding in patient_collection (standard patients linked to doctors)
            patient_doc = await patient_collection.find_one({"_id": ObjectId(patient_id)})
            print(f"[Appt Detail {appointment_id}] Found in patient_collection: {patient_doc is not None}")

            # If not found in patient_collection, AND it's likely a mobile user (created_by_mobile flag in appointment or no doctor_id)
            # try finding indoctor_collection.
            if not patient_doc and (is_appointment_mobile_created or not appointment.get("doctor_id")):
                 print(f"[Appt Detail {appointment_id}] Not found in patient_collection, tryingdoctor_collection...")
                 # Usedoctor_collection from core.database
                 from core.database  import doctor_collection # Import here or at top
                 patient_doc = await doctor_collection.find_one({"_id": ObjectId(patient_id)})
                 print(f"[Appt Detail {appointment_id}] Found indoctor_collection: {patient_doc is not None}")

            # Log the final fetched doc (could be from either collection or None)
            print(f"[Appt Detail {appointment_id}] Final patient_doc to use: {patient_doc}")

            if not patient_doc:
                print(f"[Appt Detail {appointment_id}] Warning: Patient/User document not found for ID {patient_id} in relevant collections.")
                # Keep patient_name_display as "Unknown", patient_details as None
            else:
                # Determine if the patient record itself indicates a mobile/unlinked user
                # Check user_id field within the fetched patient_doc
                is_patient_record_mobile_or_unlinked = patient_doc.get("created_by_mobile", False) or not patient_doc.get("user_id")
                print(f"[Appt Detail {appointment_id}] is_appointment_mobile_created: {is_appointment_mobile_created}")
                print(f"[Appt Detail {appointment_id}] is_patient_record_mobile_or_unlinked: {is_patient_record_mobile_or_unlinked}")

                # Determine if the current user can view this patient's details
                can_view_patient = False
                print(f"[Appt Detail {appointment_id}] Checking permissions for user {user_id} (is_doctor: {is_current_user_doctor}) viewing patient {patient_id}")
                # 1. User is the patient themselves
                if patient_id == user_id:
                    can_view_patient = True
                    print(f"[Appt Detail {appointment_id}] Access granted: User is the patient.")
                # 2. User is the doctor explicitly assigned to the appointment
                elif appointment.get("doctor_id") == user_id:
                    can_view_patient = True
                    print(f"[Appt Detail {appointment_id}] Access granted: User is the assigned doctor.")
                # 3. User is a doctor AND the patient is linked to them
                elif is_current_user_doctor and patient_doc.get("user_id") == user_id:
                    can_view_patient = True
                    print(f"[Appt Detail {appointment_id}] Access granted: Doctor owns linked patient.")
                # 4. User is a doctor AND viewing an appointment created by mobile OR for an unlinked patient
                elif is_current_user_doctor and (is_appointment_mobile_created or is_patient_record_mobile_or_unlinked):
                    can_view_patient = True
                    print(f"[Appt Detail {appointment_id}] Access granted: Doctor viewing mobile/unlinked patient appointment.")

                if can_view_patient:
                    print(f"[Appt Detail {appointment_id}] Extracting patient details...")
                    # Extract patient name - Prioritize specific fields, then fallback
                    full_name = patient_doc.get('full_name')
                    first_name = patient_doc.get('firstName', patient_doc.get('first_name'))
                    last_name = patient_doc.get('lastName', patient_doc.get('last_name'))
                    username = patient_doc.get('username')
                    email = patient_doc.get('email')
                    print(f"[Appt Detail {appointment_id}] Raw name fields: full='{full_name}', first='{first_name}', last='{last_name}', user='{username}', email='{email}'")

                    if full_name and full_name.strip():
                        patient_name_display = full_name.strip()
                    elif first_name or last_name:
                        f_name = first_name or ""
                        l_name = last_name or ""
                        combined_name = f"{f_name} {l_name}".strip()
                        if combined_name: # Use combined name only if it's not empty
                             patient_name_display = combined_name
                    elif username and username.strip():
                        patient_name_display = username.strip()
                    elif email and email.strip():
                         patient_name_display = email.strip()

                    # Final fallback if still "Unknown"
                    if patient_name_display == "Unknown":
                         patient_name_display = f"Patient ({patient_id[-6:]})"

                    print(f"[Appt Detail {appointment_id}] Determined patient_name_display: '{patient_name_display}'")

                    # Get phone from either phone or phone_number field
                    phone = patient_doc.get("phone", patient_doc.get("phone_number", ""))

                    patient_details = {
                        "id": patient_id,
                        "name": patient_name_display,
                        "firstName": first_name or "",
                        "lastName": last_name or "",
                        "email": email or "",
                        "phone": phone,
                        "gender": patient_doc.get("gender", ""),
                        # Add any other relevant fields the frontend might need
                    }

                    print(f"[Appt Detail {appointment_id}] Patient details: {patient_details}")

                    # Check if this patient is currently linked to the *viewing* doctor
                    if is_current_user_doctor and patient_doc.get("user_id") == user_id:
                        patient_linked_to_current_doctor = True
                    # Note: patient_linked_to_doctor remains false if patient is unlinked or linked to another doctor

                else:
                    # User doesn't have permission to view patient details for this appointment
                    print(f"Permission denied for user {user_id} to view patient {patient_id} details for appointment {appointment_id}")
                    # Keep patient_name_display as "Unknown", patient_details as None

        except Exception as e:
            # Log the error but don't necessarily crash the whole request
            # Let the function return the appointment data without patient details
            print(f"Error fetching or processing patient {patient_id} for appointment {appointment_id}: {e}")
            # Keep patient_name_display as "Unknown", patient_details as None

    # Get doctor name from either doctor_id or user_id
    doctor_id = appointment.get("doctor_id")
    user_id_from_appointment = appointment.get("user_id")
    doctor_id_to_use = doctor_id if doctor_id else user_id_from_appointment
    doctor_name = "Unknown"

    # Look up doctor name from user collection if doctor_id or user_id exists
    if doctor_id_to_use and ObjectId.is_valid(doctor_id_to_use):
        try:
            from core.database  import doctor_collection
            doctor = await doctor_collection.find_one({"_id": ObjectId(doctor_id_to_use)})
            if doctor:
                first_name = doctor.get("first_name", doctor.get("firstName", ""))
                last_name = doctor.get("last_name", doctor.get("lastName", ""))

                if first_name or last_name:
                    doctor_name = f"Dr. {first_name.capitalize()} {last_name.capitalize()}".strip()
                else:
                    doctor_name = doctor.get("username", "Unknown")

                # Log the doctor name found
                print(f"Found doctor name '{doctor_name}' for ID {doctor_id_to_use}")
        except Exception as e:
            # Log error but continue with "Unknown" as doctor name
            print(f"Error fetching doctor name for ID {doctor_id_to_use}: {e}")

    appointment_data = {
        "id": str(appointment["_id"]),
        "patient_id": patient_id,
        "patient_name": patient_name_display, # Use the determined name
        "date": appointment.get("date", "Unknown"),
        "time": appointment.get("time", "Unknown"),
        "status": appointment.get("status", "Pending"),
        "reason": appointment.get("reason", ""),
        "notes": appointment.get("notes", ""),
        "patient_details": patient_details, # Include full details dict or null
        "created_by_mobile": is_appointment_mobile_created, # Use the flag from appointment doc
        "doctor_id": doctor_id,
        "doctor_name": doctor_name,
        # Flag for frontend button logic
        "patient_linked_to_doctor": patient_linked_to_current_doctor
    }

    return appointment_data

@router.post("/")
async def create_appointment(
    patient_id: str,
    date: str,
    time: str,
    reason: str,
    status: str = "Pending",
    doctor_id: Optional[str] = None,
    created_by_mobile: Optional[str] = None,
    cost: Optional[float] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new appointment.

    This endpoint can be used in three ways:
    1. By doctors to create appointments for their patients
    2. By patients to book appointments with doctors
    3. By mobile app users to book appointments with doctors
    """
    if not ObjectId.is_valid(patient_id):
        raise HTTPException(status_code=400, detail="Invalid patient ID format")

    # Get the user_id
    user_id = str(current_user.get("_id"))

    # Check if this is a mobile app booking
    # Convert string representation of boolean to actual boolean
    is_mobile_booking = False
    if created_by_mobile is not None:
        if isinstance(created_by_mobile, bool):
            is_mobile_booking = created_by_mobile
        elif isinstance(created_by_mobile, str):
            is_mobile_booking = created_by_mobile.lower() in ['true', '1', 'yes']

    if is_mobile_booking:
        # For mobile app bookings, check if the patient ID is the current user's ID
        if patient_id == user_id:
            # The patient is the current user, so we can proceed
            patient = {"_id": ObjectId(user_id)}  # Create a minimal patient object
        else:
            # Otherwise, verify the patient exists in the database
            patient = await patient_collection.find_one({
                "_id": ObjectId(patient_id)
            })

        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

        # Verify doctor exists if doctor_id is provided
        if doctor_id and ObjectId.is_valid(doctor_id):
            # Look up the doctor in the user collection
            from core.database  import doctor_collection
            doctor = await doctor_collection.find_one({
                "_id": ObjectId(doctor_id),
                "is_doctor": True  # Make sure it's actually a doctor
            })
            if not doctor:
                raise HTTPException(status_code=404, detail="Doctor not found")

        # Store the appointment with the mobile flag
        new_appointment = {
            "patient_id": patient_id,
            "doctor_id": doctor_id if doctor_id else None,
            "date": date,
            "time": time,
            "reason": reason,
            "status": status,
            "cost": float(cost) if cost is not None else None,
            "created_at": datetime.now().isoformat(),
            "user_id": doctor_id if doctor_id else user_id,  # The doctor will be the owner if specified
            "created_by_mobile": is_mobile_booking
        }

        # Print debug info
        print(f"Creating appointment with: {new_appointment}")
    else:
        # Check if this is a patient booking with a doctor
        is_patient_booking = doctor_id is not None and ObjectId.is_valid(doctor_id)

        if is_patient_booking:
            # This is a patient booking with a doctor
            # In this case, the patient_id should be the current user's ID or a patient associated with them
            if patient_id != user_id and not await patient_collection.find_one({"_id": ObjectId(patient_id), "user_id": user_id}):
                # For security, only allow booking for self or associated patients
                raise HTTPException(status_code=403, detail="You can only book appointments for yourself or your patients")

            # Store the appointment with the doctor's ID
            new_appointment = {
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "date": date,
                "time": time,
                "reason": reason,
                "status": status,
                "cost": float(cost) if cost is not None else None,
                "created_at": datetime.now().isoformat(),
                "user_id": doctor_id  # The doctor will be the owner of this appointment
            }
        else:
            # This is a doctor creating an appointment for their patient
            # Verify patient exists and belongs to the current user
            patient = await patient_collection.find_one({
                "_id": ObjectId(patient_id),
                "user_id": user_id
            })

            if not patient:
                raise HTTPException(status_code=404, detail="Patient not found or you don't have permission to create an appointment for this patient")

            new_appointment = {
                "patient_id": patient_id,
                "date": date,
                "time": time,
                "reason": reason,
                "status": status,
                "cost": float(cost) if cost is not None else None,
                "created_at": datetime.now().isoformat(),
                "user_id": user_id  # Store the user_id in the appointment as well for easier filtering
            }

    result = await appointment_collection.insert_one(new_appointment)

    return {
        "id": str(result.inserted_id),
        "patient_id": patient_id,
        "doctor_id": doctor_id if doctor_id else None,
        "date": date,
        "time": time,
        "reason": reason,
        "status": status,
        "cost": float(cost) if cost is not None else None,
        "created_by_mobile": is_mobile_booking
    }

@router.put("/{appointment_id}")
async def update_appointment(
    appointment_id: str,
    status: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update an appointment's status."""
    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID format")

    # Get the user_id and check if user is a doctor
    user_id = str(current_user.get("_id"))
    is_doctor = current_user.get("is_doctor", False)

    # Get the appointment
    appointment = await appointment_collection.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check if this is a mobile app appointment
    is_mobile_appointment = appointment.get("created_by_mobile", False)

    # Check permissions based on user role
    has_permission = False

    # Special case for mobile app appointments - allow updates
    if is_mobile_appointment:
        has_permission = True
    # Case 1: User is the doctor who owns this appointment
    elif is_doctor and (appointment.get("doctor_id") == user_id or appointment.get("user_id") == user_id):
        has_permission = True
    # Case 2: User is the patient for this appointment
    elif appointment.get("patient_id") == user_id:
        # Patients can only cancel their appointments, not change to other statuses
        if status.lower() in ["cancelled", "canceled"]:
            has_permission = True
        else:
            raise HTTPException(
                status_code=403,
                detail="Patients can only cancel appointments, not change to other statuses"
            )
    # Case 3: User is a doctor and the patient belongs to them
    elif is_doctor and appointment.get("patient_id"):
        patient_id = appointment.get("patient_id")
        if ObjectId.is_valid(patient_id):
            patient = await patient_collection.find_one({
                "_id": ObjectId(patient_id),
                "user_id": user_id
            })
            if patient:
                has_permission = True

    if not has_permission:
        raise HTTPException(status_code=403, detail="You don't have permission to update this appointment")

    # Update the appointment
    update_result = await appointment_collection.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {"status": status}}
    )

    if update_result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Appointment not updated")

    return {"message": "Appointment updated successfully"}

@router.delete("/{appointment_id}")
async def delete_appointment(appointment_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Delete an appointment."""
    if not ObjectId.is_valid(appointment_id):
        raise HTTPException(status_code=400, detail="Invalid appointment ID format")

    # Get the user_id and check if user is a doctor
    user_id = str(current_user.get("_id"))
    is_doctor = current_user.get("is_doctor", False)

    # Get the appointment
    appointment = await appointment_collection.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check if this is a mobile app appointment
    is_mobile_appointment = appointment.get("created_by_mobile", False)

    # Check permissions based on user role
    has_permission = False

    # Special case for mobile app appointments - allow deletion
    if is_mobile_appointment:
        has_permission = True
    # Case 1: User is the doctor who owns this appointment
    elif is_doctor and (appointment.get("doctor_id") == user_id or appointment.get("user_id") == user_id):
        has_permission = True
    # Case 2: User is the patient for this appointment
    elif appointment.get("patient_id") == user_id:
        has_permission = True
    # Case 3: User is a doctor and the patient belongs to them
    elif is_doctor and appointment.get("patient_id"):
        patient_id = appointment.get("patient_id")
        if ObjectId.is_valid(patient_id):
            patient = await patient_collection.find_one({
                "_id": ObjectId(patient_id),
                "user_id": user_id
            })
            if patient:
                has_permission = True

    if not has_permission:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this appointment")

    # Delete the appointment
    result = await appointment_collection.delete_one({"_id": ObjectId(appointment_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found or already deleted")

    return {"success": True, "message": "Appointment deleted successfully"}


from fastapi import Path # Import Path for path parameters

@router.post("/json", response_model=Dict[str, Any])
async def create_appointment_json(
    appointment: AppointmentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new appointment using JSON data.

    This endpoint is specifically designed for the mobile app to book appointments.
    It accepts a JSON body with appointment details instead of form parameters.
    """
    # Extract data from the appointment object
    patient_id = appointment.patient_id
    date = appointment.date
    time = appointment.time
    reason = appointment.reason
    status = appointment.status
    doctor_id = appointment.doctor_id
    cost = appointment.cost

    # Handle the created_by_mobile flag
    created_by_mobile = "true"
    if appointment.created_by_mobile is not None:
        created_by_mobile = "true" if appointment.created_by_mobile else "false"
    elif appointment.created_by_mobile_str is not None:
        created_by_mobile = appointment.created_by_mobile_str

    # Validate patient_id
    if not ObjectId.is_valid(patient_id):
        raise HTTPException(status_code=400, detail="Invalid patient ID format")

    # Get the user_id
    user_id = str(current_user.get("_id"))

    # Check if this is a mobile app booking
    # Convert string representation of boolean to actual boolean
    is_mobile_booking = True  # Default to True for this endpoint

    # Verify doctor exists if doctor_id is provided
    if doctor_id and ObjectId.is_valid(doctor_id):
        # Look up the doctor in the user collection
        from core.database import doctor_collection
        doctor = await doctor_collection.find_one({
            "_id": ObjectId(doctor_id),
            "is_doctor": True  # Make sure it's actually a doctor
        })
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")

    # Store the appointment with the mobile flag
    new_appointment = {
        "patient_id": patient_id,
        "doctor_id": doctor_id if doctor_id else None,
        "date": date,
        "time": time,
        "reason": reason,
        "status": status,
        "cost": float(cost) if cost is not None else None,
        "created_at": datetime.now().isoformat(),
        "user_id": doctor_id if doctor_id else user_id,  # The doctor will be the owner if specified
        "created_by_mobile": is_mobile_booking
    }

    # Print debug info
    print(f"Creating appointment via JSON endpoint with: {new_appointment}")

    result = await appointment_collection.insert_one(new_appointment)

    return {
        "id": str(result.inserted_id),
        "patient_id": patient_id,
        "doctor_id": doctor_id if doctor_id else None,
        "date": date,
        "time": time,
        "reason": reason,
        "status": status,
        "cost": float(cost) if cost is not None else None,
        "created_by_mobile": is_mobile_booking
    }

@router.post("/link-patient/{patient_id}", tags=["Patients", "Appointments"]) # Add Patients tag
async def link_patient_to_doctor(
    patient_id: str = Path(..., description="The ID of the patient (mobile user) to link"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Links a mobile patient record to the currently logged-in doctor."""
    if not current_user.get("is_doctor", False):
        raise HTTPException(status_code=403, detail="Only doctors can link patients.")

    if not ObjectId.is_valid(patient_id):
        raise HTTPException(status_code=400, detail="Invalid patient ID format")

    doctor_id = str(current_user.get("_id"))

    print(f"Attempting to link patient {patient_id} to doctor {doctor_id}")

    # First check if this patient is already linked to this doctor
    existing_patient = await patient_collection.find_one({
        "_id": ObjectId(patient_id),
        "user_id": doctor_id
    })

    if existing_patient:
        print(f"Patient {patient_id} is already linked to doctor {doctor_id}")
        return {"message": "Patient is already in your list."}

    # Check if the patient exists in thedoctor_collection (mobile app users)
    from core.database  import doctor_collection
    mobile_user = await doctor_collection.find_one({"_id": ObjectId(patient_id)})
    if mobile_user:
        print(f"Found patient {patient_id} indoctor_collection (mobile app)")
        # This is a mobile app user, mark any appointments as created_by_mobile
        await appointment_collection.update_many(
            {"patient_id": patient_id},
            {"$set": {"created_by_mobile": True}}
        )

    # First, try to find the patient in the patient_collection
    patient_doc = await patient_collection.find_one({"_id": ObjectId(patient_id)})

    # If not found in patient_collection, trydoctor_collection (mobile app users)
    if not patient_doc:
        #  import doctor_collection here to avoid circular imports
        from core.database  import doctor_collection
        user_doc = await doctor_collection.find_one({"_id": ObjectId(patient_id)})

        if user_doc:
            # User exists indoctor_collection, create a new patient record
            print(f"Creating new patient record from user {patient_id}")

            # Extract user details
            first_name = user_doc.get('firstName', user_doc.get('first_name', ''))
            last_name = user_doc.get('lastName', user_doc.get('last_name', ''))
            full_name = user_doc.get('full_name', '')
            email = user_doc.get('email', '')
            phone = user_doc.get('phone', user_doc.get('phone_number', ''))
            gender = user_doc.get('gender', '')

            # Create a name if full_name is not available
            if not full_name and (first_name or last_name):
                full_name = f"{first_name} {last_name}".strip()

            # Create new patient record
            new_patient = {
                "_id": ObjectId(patient_id),  # Use the same ID as the user
                "firstName": first_name,
                "lastName": last_name,
                "name": full_name,
                "email": email,
                "phone": phone,
                "gender": gender,
                "user_id": doctor_id,  # Link to the current doctor
                "created_at": datetime.now().isoformat(),
                "created_from_mobile_user": True
            }

            print(f"Creating new patient record: {new_patient}")

            # Insert the new patient record
            try:
                # Check if a patient with this ID already exists (should not happen, but just in case)
                existing_patient = await patient_collection.find_one({"_id": ObjectId(patient_id)})
                if existing_patient:
                    # If patient already exists, update it instead of inserting
                    print(f"Patient already exists, updating instead: {patient_id}")
                    update_result = await patient_collection.update_one(
                        {"_id": ObjectId(patient_id)},
                        {"$set": {
                            "firstName": first_name,
                            "lastName": last_name,
                            "name": full_name,
                            "email": email,
                            "phone": phone,
                            "gender": gender,
                            "user_id": doctor_id,
                            "created_from_mobile_user": True
                        }}
                    )
                    if update_result.modified_count > 0:
                        return {"message": "Patient successfully updated and added to your list."}
                    else:
                        return {"message": "Patient record found but no changes were needed."}
                else:
                    # Insert new patient record
                    await patient_collection.insert_one(new_patient)
                    return {"message": "Patient successfully added to your list."}
            except Exception as e:
                print(f"Error creating patient record: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to create patient record: {str(e)}")
        else:
            # Neither patient nor user found
            raise HTTPException(status_code=404, detail="Patient not found in any collection")

    # If patient already exists in patient_collection
    # Check if patient is already linked to a doctor
    if patient_doc.get("user_id"):
        if patient_doc.get("user_id") == doctor_id:
             return {"message": "Patient already linked to you."}
        else:
             # Should we allow re-linking? Maybe not for now.
             raise HTTPException(status_code=409, detail="Patient is already linked to another doctor.")

    # If we get here, the patient exists but is not linked to any doctor
    # Update the patient document: set user_id to link to the current doctor
    update_result = await patient_collection.update_one(
        {"_id": ObjectId(patient_id)},
        {"$set": {"user_id": doctor_id}}
    )

    if update_result.modified_count == 0:
        # This might happen if the document was found but not updated (e.g., already had the user_id)
        # Check find_one result again to confirm
        existing_link = await patient_collection.find_one({"_id": ObjectId(patient_id), "user_id": doctor_id})
        if existing_link:
            return {"message": "Patient was already in your list."}
        else:
            raise HTTPException(status_code=500, detail="Failed to link patient to doctor")

    return {"message": "Patient successfully added to your list."}
