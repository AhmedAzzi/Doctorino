from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from typing import Annotated, Dict, Optional, Any, List
from pydantic import BaseModel, EmailStr
import json

# Import shared schemas
from schemas.schemas import Token, UserCreate, UserResponse, PatientMobileResponse

# Import project modules
from core import security
from core.database import doctor_collection, patient_collection
from core.config import settings

# Local schemas specific to this router
class TokenData(BaseModel):
    username: Optional[str] = None

class WorkLocation(BaseModel): # This schema remains as it's used by DoctorCreate
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: str

class DoctorCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    gender: str
    specialty: str
    phone_number: str
    subscription_duration: str
    reason_for_joining: str
    work_location: WorkLocation

class PatientRegister(BaseModel):
    username: str
    password: str
    firstName: str
    lastName: str
    email: Optional[EmailStr] = None
    phone: str
    gender: str
    date_of_birth: Optional[str] = None


router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# Use the security functions
get_current_user = security.get_current_user
get_current_doctor = security.get_current_doctor
get_current_patient = security.get_current_patient


@router.post("/token", response_model=Token) # Returns imported Token
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    # First, try to find the user in the doctor collection
    user = await doctor_collection.find_one({"username": form_data.username})
    user_type = "doctor"

    # If not found in doctor collection, try patient collection
    if not user:
        user = await patient_collection.find_one({"username": form_data.username})
        user_type = "patient" if user else "doctor"  # Set user_type to patient if found

    if not user or not security.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = security.create_access_token(
        data={"sub": user["username"]},
        expires_delta=access_token_expires,
        user_type=user_type
    )

    # Return token with username
    return Token(access_token=access_token, token_type="bearer", username=user["username"])

@router.post("/patient/token", response_model=Token)
@router.post("/login", response_model=Token)  # Alias for mobile app compatibility
async def patient_login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """
    Endpoint specifically for patient login from the mobile app.
    The /login endpoint is an alias for compatibility with the mobile app.
    """
    user = await patient_collection.find_one({"username": form_data.username})

    if not user or not security.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = security.create_access_token(
        data={"sub": user["username"]},
        expires_delta=access_token_expires,
        user_type="patient"
    )

    # Return token with username
    return Token(access_token=access_token, token_type="bearer", username=user["username"])


@router.get("/doctors/me", response_model=UserResponse) # Same endpoint without trailing slash
async def read_users_me(current_user: Dict[str, Any] = Depends(get_current_doctor)):
    # Convert MongoDB document to UserResponse
    # Handle the case where _id might be an ObjectId or might not exist
    user_id = str(current_user.get("_id", "")) if "_id" in current_user else current_user.get("username", "")

    # Extract work_location if it exists
    work_location = None
    if "work_location" in current_user and current_user["work_location"]:
        work_location = {
            "latitude": current_user["work_location"].get("latitude"),
            "longitude": current_user["work_location"].get("longitude"),
            "address": current_user["work_location"].get("address", "")
        }

    return UserResponse(
        id=user_id,
        username=current_user["username"],
        email=current_user.get("email", ""),
        full_name=current_user.get("full_name", ""),
        phone=current_user.get("phone", ""),
        specialization=current_user.get("specialty", ""),  # Note: using 'specialty' from DB as 'specialization'
        address=current_user.get("address", ""),
        bio=current_user.get("bio", ""),
        avatar=current_user.get("avatar", ""),
        work_location=work_location
    )

# Schema for updating user profile - Add firstName and lastName
class UserProfileUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    firstName: Optional[str] = None # Added
    lastName: Optional[str] = None  # Added
    phone: Optional[str] = None
    specialization: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    work_location: Optional[WorkLocation] = None

@router.put("/doctors/me", response_model=UserResponse)
async def update_user_profile(
    profile_update: UserProfileUpdate,
    current_user: Dict[str, Any] = Depends(get_current_doctor)
):
    # Get the user ID
    user_id = current_user.get("_id")
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")

    # Create update dictionary with only provided fields, handling potential None values
    update_data = {}
    for k, v in profile_update.dict().items():
        if v is not None:
            # Map specialization to specialty in the database if needed
            if k == "specialization":
                update_data["specialty"] = v
            # Handle work_location separately
            elif k == "work_location" and v:
                # Convert Pydantic model to dict
                work_location_dict = v.dict(exclude_none=True)
                if work_location_dict:  # Only update if there's data
                    update_data["work_location"] = work_location_dict
            else:
                update_data[k] = v

    # If firstName and lastName are provided but full_name isn't, construct full_name
    if "firstName" in update_data or "lastName" in update_data:
        if "full_name" not in update_data:
            # Get existing names if available to avoid overwriting one with empty string
            existing_first = update_data.get("firstName", current_user.get("firstName", ""))
            existing_last = update_data.get("lastName", current_user.get("lastName", ""))
            update_data["full_name"] = f"{existing_first} {existing_last}".strip()

    if not update_data:
        # No fields to update, return current profile
        return await read_users_me(current_user)

    # Update the user in the database
    result = await doctor_collection.update_one(
        {"_id": user_id},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Profile update failed")

    # Get the updated user
    updated_user = await doctor_collection.find_one({"_id": user_id})
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found after update")

    # Extract work_location if it exists
    work_location = None
    if "work_location" in updated_user and updated_user["work_location"]:
        work_location = {
            "latitude": updated_user["work_location"].get("latitude"),
            "longitude": updated_user["work_location"].get("longitude"),
            "address": updated_user["work_location"].get("address", "")
        }

    # Return the updated user profile
    return UserResponse(
        id=str(updated_user["_id"]),
        username=updated_user["username"],
        email=updated_user.get("email", ""),
        full_name=updated_user.get("full_name", ""),
        phone=updated_user.get("phone", ""),
        specialization=updated_user.get("specialty", ""),
        address=updated_user.get("address", ""),
        bio=updated_user.get("bio", ""),
        avatar=updated_user.get("avatar", ""),
        work_location=work_location
    )


@router.post("/register-doctor", response_model=Token, status_code=status.HTTP_201_CREATED) # Returns imported Token
async def register_doctor(doctor: DoctorCreate): # Uses local DoctorCreate
    """
    Register a new doctor with additional professional information.
    Returns a JWT token for immediate login after successful registration.
    """
    # Check if email is already registered
    existing_email = await doctor_collection.find_one({"email": doctor.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Generate a username from first name and last name
    base_username = f"{doctor.first_name.lower()}.{doctor.last_name.lower()}"
    username = base_username

    # Check if username exists, if so, add a number
    count = 1
    while await doctor_collection.find_one({"username": username}):
        username = f"{base_username}{count}"
        count += 1

    # Hash the password
    hashed_password = security.get_password_hash(doctor.password)

    # Create new doctor user
    new_doctor = {
        "username": username,
        "email": doctor.email,
        "full_name": f"{doctor.first_name} {doctor.last_name}",
        "first_name": doctor.first_name,
        "last_name": doctor.last_name,
        "hashed_password": hashed_password,
        "is_active": True,
        "is_doctor": True,
        "gender": doctor.gender,
        "specialty": doctor.specialty,
        "phone_number": doctor.phone_number,
        "subscription_duration": doctor.subscription_duration,
        "reason_for_joining": doctor.reason_for_joining,
        "work_location": {
            "latitude": doctor.work_location.latitude,
            "longitude": doctor.work_location.longitude,
            "address": doctor.work_location.address
        },
        "created_at": datetime.utcnow()
    }

    # Insert into database
    result = await doctor_collection.insert_one(new_doctor)

    # Generate access token for the new doctor
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = security.create_access_token(
        data={"sub": username},
        expires_delta=access_token_expires
    )

    # Return token directly so doctor can be logged in immediately after registration
    return Token(access_token=access_token, token_type="bearer", username=username)
    # return {"access_token": access_token, "token_type": "bearer", "username": username} # Original return


@router.post("/logout")
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Logout endpoint that invalidates the current session.
    Works for both doctors and patients.

    In a JWT-based authentication system, we can't truly invalidate tokens on the server side
    without additional infrastructure like a token blacklist or Redis cache.

    This endpoint serves as a formal way for clients to indicate they're logging out,
    and could be extended in the future to handle token revocation if needed.
    """
    username = current_user.get("username", "Unknown")
    return {"status": "success", "message": f"User {username} logged out successfully"}

@router.post("/patient/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)  # Alias for mobile app compatibility
async def register_patient(patient: PatientRegister):
    """
    Register a new patient for the mobile app.
    Returns a JWT token for immediate login after successful registration.
    The /register endpoint is an alias for compatibility with the mobile app.
    """
    # Check if username is already taken
    existing_username = await patient_collection.find_one({"username": patient.username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Check if email is already registered (if provided)
    if patient.email:
        existing_email = await patient_collection.find_one({"email": patient.email})
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

    # Hash the password
    hashed_password = security.get_password_hash(patient.password)

    # Create new patient user
    new_patient = {
        "username": patient.username,
        "hashed_password": hashed_password,
        "firstName": patient.firstName,
        "lastName": patient.lastName,
        "email": patient.email or "",
        "phone": patient.phone,
        "gender": patient.gender,
        "date_of_birth": patient.date_of_birth,
        "is_active": True,
        "is_patient": True,
        "created_at": datetime.utcnow().isoformat(),
        "created_from_mobile": True
    }

    # Insert into database
    result = await patient_collection.insert_one(new_patient)

    # Generate access token for the new patient
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = security.create_access_token(
        data={"sub": patient.username},
        expires_delta=access_token_expires,
        user_type="patient"
    )

    # Return token directly so patient can be logged in immediately after registration
    return Token(access_token=access_token, token_type="bearer", username=patient.username)


@router.get("/patient/me", response_model=PatientMobileResponse)
@router.get("/me", response_model=PatientMobileResponse)  # Alias for mobile app compatibility
@router.get("/users/me", response_model=PatientMobileResponse)  # Additional alias for mobile app compatibility
@router.get("/users/me/", response_model=PatientMobileResponse)  # Additional alias with trailing slash
async def read_patient_profile(current_user: Dict[str, Any] = Depends(security.get_current_patient)):
    """
    Get the current patient's profile information.
    This endpoint is specifically for the mobile app.
    The /me and /users/me endpoints are aliases for compatibility with the mobile app.
    """
    # Convert MongoDB document to PatientMobileResponse
    user_id = str(current_user.get("_id", "")) if "_id" in current_user else ""

    return PatientMobileResponse(
        id=user_id,
        username=current_user["username"],
        firstName=current_user.get("firstName", ""),
        lastName=current_user.get("lastName", ""),
        email=current_user.get("email", ""),
        phone=current_user.get("phone", ""),
        gender=current_user.get("gender", ""),
        date_of_birth=current_user.get("date_of_birth", None)
    )

@router.get("/load-models")
async def load_models(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Load the appropriate AI models based on the user's role.
    This endpoint should be called after login to preload the models.
    """
    # Define model loaders with their respective import paths and model names
    model_loaders = {
        "mammography": {
            "import_path": "mammography.mammo_backend",
            "loader_function": "load_prediction_model",
            "display_name": "Mammography"
        },
        "ecg": {
            "import_path": "ecg.ecg_classification_api",
            "loader_function": "load_ecg_model",
            "display_name": "ECG"
        }
    }

    # User-specific model preferences
    user_models = {
        "Mammography": ["mammography"],
        "Cardiologist": ["ecg"]
    }

    # Get the user's specialty from the user object
    specialty = current_user.get("specialty", "")
    print(f"User specialty: {specialty}")

    models_to_load = user_models.get(specialty, list(model_loaders.keys()))
    print(f"Models to load: {models_to_load}")

    try:
        models_loaded = []

        for model_key in models_to_load:
            if model_key not in model_loaders:
                continue

            model_info = model_loaders[model_key]
            try:
                print(f"Attempting to load model: {model_key}")
                # Dynamically import the module and function
                print(f"Import path: {model_info['import_path']}, Function: {model_info['loader_function']}")
                module = __import__(model_info["import_path"], fromlist=[model_info["loader_function"]])
                loader_function = getattr(module, model_info["loader_function"])

                # Load the model
                print(f"Calling loader function for {model_key}")
                model = loader_function()
                if model is not None:
                    models_loaded.append(model_key)
                    print(f"Successfully loaded {model_key} model")
                else:
                    print(f"Model loader returned None for {model_key}")
            except Exception as e:
                print(f"Error loading {model_info['display_name']} model: {str(e)}")
                import traceback
                traceback.print_exc()

        # Return appropriate response based on loaded models
        if not models_loaded:
            return {
                "status": "warning",
                "message": "No models could be loaded",
                "specialty": specialty,
                "attempted_models": models_to_load
            }

        if len(models_loaded) == 1 and models_to_load == models_loaded:
            model_name = model_loaders[models_loaded[0]]["display_name"]
            return {
                "status": "success",
                "message": f"{model_name} model loaded successfully",
                "specialty": specialty,
                "loaded_models": models_loaded
            }

        return {
            "status": "success",
            "message": f"Models loaded successfully: {', '.join([model_loaders[m]['display_name'] for m in models_loaded])}",
            "specialty": specialty,
            "loaded_models": models_loaded,
            "attempted_models": models_to_load
        }
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error in load_models: {str(e)}")
        print(error_traceback)
        return {
            "status": "error",
            "message": f"Error loading models: {str(e)}",
            "specialty": specialty,
            "error_details": str(e)
        }

