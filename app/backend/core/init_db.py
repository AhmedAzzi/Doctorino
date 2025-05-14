#!/usr/bin/env python3
"""
Database initialization script.
Creates default users if they don't exist.
"""

import asyncio
import sys
import os

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database  import doctor_collection
from core.security import get_password_hash
from core.config import settings
from datetime import datetime


async def init_db():
    """Initialize the database with default data if it doesn't exist."""
    print("Initializing database...")
    
    # Check if default user exists
    default_user = await doctor_collection.find_one({"username": settings.default_user.username})
    
    if not default_user:
        print(f"Creating default user: {settings.default_user.username}")
        
        # Create default user
        hashed_password = get_password_hash(settings.default_user.password)
        new_user = {
            "username": settings.default_user.username,
            "email": settings.default_user.email,
            "full_name": settings.default_user.full_name,
            "hashed_password": hashed_password,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        
        # Insert into database
        result = await doctor_collection.insert_one(new_user)
        print(f"Default user created with ID: {result.inserted_id}")
    else:
        print(f"Default user already exists: {settings.default_user.username}")
    
    # Count users
    user_count = await doctor_collection.count_documents({})
    print(f"Total users in database: {user_count}")
    
    print("Database initialization complete.")


if __name__ == "__main__":
    asyncio.run(init_db())