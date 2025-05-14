from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from datetime import datetime, timedelta
from bson import ObjectId

# Import database collections (adjust path if necessary)
from core.database import (
    patient_collection,
    appointment_collection,
    # Add other collections if needed by dashboard logic
)

# Import security for authentication
from core.security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary") # Removed response_model for flexibility, FastAPI infers it
async def get_dashboard_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get summary statistics for the dashboard."""
    # Get the user_id
    user_id = str(current_user.get("_id"))

    # Get real data from the database - filter by user_id
    total_patients = await patient_collection.count_documents({"user_id": user_id})

    # Find all patients belonging to this user
    user_patients = []
    async for patient in patient_collection.find({"user_id": user_id}):
        user_patients.append(str(patient["_id"]))

    # Get upcoming appointments (future dates) for this user's patients
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    upcoming_appointments = await appointment_collection.count_documents({
        "date": {"$gte": today.isoformat()},
        "patient_id": {"$in": user_patients}
    })

    # Get appointment statistics for this user's patients
    completed = await appointment_collection.count_documents({
        "status": "Completed",
        "patient_id": {"$in": user_patients}
    })
    scheduled = await appointment_collection.count_documents({
        "status": "Scheduled",
        "patient_id": {"$in": user_patients}
    })
    cancelled = await appointment_collection.count_documents({
        "status": "Cancelled",
        "patient_id": {"$in": user_patients}
    })

    # Get recent patients with their appointments
    recent_patients_cursor = patient_collection.find({"user_id": user_id}).sort("last_visit", -1).limit(4)
    recent_patients = []

    async for patient in recent_patients_cursor:
        # Find the most recent appointment for this patient
        recent_appointment = await appointment_collection.find_one(
            {"patient_id": str(patient["_id"])},
            sort=[("date", -1)]
        )

        status = "Unknown"
        # Use created_at as fallback if last_visit is missing
        date = patient.get("last_visit") or patient.get("created_at")
        if date and isinstance(date, datetime):
             date = date.isoformat() # Ensure date is string
        elif not date:
             date = "Unknown"


        if recent_appointment:
            status = recent_appointment.get("status", "Unknown")
            # Prefer appointment date if available
            app_date = recent_appointment.get("date")
            if app_date:
                 date = app_date # Already a string from DB or isoformat

        recent_patients.append({
            "id": str(patient["_id"]),
            "name": patient.get("name", "Unknown"),
            "date": date,
            "status": status
        })

    # Calculate monthly revenue based on actual appointment costs
    current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Find all appointments for this month with their costs
    monthly_appointments_cursor = appointment_collection.find({
        "date": {"$gte": current_month_start.isoformat()},
        "status": {"$in": ["Completed", "Scheduled"]},
        "patient_id": {"$in": user_patients}
    })

    # Calculate total revenue by summing the actual costs
    monthly_revenue = 0
    async for appointment in monthly_appointments_cursor:
        # Use the appointment cost if available, otherwise use default 1500
        appointment_cost = appointment.get("cost")
        if appointment_cost is not None:
            monthly_revenue += float(appointment_cost)
        else:
            # Fallback to default cost if not specified
            monthly_revenue += 1500

    # Calculate percentage changes (for demonstration, using fixed values or simple logic)
    # In a real app, you would compare with previous periods (e.g., last month)
    # Placeholder logic:
    patient_change = "+5%" if total_patients > 50 else "+1%" if total_patients > 0 else "0%"
    appointment_change = "+10%" if upcoming_appointments > 5 else "+2%" if upcoming_appointments > 0 else "0%"
    revenue_change = "+8%" if monthly_revenue > 10000 else "+3%" if monthly_revenue > 0 else "0%"

    return {
        "totalPatients": {"count": total_patients, "change": patient_change},
        "upcomingAppointments": {"count": upcoming_appointments, "change": appointment_change},
        "monthlyRevenue": {"amount": monthly_revenue, "currency": "DZD", "change": revenue_change},
        "recent_patients": recent_patients,
        "appointment_stats": {
            "completed": completed,
            "scheduled": scheduled,
            "cancelled": cancelled
        }
    }

@router.get("/charts/patients")
async def get_patients_chart_data(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get patient trend data for dashboard charts."""
    # Get the user_id
    user_id = str(current_user.get("_id"))

    # Get real data from the database
    # Count patients registered per month for the last 6 months

    months_data = []
    current_date = datetime.now()

    for i in range(5, -1, -1):
        # Calculate the target month
        # This logic might be slightly inaccurate for month calculation across year boundaries
        # A more robust approach would use dateutil.relativedelta or similar logic
        target_month_date = (current_date.replace(day=1) - timedelta(days=i * 30)).replace(day=1)

        month_name = target_month_date.strftime("%b")  # Short month name

        # Start of the month
        start_date = target_month_date.replace(hour=0, minute=0, second=0, microsecond=0)

        # End of the month (start of next month - 1 microsecond)
        if start_date.month == 12:
            end_date = start_date.replace(year=start_date.year + 1, month=1, day=1) - timedelta(microseconds=1)
        else:
            end_date = start_date.replace(month=start_date.month + 1, day=1) - timedelta(microseconds=1)

        # Count patients registered in this month (using created_at field)
        count = await patient_collection.count_documents({
            "created_at": {
                "$gte": start_date,
                "$lte": end_date
            },
            "user_id": user_id # Filter by user_id
        })

        months_data.append({"name": month_name, "value": count})

    # If no data is found, provide sample data
    if all(month["value"] == 0 for month in months_data):
        # Sample data as fallback
        return [
            {"name": "Jan", "value": 65}, {"name": "Feb", "value": 72},
            {"name": "Mar", "value": 80}, {"name": "Apr", "value": 95},
            {"name": "May", "value": 110},{"name": "Jun", "value": 120}
        ] # Assuming current month is June for sample data

    return months_data

@router.get("/charts/revenue")
async def get_revenue_chart_data(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get revenue trend data for dashboard charts."""
    # Get the user_id
    user_id = str(current_user.get("_id"))

    # Find all patients belonging to this user
    user_patients = []
    async for patient in patient_collection.find({"user_id": user_id}):
        user_patients.append(str(patient["_id"]))

    # Calculate revenue based on actual appointment costs for the last 6 months
    months_data = []
    current_date = datetime.now()

    for i in range(5, -1, -1):
        # Calculate the target month
        target_month_date = (current_date.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        month_name = target_month_date.strftime("%b")

        # Start of the month
        start_date = target_month_date.replace(hour=0, minute=0, second=0, microsecond=0)

        # End of the month
        if start_date.month == 12:
            end_date = start_date.replace(year=start_date.year + 1, month=1, day=1) - timedelta(microseconds=1)
        else:
            end_date = start_date.replace(month=start_date.month + 1, day=1) - timedelta(microseconds=1)

        # Find all completed appointments in this month
        appointments_cursor = appointment_collection.find({
            "date": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            },
            "status": "Completed",
            "patient_id": {"$in": user_patients}
        })

        # Calculate total revenue for the month by summing actual costs
        monthly_revenue = 0
        async for appointment in appointments_cursor:
            # Use the appointment cost if available, otherwise use default 1500
            appointment_cost = appointment.get("cost")
            if appointment_cost is not None:
                monthly_revenue += float(appointment_cost)
            else:
                # Fallback to default cost if not specified
                monthly_revenue += 1500

        months_data.append({"name": month_name, "value": monthly_revenue})

    # If no data is found, provide sample data
    if all(month["value"] == 0 for month in months_data):
        # Sample data as fallback
        return [
            {"name": "Jan", "value": 8500}, {"name": "Feb", "value": 9200},
            {"name": "Mar", "value": 10500},{"name": "Apr", "value": 12000},
            {"name": "May", "value": 13500},{"name": "Jun", "value": 15000}
        ] # Assuming current month is June for sample data

    return months_data

@router.get("/upcoming-appointments")
async def get_upcoming_appointments(current_user: Dict[str, Any] = Depends(get_current_user), limit: int = 5):
    """Get detailed information about upcoming appointments for the dashboard."""
    # Get the user_id
    user_id = str(current_user.get("_id"))

    # Find all patients belonging to this user
    user_patients = []
    async for patient in patient_collection.find({"user_id": user_id}):
        user_patients.append(str(patient["_id"]))

    # Get upcoming appointments (future dates) for this user's patients
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # Find upcoming appointments, sorted by date and time
    appointments_cursor = appointment_collection.find({
        "date": {"$gte": today.isoformat()},
        "patient_id": {"$in": user_patients},
        "status": {"$in": ["Pending", "Scheduled", "Confirmed"]}  # Only include active appointments
    }).sort([("date", 1), ("time", 1)]).limit(limit)  # Sort by date and time, limit results

    upcoming_appointments = []

    async for appointment in appointments_cursor:
        # Get patient details
        patient_id = appointment.get("patient_id")
        patient_name = "Unknown"

        if patient_id:
            patient = await patient_collection.find_one({"_id": ObjectId(patient_id)})
            if patient:
                # Combine first and last name if available
                first_name = patient.get("firstName", "")
                last_name = patient.get("lastName", "")
                if first_name or last_name:
                    patient_name = f"{first_name} {last_name}".strip()

        # Format the appointment data
        upcoming_appointments.append({
            "id": str(appointment["_id"]),
            "patientId": patient_id,
            "patientName": patient_name,
            "date": appointment.get("date", ""),
            "time": appointment.get("time", ""),
            "status": appointment.get("status", "Pending"),
            "reason": appointment.get("reason", "")
        })

    # If no upcoming appointments found, return empty list
    if not upcoming_appointments:
        return []

    return upcoming_appointments