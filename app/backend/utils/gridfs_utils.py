"""
Utility functions for working with GridFS for file storage in MongoDB.
This module provides functions for uploading, retrieving, and managing files in GridFS.
"""

import os
import uuid
import io
from datetime import datetime
from typing import Optional, Dict, Any, BinaryIO, Union
from fastapi import UploadFile, HTTPException, status
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from core.database import fs, database
from core.config import settings

async def upload_file_to_gridfs(
    file: UploadFile,
    metadata: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Upload a file to GridFS.

    Args:
        file: The file to upload
        metadata: Additional metadata to store with the file

    Returns:
        Dictionary with file information including the GridFS ID
    """
    try:
        # Read file content
        contents = await file.read()

        # Generate a unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = f"{timestamp}_{uuid.uuid4().hex[:8]}"
        filename = f"{unique_id}_{file.filename}"

        # Prepare metadata
        file_metadata = {
            "original_filename": file.filename,
            "content_type": file.content_type,
            "uploaded_at": datetime.utcnow(),
            "file_size": len(contents),
        }

        # Add additional metadata if provided
        if metadata:
            file_metadata.update(metadata)

        # Upload to GridFS using AsyncIOMotorGridFSBucket
        grid_in = fs.open_upload_stream(
            filename=filename,
            metadata=file_metadata
        )
        await grid_in.write(contents)
        await grid_in.close()

        file_id = grid_in._id

        # Return file information
        return {
            "id": str(file_id),
            "filename": filename,
            "original_filename": file.filename,
            "content_type": file.content_type,
            "uploaded_at": datetime.utcnow().isoformat(),
            "file_size": len(contents),
            "metadata": file_metadata
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file to GridFS: {str(e)}"
        )

async def get_file_from_gridfs(file_id: str) -> Optional[Dict[str, Any]]:
    """
    Get file information from GridFS.

    Args:
        file_id: The GridFS file ID

    Returns:
        Dictionary with file information or None if not found
    """
    try:
        # Convert string ID to ObjectId
        obj_id = ObjectId(file_id)

        # Get file information using AsyncIOMotorGridFSBucket
        grid_out = await fs.find_one({"_id": obj_id})

        if not grid_out:
            return None

        # Get metadata
        metadata = grid_out.metadata or {}

        return {
            "id": str(grid_out._id),
            "filename": grid_out.filename,
            "original_filename": metadata.get("original_filename", ""),
            "content_type": metadata.get("content_type", ""),
            "uploaded_at": grid_out.upload_date.isoformat() if grid_out.upload_date else datetime.utcnow().isoformat(),
            "file_size": grid_out.length,
            "metadata": metadata
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving file from GridFS: {str(e)}"
        )

async def read_file_from_gridfs(file_id: str) -> Optional[bytes]:
    """
    Read file content from GridFS.

    Args:
        file_id: The GridFS file ID

    Returns:
        File content as bytes or None if not found
    """
    try:
        # Convert string ID to ObjectId
        obj_id = ObjectId(file_id)

        # Get file using AsyncIOMotorGridFSBucket
        grid_out = await fs.open_download_stream(obj_id)

        if not grid_out:
            return None

        # Read the entire file
        chunks = []
        while True:
            chunk = await grid_out.readchunk()
            if not chunk:
                break
            chunks.append(chunk)

        # Combine chunks
        return b"".join(chunks)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading file from GridFS: {str(e)}"
        )

async def delete_file_from_gridfs(file_id: str) -> bool:
    """
    Delete a file from GridFS.

    Args:
        file_id: The GridFS file ID

    Returns:
        True if deleted successfully, False otherwise
    """
    try:
        # Convert string ID to ObjectId
        obj_id = ObjectId(file_id)

        # Delete file using AsyncIOMotorGridFSBucket
        await fs.delete(obj_id)
        return True

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting file from GridFS: {str(e)}"
        )
