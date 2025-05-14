import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
import bcrypt
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from .database import doctor_collection, patient_collection

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def verify_password(plain_password, hashed_password):
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        # Fallback to direct bcrypt verification if passlib fails
        if isinstance(plain_password, str):
            plain_password = plain_password.encode('utf-8')
        return bcrypt.checkpw(plain_password, hashed_password.encode('utf-8'))

def get_password_hash(password):
    try:
        return pwd_context.hash(password)
    except Exception as e:
        # Fallback to direct bcrypt hashing if passlib fails
        if isinstance(password, str):
            password = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password, salt)
        return hashed.decode('utf-8')

# JWT Token Management
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None, user_type: str = "doctor"):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        from .config import settings
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "user_type": user_type})
    from .config import settings
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        from .config import settings
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except Exception:
        return None

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception

    # Check if there's a user_type in the token payload
    user_type = payload.get("user_type", "doctor")  # Default to doctor for backward compatibility

    if user_type == "patient":
        # Look for the user in the patient collection
        user = await patient_collection.find_one({"username": username})
    else:
        # Look for the user in the doctor collection (default)
        user = await doctor_collection.find_one({"username": username})

    if user is None:
        raise credentials_exception

    # Add the user_type to the user object for role-based access control
    user["user_type"] = user_type

    return user

async def get_current_doctor(token: str = Depends(oauth2_scheme)):
    """
    Dependency to ensure the current user is a doctor.
    """
    user = await get_current_user(token)

    # Check if the user is a doctor
    if user.get("user_type") != "doctor" and not user.get("is_doctor", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Doctor privileges required.",
        )

    return user

async def get_current_patient(token: str = Depends(oauth2_scheme)):
    """
    Dependency to ensure the current user is a patient.
    """
    user = await get_current_user(token)

    # Check if the user is a patient
    if user.get("user_type") != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Patient privileges required.",
        )

    return user

# Example usage (for testing/demonstration purposes)
if __name__ == "__main__":
    # Password hashing
    password = "secure_password"
    hashed = get_password_hash(password)
    print(f"Hashed password: {hashed}")
    print(f"Password verified: {verify_password(password, hashed)}")  # Should be True
    print(f"Incorrect password verified: {verify_password('wrong_password', hashed)}")  # Should be False

    # JWT
    user_data = {"sub": "testuser"}
    access_token = create_access_token(user_data)
    print(f"Access token: {access_token}")

    decoded_token = decode_access_token(access_token)
    print(f"Decoded token: {decoded_token}")

    invalid_token = "invalid.token.string"
    invalid_decoded = decode_access_token(invalid_token)
    print(f"Decoded invalid token: {invalid_decoded}")  # Should be None