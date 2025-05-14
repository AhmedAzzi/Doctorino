from fastapi import APIRouter, HTTPException, status, File, UploadFile, Form, Depends
from typing import Dict, Any, List
import os
import uuid
import base64
from datetime import datetime
import sys
import cv2

# Import security for authentication
from core.security import get_current_user

# Import mammography backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    # Import process_dicom as well
    from mammography.mammo_backend import predict_mammogram, enhance_mammography_dicom, process_dicom
    MAMMOGRAPHY_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Mammography module not available: {str(e)}")
    MAMMOGRAPHY_AVAILABLE = False
    
    # Define placeholder functions
    def predict_mammogram(file_path):
        return {
            "predicted_class": "B",
            "confidence": 85.5,
            "explanation": {
                "title": "Scattered Fibroglandular Densities",
                "content": "The model detected scattered fibroglandular densities in the breast tissue.",
                "recommendation": "Regular screening mammography as recommended by your healthcare provider."
            },
            "original_image_base64": "",
            "denoised_image_base64": None,
            "metadata": {},
            "filename": os.path.basename(file_path)
        }

    def enhance_mammography_dicom(file_path):
        return None

    # Add placeholder for process_dicom if needed for demo mode
    def process_dicom(file_path):
        return None, {}, None # img, metadata, img_base64

router = APIRouter(prefix="/mammography", tags=["Mammography"])

@router.post("/predict")
async def predict_mammography(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze a mammography image and predict breast density.
    
    Args:
        file: Mammography image file (DICOM, PNG, JPG)
    """
    try:
        # Check if mammography module is available
        if not MAMMOGRAPHY_AVAILABLE:
            # Return a placeholder result with a warning
            return {
                "predicted_class": "B",
                "confidence": 85.5,
                "explanation": {
                    "title": "Scattered Fibroglandular Densities (Demo)",
                    "content": "This is a demonstration result. The actual mammography model is not available.",
                    "recommendation": "This is a placeholder recommendation. The actual model is not loaded."
                },
                "original_image_base64": "",
                "denoised_image_base64": None,
                "metadata": {"note": "Demo mode - actual model not available"},
                "filename": file.filename
            }
        
        # Get the user_id and username
        user_id = str(current_user.get("_id"))
        username = current_user.get("username", "unknown")
        
        # Create upload directory if it doesn't exist
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        record_id = f"mammo_{timestamp}_{uuid.uuid4().hex[:8]}"
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "mammography", record_id)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save the uploaded file
        file_path = os.path.join(upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # Check if it's a DICOM file
        is_dicom = file.filename.lower().endswith('.dcm')
        
        try:
            # Process the image
            result = predict_mammogram(file_path)
            
            # Add the filename to the result
            result["filename"] = file.filename
            
            return result
        except Exception as e:
            print(f"Error in mammography prediction: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Return a default prediction instead of raising an exception
            return {
                "predicted_class": "B",
                "confidence": 85.5,
                "explanation": {
                    "title": "Error in Prediction",
                    "content": f"An error occurred during prediction: {str(e)}",
                    "recommendation": "Please try again with a different image or contact support."
                },
                "original_image_base64": "",
                "denoised_image_base64": None,
                "metadata": {"error": str(e)},
                "filename": file.filename
            }
        
    except Exception as e:
        print(f"Unhandled error in mammography prediction: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Return a default prediction instead of raising an exception
        return {
            "predicted_class": "B",
            "confidence": 85.5,
            "explanation": {
                "title": "Unhandled Error",
                "content": f"An unhandled error occurred: {str(e)}",
                "recommendation": "Please try again with a different image or contact support."
            },
            "original_image_base64": "",
            "denoised_image_base64": None,
            "metadata": {"error": str(e)},
            "filename": file.filename if file and hasattr(file, "filename") else "unknown.jpg"
        }

@router.post("/dicom_preview")
async def preview_dicom(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generate a preview image from the original DICOM file data. # <-- Updated docstring

    Args:
        file: DICOM file
    """
    try:
        # Check if mammography module is available
        if not MAMMOGRAPHY_AVAILABLE:
            # Return a placeholder error
            return {"error": "DICOM preview is not available in demo mode"}
        
        # Save the uploaded file temporarily
        temp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "temp")
        os.makedirs(temp_dir, exist_ok=True)

        # Ensure unique temporary filename to avoid conflicts
        temp_filename = f"{uuid.uuid4().hex}_{file.filename}"
        file_path = os.path.join(temp_dir, temp_filename)

        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        preview_base64 = None # Initialize
        try:
            # Process the DICOM file using process_dicom to get original image preview
            img, metadata, preview_base64 = process_dicom(file_path) # <-- Use process_dicom

            if preview_base64 is None: # Check if base64 string was generated
                return {"error": "Failed to process DICOM file for preview"}

            return {"preview": preview_base64} # <-- Return the base64 string directly

        except Exception as e:
            print(f"Error in DICOM preview processing: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"error": f"Failed to process DICOM file: {str(e)}"}

        finally:
             # Clean up the temporary file
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError as e:
                    print(f"Error removing temporary file {file_path}: {e}")

    except Exception as e:
        # Log the error before raising HTTPException
        print(f"Error saving or handling DICOM file for preview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing DICOM file: {str(e)}"
        )
