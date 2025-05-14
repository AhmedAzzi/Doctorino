# backend/utils/helpers.py
import datetime
import os
import uuid
from fastapi import UploadFile
import shutil

def generate_unique_id():
    """Generates a unique identifier (e.g., for file names)."""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    # Add more randomness with uuid
    return f"{timestamp}_{uuid.uuid4().hex[:8]}"

async def save_uploaded_file(file: UploadFile, folder: str) -> str:
    """
    Save an uploaded file to the specified folder.
    
    Args:
        file: The uploaded file
        folder: The subfolder to save the file in (e.g., "reports", "ecg", etc.)
        
    Returns:
        The relative path to the saved file
    """
    # Create the upload directory if it doesn't exist
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", folder)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate a unique filename
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_filename = f"{generate_unique_id()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return the relative path (for database storage)
    return os.path.join("uploads", folder, unique_filename)

from bson import ObjectId

def object_id_to_str(document):
    document["_id"] = str(document["_id"])
    return document


def get_file_path(relative_path: str) -> str:
    """
    Convert a relative file path to an absolute path.
    
    Args:
        relative_path: The relative path stored in the database
        
    Returns:
        The absolute path to the file
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, relative_path)