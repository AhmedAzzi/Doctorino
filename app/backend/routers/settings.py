from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, Optional
from datetime import datetime
from bson import ObjectId

from core.database  import doctor_collection
from core.security import get_current_user
from schemas.settings_schemas import UserSettings, UserSettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("/", response_model=UserSettings)
async def get_user_settings(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get the current user's settings.
    If no settings exist yet, return default settings.
    """
    user_id = current_user.get("_id")
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user settings from database
    user = await doctor_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # If user has no settings yet, return default settings
    if "settings" not in user:
        return UserSettings()
    
    return user["settings"]

@router.put("/", response_model=UserSettings)
async def update_user_settings(
    settings_update: UserSettingsUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update the current user's settings.
    Only provided fields will be updated.
    """
    user_id = current_user.get("_id")
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get current settings
    user = await doctor_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get current settings or create default
    current_settings = user.get("settings", UserSettings().model_dump())
    
    # Update only provided fields
    update_data = settings_update.model_dump(exclude_unset=True, exclude_none=True)
    
    for category, values in update_data.items():
        if values is not None:
            if category not in current_settings:
                current_settings[category] = {}
            
            for key, value in values.items():
                current_settings[category][key] = value
    
    # Update user in database
    result = await doctor_collection.update_one(
        {"_id": user_id},
        {"$set": {"settings": current_settings, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Settings update failed")
    
    return current_settings

@router.post("/reset", response_model=UserSettings)
async def reset_user_settings(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Reset the current user's settings to default values.
    """
    user_id = current_user.get("_id")
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create default settings
    default_settings = UserSettings().model_dump()
    
    # Update user in database
    result = await doctor_collection.update_one(
        {"_id": user_id},
        {"$set": {"settings": default_settings, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Settings reset failed")
    
    return default_settings
