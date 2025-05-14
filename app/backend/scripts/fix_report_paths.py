#!/usr/bin/env python3
"""
Script to fix file paths in medical reports.
This script updates the file_path and relative_path fields in the medical_reports collection
to point to the correct locations in the current project structure.
"""

import os
import sys
import asyncio
from bson import ObjectId
import shutil

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import core modules
from core.database import medical_reports_collection
from core.config import settings

async def fix_report_paths():
    """Fix file paths in medical reports."""
    print("Starting to fix report paths...")
    
    # Get the base directory of the application
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    project_root = os.path.dirname(base_dir)  # /home/ahmed/Music/Doctorino/app
    parent_root = os.path.dirname(project_root)  # /home/ahmed/Music/Doctorino
    
    # Create uploads directory if it doesn't exist
    uploads_dir = os.path.join(base_dir, "uploads", "medical_reports")
    os.makedirs(uploads_dir, exist_ok=True)
    print(f"Ensuring uploads directory exists: {uploads_dir}")
    
    # Get all reports
    reports = []
    async for report in medical_reports_collection.find({}):
        reports.append(report)
    
    print(f"Found {len(reports)} reports to process")
    
    fixed_count = 0
    for report in reports:
        report_id = report["_id"]
        filename = report.get("filename")
        old_file_path = report.get("file_path", "")
        old_relative_path = report.get("relative_path", "")
        
        print(f"\nProcessing report: {filename} (ID: {report_id})")
        print(f"  Old file_path: {old_file_path}")
        print(f"  Old relative_path: {old_relative_path}")
        
        # Skip if no file path
        if not old_file_path and not old_relative_path:
            print("  No file path or relative path found, skipping")
            continue
        
        # Extract the filename from the path
        if old_file_path:
            extracted_filename = os.path.basename(old_file_path)
        elif old_relative_path:
            extracted_filename = os.path.basename(old_relative_path)
        else:
            extracted_filename = filename
        
        if not extracted_filename:
            print("  Could not extract filename, skipping")
            continue
            
        # Create new paths
        new_relative_path = f"uploads/medical_reports/{extracted_filename}"
        new_file_path = os.path.join(base_dir, new_relative_path)
        
        print(f"  New file_path: {new_file_path}")
        print(f"  New relative_path: {new_relative_path}")
        
        # Check if the file exists at the old path
        file_exists = False
        file_copied = False
        
        # Try to find the file
        possible_old_paths = [
            old_file_path,
            os.path.join(base_dir, old_relative_path) if old_relative_path else None,
            os.path.join(project_root, old_relative_path) if old_relative_path else None,
            os.path.join(parent_root, old_relative_path) if old_relative_path else None
        ]
        
        # Filter out None values
        possible_old_paths = [p for p in possible_old_paths if p]
        
        # Try to find the file in any of the possible paths
        for path in possible_old_paths:
            if os.path.exists(path) and os.path.isfile(path):
                print(f"  Found file at: {path}")
                file_exists = True
                
                # Copy the file to the new location if it doesn't already exist
                if not os.path.exists(new_file_path):
                    try:
                        shutil.copy2(path, new_file_path)
                        print(f"  Copied file to: {new_file_path}")
                        file_copied = True
                    except Exception as e:
                        print(f"  Error copying file: {str(e)}")
                else:
                    print(f"  File already exists at destination: {new_file_path}")
                    file_copied = True
                
                break
        
        if not file_exists:
            print("  File not found at any possible location")
            
            # If the file is from the old project structure, try to adjust the path
            if "(4th copy)" in old_file_path:
                adjusted_path = old_file_path.replace("Doctorino (4th copy)/backend", "Doctorino/app/backend")
                if os.path.exists(adjusted_path) and os.path.isfile(adjusted_path):
                    print(f"  Found file at adjusted path: {adjusted_path}")
                    file_exists = True
                    
                    # Copy the file to the new location
                    if not os.path.exists(new_file_path):
                        try:
                            shutil.copy2(adjusted_path, new_file_path)
                            print(f"  Copied file to: {new_file_path}")
                            file_copied = True
                        except Exception as e:
                            print(f"  Error copying file: {str(e)}")
                    else:
                        print(f"  File already exists at destination: {new_file_path}")
                        file_copied = True
        
        # Update the database record
        if file_copied or os.path.exists(new_file_path):
            update_data = {
                "file_path": new_file_path,
                "relative_path": new_relative_path
            }
            
            try:
                result = await medical_reports_collection.update_one(
                    {"_id": report_id},
                    {"$set": update_data}
                )
                
                if result.modified_count > 0:
                    print(f"  Updated database record for report: {filename}")
                    fixed_count += 1
                else:
                    print(f"  No changes made to database record")
            except Exception as e:
                print(f"  Error updating database: {str(e)}")
        else:
            print(f"  Could not fix file path for report: {filename}")
    
    print(f"\nFixed {fixed_count} out of {len(reports)} reports")

if __name__ == "__main__":
    asyncio.run(fix_report_paths())