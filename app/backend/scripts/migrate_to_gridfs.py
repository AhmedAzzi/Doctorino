#!/usr/bin/env python3
"""
Migration script to move files from local storage to GridFS.
This script will:
1. Find all medical reports with local file paths
2. Upload the files to GridFS
3. Update the database records with GridFS IDs
4. Optionally delete the local files after successful migration
"""

import os
import sys
import asyncio
import argparse
from datetime import datetime
from bson import ObjectId
import mimetypes
import motor.motor_asyncio

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import settings first
from core.config import settings

# Create a new client and database connection for this script
client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_url)
database = client[settings.mongodb_db_name]
medical_reports_collection = database.get_collection("medical_reports")
fs = motor.motor_asyncio.AsyncIOMotorGridFSBucket(database, bucket_name="uploads")

# Define utility functions
def find_file_path(report: dict) -> str:
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

async def migrate_files_to_gridfs(delete_local=False):
    """
    Migrate files from local storage to GridFS.

    Args:
        delete_local: Whether to delete local files after successful migration
    """
    print("Starting migration of files to GridFS...")

    # Find all medical reports with file_path but without gridfs_id
    reports = []
    async for report in medical_reports_collection.find(
        {"file_path": {"$exists": True}, "gridfs_id": {"$exists": False}}
    ):
        reports.append(report)

    print(f"Found {len(reports)} reports to migrate")

    migrated_count = 0
    failed_count = 0

    for report in reports:
        report_id = report["_id"]
        filename = report.get("filename", "unknown")

        print(f"Processing report: {filename} (ID: {report_id})")

        # Find the actual file path
        file_path = find_file_path(report)
        if not file_path:
            print(f"  Error: File not found for report {filename}")
            failed_count += 1
            continue

        if not os.path.exists(file_path):
            print(f"  Error: File does not exist at path: {file_path}")
            failed_count += 1
            continue

        try:
            # Determine content type
            content_type = report.get("content_type") or mimetypes.guess_type(file_path)[0] or "application/octet-stream"

            # Prepare metadata for GridFS
            metadata = {
                "original_filename": filename,
                "content_type": content_type,
                "file_type": report.get("file_type", "unknown"),
                "patient_id": report.get("patient_id", ""),
                "patient_name": report.get("patient_name", ""),
                "description": report.get("description", ""),
                "creator_type": report.get("creator_type", "doctor"),
                "user_id": report.get("user_id", ""),
                "doctor": report.get("doctor", ""),
                "original_upload_date": report.get("uploaded_at", datetime.utcnow().isoformat())
            }

            # Read file content
            with open(file_path, "rb") as f:
                file_content = f.read()

            # Generate a unique filename for GridFS
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = f"{timestamp}_{ObjectId()}"
            gridfs_filename = f"{unique_id}_{filename}"

            # Upload to GridFS using AsyncIOMotorGridFSBucket
            grid_in = fs.open_upload_stream(
                filename=gridfs_filename,
                metadata=metadata
            )
            await grid_in.write(file_content)
            await grid_in.close()

            file_id = grid_in._id

            # Update the database record
            update_data = {
                "gridfs_id": str(file_id),
                "storage_type": "gridfs",
                "migrated_at": datetime.utcnow().isoformat()
            }

            result = await medical_reports_collection.update_one(
                {"_id": report_id},
                {"$set": update_data}
            )

            if result.modified_count > 0:
                print(f"  Successfully migrated file to GridFS with ID: {file_id}")
                migrated_count += 1

                # Delete local file if requested
                if delete_local:
                    try:
                        os.remove(file_path)
                        print(f"  Deleted local file: {file_path}")
                    except Exception as e:
                        print(f"  Warning: Could not delete local file: {str(e)}")
            else:
                print(f"  Error: Failed to update database record")
                failed_count += 1

        except Exception as e:
            print(f"  Error migrating file: {str(e)}")
            import traceback
            traceback.print_exc()
            failed_count += 1

    print(f"\nMigration complete. Migrated {migrated_count} files, failed {failed_count} files.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate files from local storage to GridFS")
    parser.add_argument("--delete-local", action="store_true", help="Delete local files after successful migration")
    args = parser.parse_args()

    asyncio.run(migrate_files_to_gridfs(args.delete_local))
