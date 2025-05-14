#!/usr/bin/env python3
"""
Standalone migration script to move files from local storage to GridFS.
This script is completely self-contained and doesn't rely on any existing modules.
"""

import os
import sys
import asyncio
import argparse
from datetime import datetime
import mimetypes
import motor.motor_asyncio
from bson import ObjectId

async def find_file_path(report, base_dir):
    """Find the actual file path for a report.

    Args:
        report: The report document from the database
        base_dir: The base directory of the application

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

async def migrate_files_to_gridfs(mongodb_url, db_name, delete_local=False):
    """
    Migrate files from local storage to GridFS.
    
    Args:
        mongodb_url: MongoDB connection URL
        db_name: Database name
        delete_local: Whether to delete local files after successful migration
    """
    print(f"Connecting to MongoDB at {mongodb_url}...")
    
    # Create a new client and database connection
    client = motor.motor_asyncio.AsyncIOMotorClient(mongodb_url)
    db = client[db_name]
    medical_reports_collection = db.get_collection("medical_reports")
    fs = motor.motor_asyncio.AsyncIOMotorGridFSBucket(db, bucket_name="uploads")
    
    print("Starting migration of files to GridFS...")
    
    # Get the base directory of the application
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Find all medical reports with file_path but without gridfs_id
    cursor = medical_reports_collection.find(
        {"file_path": {"$exists": True}, "gridfs_id": {"$exists": False}}
    )
    
    reports = []
    async for report in cursor:
        reports.append(report)
    
    print(f"Found {len(reports)} reports to migrate")
    
    migrated_count = 0
    failed_count = 0
    
    for report in reports:
        report_id = report["_id"]
        filename = report.get("filename", "unknown")
        
        print(f"Processing report: {filename} (ID: {report_id})")
        
        # Find the actual file path
        file_path = await find_file_path(report, base_dir)
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

async def main():
    parser = argparse.ArgumentParser(description="Migrate files from local storage to GridFS")
    parser.add_argument("--mongodb-url", default="mongodb+srv://ahmed:ahmed123@cluster0.lq3uj.mongodb.net/", help="MongoDB connection URL")
    parser.add_argument("--db-name", default="doctorino", help="Database name")
    parser.add_argument("--delete-local", action="store_true", help="Delete local files after successful migration")
    args = parser.parse_args()
    
    await migrate_files_to_gridfs(args.mongodb_url, args.db_name, args.delete_local)

if __name__ == "__main__":
    asyncio.run(main())
