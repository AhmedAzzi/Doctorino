from fastapi import APIRouter, HTTPException, status, File, UploadFile, Form, Depends
from fastapi.responses import FileResponse, StreamingResponse
from typing import Dict, Any, List, Optional
from datetime import datetime
import os
import shutil
import uuid
import mimetypes
import io
from bson import ObjectId

# Import core modules
from core.config import settings
from core.database import medical_reports_collection, patient_collection, doctor_collection, fs
from core.security import get_current_user
from schemas.schemas import TextReportCreate, ReportResponse
from utils.gridfs_utils import upload_file_to_gridfs, get_file_from_gridfs, read_file_from_gridfs, delete_file_from_gridfs

router = APIRouter(prefix="/api/medical-reports", tags=["Medical Reports"])

# Define file types
FILE_TYPES = {
    "medical_image": ["image/jpeg", "image/png", "image/gif"],
    "scan": ["image/jpeg", "image/png", "image/dicom", "application/dicom"],
    "lab_result": ["application/pdf", "image/jpeg", "image/png", "text/plain"],
    "prescription": ["application/pdf", "image/jpeg", "image/png", "text/plain"],
    "report": ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    "other": ["*/*"]
}

def guess_file_type(filename: str, content_type: str) -> str:
    """
    Guess the file type based on filename and content type.

    Args:
        filename: The name of the file
        content_type: The MIME type of the file

    Returns:
        The guessed file type
    """
    filename = filename.lower()

    # Check by content type first
    for file_type, mime_types in FILE_TYPES.items():
        if content_type in mime_types or "*/*" in mime_types:
            return file_type

    # Then check by filename patterns
    if any(ext in filename for ext in ['.jpg', '.jpeg', '.png', '.gif']):
        if any(term in filename for term in ['xray', 'x-ray', 'mri', 'ct', 'scan', 'ultrasound']):
            return "scan"
        return "medical_image"

    if any(ext in filename for ext in ['.dcm', '.dicom']):
        return "scan"

    if any(term in filename for term in ['lab', 'test', 'result']):
        return "lab_result"

    if any(term in filename for term in ['prescription', 'medication']):
        return "prescription"

    if any(ext in filename for ext in ['.pdf', '.doc', '.docx', '.txt']):
        if any(term in filename for term in ['report', 'assessment', 'summary', 'analysis']):
            return "report"

    # Default to other if we can't determine
    return "other"

async def get_patient_name(patient_id: str) -> str:
    """
    Get patient name from patient ID.

    Args:
        patient_id: The ID of the patient

    Returns:
        The patient's full name or "Unknown Patient" if not found
    """
    try:
        # Try to find in patient collection first
        patient = await patient_collection.find_one({"_id": ObjectId(patient_id)})
        if patient:
            return f"{patient.get('firstName', '')} {patient.get('lastName', '')}"

        # If not found, try user collection (for mobile users)
        user = await doctor_collection.find_one({"_id": ObjectId(patient_id)})
        if user:
            return f"{user.get('first_name', '')} {user.get('last_name', '')}"

        return "Unknown Patient"
    except Exception:
        return "Unknown Patient"

async def get_doctor_name(user_id: str) -> str:
    """
    Get doctor name from user ID.

    Args:
        user_id: The ID of the doctor user

    Returns:
        The doctor's full name with "Dr." prefix or "Doctor" if not found
    """
    try:
        user = await doctor_collection.find_one({"_id": ObjectId(user_id)})
        if user and user.get('first_name') and user.get('last_name'):
            return f"Dr. {user['first_name'].capitalize()} {user['last_name'].capitalize()}"

        return "Doctor"
    except Exception:
        return "Doctor"

def find_file_path(report: Dict[str, Any]) -> Optional[str]:
    """Find the actual file path for a report.

    Args:
        report: The report document from the database

    Returns:
        The file path if found, None otherwise
    """
    if "file_path" not in report:
        return None

    file_path = report["file_path"]
    filename = os.path.basename(file_path)

    # If the file exists at the given path, return it
    if os.path.exists(file_path):
        return file_path

    # Get the base directory of the application
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Try to find it using the relative_path
    if "relative_path" in report:
        # Try with the base directory
        possible_path = os.path.join(base_dir, report["relative_path"])
        if os.path.exists(possible_path):
            return possible_path

    # Try to find the file in the uploads directory by filename
    uploads_dir = os.path.join(base_dir, "uploads", "medical_reports")
    if os.path.exists(uploads_dir):
        possible_path = os.path.join(uploads_dir, filename)
        if os.path.exists(possible_path):
            return possible_path

    return None

@router.get("")
async def get_all_medical_reports(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get only the medical reports created by the current doctor.

    Args:
        current_user: The authenticated user

    Returns:
        List of medical reports
    """
    try:
        user_id = str(current_user.get("_id"))
        current_doctor = await get_doctor_name(user_id)

        reports = []
        async for report in medical_reports_collection.find({"doctor": current_doctor}):
            report["id"] = str(report.pop("_id"))

            # Add patient name if missing
            if "patient_name" not in report and "patient_id" in report:
                report["patient_name"] = await get_patient_name(report["patient_id"])

            reports.append(report)

        return reports
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch reports: {str(e)}"
        )

@router.get("/patient/{patient_id}")
async def get_patient_medical_reports(
    patient_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all medical reports for a specific patient created by the current doctor.

    Args:
        patient_id: The ID of the patient
        current_user: The authenticated user

    Returns:
        List of medical reports for the patient
    """
    try:
        # Get current doctor name
        user_id = str(current_user.get("_id"))
        current_doctor = await get_doctor_name(user_id)

        # Find reports for this patient created by the current doctor
        reports = []
        async for report in medical_reports_collection.find({
            "patient_id": patient_id,
            "doctor": current_doctor  # Only fetch reports created by this doctor
        }):
            # Convert ObjectId to string
            report["id"] = str(report.pop("_id"))

            # Add patient name if not present
            if "patient_name" not in report:
                report["patient_name"] = await get_patient_name(patient_id)

            reports.append(report)

        return reports
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching patient medical reports: {str(e)}"
        )

@router.post("/upload")
async def upload_medical_report(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    description: str = Form(...),
    file_type: Optional[str] = Form(None),
    creator_type: Optional[str] = Form("doctor"),
    doctor: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Upload a medical report file.

    Args:
        file: The file to upload
        patient_id: The ID of the patient this report belongs to
        description: Description of the report
        file_type: Type of the file (optional)
        creator_type: Type of the creator (default: "doctor")
        doctor: Name of the doctor (optional)
        current_user: The authenticated user

    Returns:
        The uploaded file metadata
    """
    try:
        # Get user ID
        user_id = str(current_user.get("_id"))

        # Determine file type if not provided
        determined_file_type = file_type
        if not determined_file_type:
            content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
            determined_file_type = guess_file_type(file.filename, content_type)

        # Get doctor name if not provided
        doctor_name = doctor
        if not doctor_name:
            doctor_name = await get_doctor_name(user_id)

        # Get patient name
        patient_name = await get_patient_name(patient_id)

        # Prepare metadata for GridFS
        metadata = {
            "file_type": determined_file_type,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "description": description,
            "creator_type": creator_type,
            "user_id": user_id,
            "doctor": doctor_name,
            "content_type": file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
        }

        # Upload file to GridFS
        gridfs_file = await upload_file_to_gridfs(file, metadata)

        # Save file metadata to database
        file_data = {
            "filename": file.filename,
            "file_type": determined_file_type,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "description": description,
            "gridfs_id": gridfs_file["id"],
            "uploaded_at": datetime.utcnow().isoformat(),
            "creator_type": creator_type,
            "user_id": user_id,
            "doctor": doctor_name,
            "storage_type": "gridfs"  # Indicate this is stored in GridFS
        }

        result = await medical_reports_collection.insert_one(file_data)
        file_id = str(result.inserted_id)

        return {
            "id": file_id,
            "success": True,
            "filename": file.filename,
            "file_type": determined_file_type,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "description": description,
            "gridfs_id": gridfs_file["id"],
            "uploaded_at": datetime.utcnow().isoformat(),
            "creator_type": creator_type,
            "doctor": doctor_name,
            "url": f"/api/medical-reports/download/{file_id}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )

@router.post("/text", response_model=ReportResponse)
async def create_text_report(
    report: TextReportCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a text-based medical report.

    Args:
        report: The text report data
        current_user: The authenticated user

    Returns:
        The created report data
    """
    try:
        # Get user ID
        user_id = str(current_user.get("_id"))

        # Get doctor name
        doctor_name = await get_doctor_name(user_id)

        # Get patient name
        patient_name = await get_patient_name(report.patient_id)

        # Create report data
        report_data = {
            "patient_id": report.patient_id,
            "patient_name": patient_name,
            "title": report.title,
            "findings": report.findings,
            "recommendations": report.recommendations,
            "date": report.date,
            "uploaded_at": datetime.utcnow().isoformat(),
            "file_type": "report",
            "creator_type": "doctor",
            "user_id": user_id,
            "doctor": doctor_name,
            "filename": f"{report.title.replace(' ', '_')}.txt"
        }

        result = await medical_reports_collection.insert_one(report_data)
        report_id = str(result.inserted_id)

        # Add ID to response
        report_data["id"] = report_id

        return report_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating text report: {str(e)}"
        )

@router.get("/download/{report_id}")
async def download_report(report_id: str):
    """
    Download a medical report file by its ID.

    Args:
        report_id: The ID of the report to download

    Returns:
        FileResponse or StreamingResponse with the report file
    """
    try:
        # Find the report in the database
        report = await medical_reports_collection.find_one({"_id": ObjectId(report_id)})
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )

        # Check if this is a GridFS file
        if "storage_type" in report and report["storage_type"] == "gridfs" and "gridfs_id" in report:
            # Get file from GridFS
            gridfs_id = report["gridfs_id"]
            file_content = await read_file_from_gridfs(gridfs_id)

            if not file_content:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="File not found in GridFS"
                )

            # Get the media type
            filename = report.get("filename", f"report_{report_id}")
            media_type = report.get("content_type") or mimetypes.guess_type(filename)[0] or "application/octet-stream"

            # Return the file as a streaming response
            return StreamingResponse(
                io.BytesIO(file_content),
                media_type=media_type,
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        else:
            # Legacy file handling for files stored on disk
            # Find the actual file path
            file_path = find_file_path(report)
            if not file_path:
                # Try to create the directory structure if it doesn't exist
                if "relative_path" in report:
                    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    target_dir = os.path.dirname(os.path.join(base_dir, report["relative_path"]))
                    os.makedirs(target_dir, exist_ok=True)

                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="File not found on server"
                )

            # Check if file exists and is readable
            if not os.path.isfile(file_path):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Path exists but is not a file"
                )

            if not os.access(file_path, os.R_OK):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="File exists but is not readable"
                )

            # Get the media type
            media_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"

            # Return the file
            return FileResponse(
                path=file_path,
                filename=report.get("filename", os.path.basename(file_path)),
                media_type=media_type
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading report: {str(e)}"
        )

@router.delete("/{report_id}")
async def delete_medical_report(
    report_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a medical report if it was created by the current doctor.

    Args:
        report_id: The ID of the report to delete
        current_user: The authenticated user

    Returns:
        Success message
    """
    try:
        # Get current doctor name
        user_id = str(current_user.get("_id"))
        current_doctor = await get_doctor_name(user_id)

        # Find the report
        report = await medical_reports_collection.find_one({"_id": ObjectId(report_id)})
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medical report not found"
            )

        # Check if the report belongs to the current doctor
        if "doctor" in report and report["doctor"] != current_doctor:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this report"
            )

        # Check if this is a GridFS file
        if "storage_type" in report and report["storage_type"] == "gridfs" and "gridfs_id" in report:
            # Delete file from GridFS
            await delete_file_from_gridfs(report["gridfs_id"])
        # Legacy file handling for files stored on disk
        elif "file_path" in report:
            file_path = find_file_path(report)
            if file_path and os.path.exists(file_path):
                os.remove(file_path)

        # Delete the report from the database
        await medical_reports_collection.delete_one({"_id": ObjectId(report_id)})

        return {"success": True, "message": "Medical report deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting medical report: {str(e)}"
        )

# Note: This route should be placed after all other specific routes to avoid conflicts
@router.get("/{report_id}", include_in_schema=True)
async def get_medical_report(report_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get a specific medical report by ID.

    Args:
        report_id: The ID of the report to retrieve
        current_user: The authenticated user

    Returns:
        The medical report
    """
    try:
        # Get current doctor name
        user_id = str(current_user.get("_id"))
        current_doctor = await get_doctor_name(user_id)

        # Find the report
        try:
            report = await medical_reports_collection.find_one({"_id": ObjectId(report_id)})
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid report ID format"
            )

        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )

        # Convert ObjectId to string
        report["id"] = str(report.pop("_id"))

        # Add patient name if missing
        if "patient_name" not in report and "patient_id" in report:
            report["patient_name"] = await get_patient_name(report["patient_id"])

        # Add doctor name if missing
        if "doctor" not in report and "user_id" in report:
            report["doctor"] = await get_doctor_name(report["user_id"])
        elif "doctor" not in report:
            report["doctor"] = current_doctor

        # Add a public URL for the file if a relative_path exists
        if "relative_path" in report and report["relative_path"]:
            # Construct the URL using the static files route
            # Ensure the path is relative to the uploads folder
            relative_to_uploads = report['relative_path'].split(settings.upload_folder + '/')[-1]
            report["url"] = f"/{settings.upload_folder}/{relative_to_uploads}"
        elif "file_path" in report and report["file_path"]:
             # Fallback: if relative_path is missing but file_path exists, try to construct URL
             # This might not be reliable if file_path is not within the uploads dir structure
             base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
             try:
                 relative_to_base = os.path.relpath(report["file_path"], base_dir)
                 if relative_to_base.startswith(settings.upload_folder):
                      report["url"] = f"/{relative_to_base}"
                 else:
                      # If not under uploads, use the download endpoint
                      report["url"] = f"/api/medical-reports/download/{report['id']}"
             except ValueError:
                 # If relpath fails (e.g., different drives), use download endpoint
                 report["url"] = f"/api/medical-reports/download/{report['id']}"
        else:
             # If no file path info, use the download endpoint as a fallback
             report["url"] = f"/api/medical-reports/download/{report['id']}"

        return report
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching medical report: {str(e)}"
        )
