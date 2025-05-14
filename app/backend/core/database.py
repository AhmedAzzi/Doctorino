import motor.motor_asyncio
import gridfs
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from .config import settings

# Use settings from config.py
client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_url)

database = client[settings.mongodb_db_name]

# Collections
patient_collection = database.get_collection("patients")
report_collection = database.get_collection("reports")
appointment_collection = database.get_collection("appointments")
schedule_collection = database.get_collection("schedule")
doctor_collection = database.get_collection("doctors")  # For authentication
medical_reports_collection = database.get_collection("medical_reports")  # For patient files

# GridFS for file storage
fs = AsyncIOMotorGridFSBucket(database, bucket_name="uploads")