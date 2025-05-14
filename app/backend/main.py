import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import core modules
from core.config import settings
from routers import (
    auth, patients, appointments, dashboard, schedule,
    analytics, files, mammography,
    settings as user_settings, doctors, medical_reports
)

# Initialize FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Doctorino Backend API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create and mount static directories
base_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(base_dir, "static")
uploads_dir = os.path.join(base_dir, settings.upload_folder)

# Define all required directories
directories = {
    "static": static_dir,
    "uploads": uploads_dir,
    "mammography": os.path.join(uploads_dir, "mammography"),
    "temp": os.path.join(uploads_dir, "temp")
}

# Create all directories
for directory in directories.values():
    os.makedirs(directory, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")
app.mount(f"/{settings.upload_folder}", StaticFiles(directory=uploads_dir), name=settings.upload_folder)
app.mount("/backend", StaticFiles(directory=base_dir), name="backend")


# Include routers
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(patients.router, prefix="/api", tags=["Patients"])
app.include_router(appointments.router, prefix="/api", tags=["Appointments"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(schedule.router, prefix="/api", tags=["Schedule"])
# reports.router is now merged into medical_reports.router
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(files.router, prefix="/api", tags=["Files"])
app.include_router(mammography.router, prefix="/api", tags=["Mammography"])
app.include_router(user_settings.router, prefix="/api", tags=["Settings"])
app.include_router(doctors.router, prefix="/api", tags=["Doctors"])
app.include_router(medical_reports.router, prefix="", tags=["Medical Reports"])
# login router

@app.get("/")
async def root():
    """Root endpoint that returns basic API information"""
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": "1.0.0",
        "environment": settings.environment
    }
