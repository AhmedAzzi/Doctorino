from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any
from datetime import datetime, timedelta

# Import database collections
from core.database import patient_collection, appointment_collection
from core.security import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard-data")
async def get_dashboard_data(current_user: Dict[str, Any] = Depends(get_current_user), time_frame: str = "yearly"):
    """Get all analytics data for the dashboard."""
    try:
        # Get the user_id
        user_id = str(current_user.get("_id"))

        # Find all patients belonging to this user
        user_patients = []
        async for patient in patient_collection.find({"user_id": user_id}):
            user_patients.append(str(patient["_id"]))

        if not user_patients:
            # If no patients found, return empty data
            return {
                "monthly_patients": [],
                "revenue": [],
                "appointment_status": [],
                "appointment_time": []
            }

        # Generate monthly patients data
        monthly_patients = []
        current_date = datetime.now()

        # Determine the number of months to include based on time_frame
        num_months = 12 if time_frame == "yearly" else 6

        for i in range(num_months - 1, -1, -1):
            # Calculate the target month
            target_month_date = (current_date.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            month_name = target_month_date.strftime("%b")  # Short month name

            # Start of the month
            start_date = target_month_date.replace(hour=0, minute=0, second=0, microsecond=0)

            # End of the month
            if start_date.month == 12:
                end_date = start_date.replace(year=start_date.year + 1, month=1, day=1) - timedelta(microseconds=1)
            else:
                end_date = start_date.replace(month=start_date.month + 1, day=1) - timedelta(microseconds=1)

            # Count patients registered in this month
            count = await patient_collection.count_documents({
                "created_at": {
                    "$gte": start_date,
                    "$lte": end_date
                },
                "user_id": user_id
            })

            monthly_patients.append({"name": month_name, "count": count})

        # Generate revenue data based on actual appointment costs
        revenue = []

        for i in range(num_months - 1, -1, -1):
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

            revenue.append({"name": month_name, "revenue": monthly_revenue})

        # Generate appointment status data
        appointment_status = []

        # Count appointments by status
        completed = await appointment_collection.count_documents({
            "status": "Completed",
            "patient_id": {"$in": user_patients}
        })
        scheduled = await appointment_collection.count_documents({
            "status": "Scheduled",
            "patient_id": {"$in": user_patients}
        })

        # Check for all variations of "Cancelled"/"Canceled" using case-insensitive regex
        cancelled = await appointment_collection.count_documents({
            "status": {"$regex": "^cancel(l)?ed$", "$options": "i"},
            "patient_id": {"$in": user_patients}
        })

        pending = await appointment_collection.count_documents({
            "status": "Pending",
            "patient_id": {"$in": user_patients}
        })

        # Only add statuses with non-zero counts
        if completed > 0:
            appointment_status.append({"name": "Completed", "value": completed})
        if scheduled > 0:
            appointment_status.append({"name": "Scheduled", "value": scheduled})
        if cancelled > 0:
            appointment_status.append({"name": "Canceled", "value": cancelled})
        if pending > 0:
            appointment_status.append({"name": "Pending", "value": pending})

        # Generate appointment time distribution data
        appointment_time = []

        # Define time slots
        time_slots = [
            "8:00 - 10:00",
            "10:00 - 12:00",
            "12:00 - 14:00",
            "14:00 - 16:00",
            "16:00 - 18:00"
        ]

        # Count appointments by time slot
        for slot in time_slots:
            # Parse the time range
            start_time, end_time = slot.split(" - ")
            start_hour = int(start_time.split(":")[0])
            end_hour = int(end_time.split(":")[0])

            # Count appointments in this time slot
            count = await appointment_collection.count_documents({
                "time": {"$regex": f"^({start_hour}|{start_hour + 1}|{end_hour - 1}|{end_hour})"},
                "patient_id": {"$in": user_patients}
            })

            appointment_time.append({"name": slot, "count": count})

        return {
            "monthly_patients": monthly_patients,
            "revenue": revenue,
            "appointment_status": appointment_status,
            "appointment_time": appointment_time
        }
    except Exception as e:
        print(f"Error fetching analytics data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching analytics data: {str(e)}"
        )

