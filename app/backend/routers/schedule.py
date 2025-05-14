from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId

# Import database collections
from core.database import schedule_collection
from core.security import get_current_user

router = APIRouter(prefix="/schedule", tags=["Schedule"])

@router.get("/")
async def get_schedule(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get the doctor's schedule for the current user."""
    # Get the user ID
    user_id = str(current_user.get("_id"))

    # Get real data from the database filtered by user_id
    schedule_cursor = schedule_collection.find({"user_id": user_id})
    schedule = []

    async for day in schedule_cursor:
        # Convert MongoDB document to dict and include all fields
        day_dict = {
            "day": day.get("day"),
            "start_time": day.get("start_time"),
            "end_time": day.get("end_time"),
            "interval": day.get("interval")
        }
        schedule.append(day_dict)

    # If no schedule found, return sample data
    if not schedule:
        # Sample data as fallback with days of the week
        return  []

    return schedule

@router.get("/available-slots")
async def get_available_slots(day: str = None, doctor_id: str = None, date: str = None):
    """Get available time slots for a specific doctor and day of the week.

    Returns both available slots and information about which slots are already booked.
    """
    try:
        # If doctor_id is provided, filter by that doctor
        query = {}
        if doctor_id and ObjectId.is_valid(doctor_id):
            query["user_id"] = doctor_id
        if day:
            query["day"] = day

        # Find the schedule for the specified day and doctor
        schedule = None
        if query:
            schedule = await schedule_collection.find_one(query)

        # Default schedule for each day
        default_slots = {
            "Monday": ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30"],
            "Tuesday": ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30"],
            "Wednesday": ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30"],
            "Thursday": ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30"],
            "Friday": ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
            "Saturday": ["10:00", "10:30", "11:00", "11:30"],
            "Sunday": ["10:00", "10:30", "11:00", "11:30"]
        }

        # Generate slots based on schedule or default
        if not schedule:
            # Use default slots for the requested day
            slots = default_slots.get(day, []) if day else []
        else:
            # Generate slots based on start_time, end_time, and interval
            start_time = schedule.get("start_time", "09:00")
            end_time = schedule.get("end_time", "17:00")
            interval_minutes = schedule.get("interval", 30)  # Default 30-minute intervals

            # Convert times to datetime objects for easier manipulation
            start_dt = datetime.strptime(start_time, "%H:%M")
            end_dt = datetime.strptime(end_time, "%H:%M")

            # Generate slots
            slots = []
            current_dt = start_dt
            while current_dt < end_dt:
                slots.append(current_dt.strftime("%H:%M"))
                current_dt += timedelta(minutes=interval_minutes)

        # Get booked appointments for this date and doctor if date is provided
        booked_slots = []
        if date and doctor_id:
            from core.database import appointment_collection

            # Query for appointments on this date for this doctor
            appointments_query = {
                "date": date,
                "doctor_id": doctor_id,
                "status": {"$nin": ["Canceled", "Cancelled"]}
            }

            appointments_cursor = appointment_collection.find(appointments_query)
            async for appointment in appointments_cursor:
                if "time" in appointment and appointment["time"] in slots:
                    booked_slots.append(appointment["time"])

        # Create a list of slot objects with availability information
        slot_objects = []
        for slot in slots:
            slot_objects.append({
                "time": slot,
                "is_booked": slot in booked_slots
            })

        return {
            "day": day,
            "slots": slots,  # For backward compatibility
            "slot_details": slot_objects  # New format with booking information
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting available slots: {str(e)}"
        )

@router.post("/")
async def create_or_update_schedule(schedule_data: dict, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Create a new schedule entry or update if day already exists for the current user."""
    try:
        # Get the user ID
        user_id = str(current_user.get("_id"))
        is_doctor = current_user.get("is_doctor", False)

        # Check if a schedule for this day already exists
        day = schedule_data.get("day")
        if not day:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Day is required"
            )

        # Add user_id to the schedule data
        schedule_data["user_id"] = user_id

        # Check if this is a day off (null or empty start/end times)
        is_day_off = (
            schedule_data.get("start_time") is None or
            schedule_data.get("end_time") is None or
            schedule_data.get("start_time") == schedule_data.get("end_time") or
            (schedule_data.get("start_time") == "00:00" and schedule_data.get("end_time") == "00:00")
        )

        # Find existing schedule for this day and user
        existing_schedule = await schedule_collection.find_one({
            "day": day,
            "user_id": user_id
        })

        # Check if we're changing from a working day to a day off
        was_working_day = False
        if existing_schedule:
            was_working_day = (
                existing_schedule.get("start_time") is not None and
                existing_schedule.get("end_time") is not None and
                existing_schedule.get("start_time") != existing_schedule.get("end_time") and
                not (existing_schedule.get("start_time") == "00:00" and existing_schedule.get("end_time") == "00:00")
            )

        # Update or create the schedule
        if existing_schedule:
            # Update existing schedule
            result = await schedule_collection.update_one(
                {"_id": existing_schedule["_id"]},
                {"$set": schedule_data}
            )
            update_message = "Schedule updated successfully"
        else:
            # Create new schedule
            result = await schedule_collection.insert_one(schedule_data)
            update_message = "Schedule created successfully"

        # If this is a doctor setting a day off, cancel all appointments for that day
        if is_doctor and is_day_off and (not existing_schedule or was_working_day):
            try:
                # Directly cancel appointments for this day
                from routers.appointments import appointment_collection

                # Build the query to find appointments on this day of the week
                # First, get all future appointments for this doctor
                today = datetime.now().date().isoformat()
                query = {
                    "$or": [
                        {"doctor_id": user_id},
                        {"user_id": user_id}
                    ],
                    "date": {"$gte": today},
                    "status": {"$nin": ["Canceled", "Cancelled"]}
                }

                # Find all matching appointments
                appointments_cursor = appointment_collection.find(query)
                canceled_count = 0

                # Process each appointment
                async for appointment in appointments_cursor:
                    try:
                        # Convert the appointment date to a datetime object to get the day of week
                        appointment_date = datetime.fromisoformat(appointment["date"])
                        appointment_day = appointment_date.strftime("%A")  # Get day name (Monday, Tuesday, etc.)

                        # Skip if this appointment is not on the specified day of week
                        if appointment_day != day:
                            continue

                        # Update the appointment status to "Canceled"
                        update_result = await appointment_collection.update_one(
                            {"_id": appointment["_id"]},
                            {"$set": {"status": "Canceled"}}
                        )

                        if update_result.modified_count > 0:
                            canceled_count += 1
                    except (ValueError, KeyError):
                        # Skip appointments with invalid dates
                        continue

                # Add the cancellation info to the response
                return {
                    "id": str(existing_schedule["_id"] if existing_schedule else result.inserted_id),
                    "message": f"{update_message}. Successfully canceled {canceled_count} appointments for {day}."
                }
            except Exception as cancel_err:
                # Log the error but don't fail the schedule update
                print(f"Error canceling appointments: {str(cancel_err)}")
                return {
                    "id": str(existing_schedule["_id"] if existing_schedule else result.inserted_id),
                    "message": f"{update_message}. Warning: Failed to cancel appointments for this day."
                }

        return {
            "id": str(existing_schedule["_id"] if existing_schedule else result.inserted_id),
            "message": update_message
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating/updating schedule: {str(e)}"
        )

