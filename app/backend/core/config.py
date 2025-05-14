# backend/core/config.py

import os
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class KalmanFilterSettings(BaseModel):
    """Settings for Kalman filter parameters"""
    Q1: float = Field(default=0.001, description="Process noise covariance for first level")
    R1: float = Field(default=10.0, description="Measurement noise covariance for first level")
    Q2: float = Field(default=0.001, description="Process noise covariance for second level")
    R2: float = Field(default=1.0, description="Measurement noise covariance for second level")


class DefaultUserSettings(BaseModel):
    """Default user settings for development environment"""
    username: str = Field(default="doctor", description="Default username")
    password: str = Field(default="doctor123", description="Default password")
    email: str = Field(default="doctor@example.com", description="Default email")
    full_name: str = Field(default="Dr. John Smith", description="Default full name")


class Settings(BaseModel):
    """
    Configuration settings for the application.
    """

    # Database Settings
    mongodb_url: str = os.environ.get("MONGODB_URL", "mongodb+srv://ahmed:ahmed123@cluster0.lq3uj.mongodb.net/")
    mongodb_db_name: str = os.environ.get("MONGODB_DB_NAME", "doctorino")

    # JWT Settings
    jwt_secret_key: str = os.environ.get("JWT_SECRET_KEY", "doctorino_secret")
    jwt_algorithm: str = os.environ.get("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # Application Settings
    app_name: str = os.environ.get("APP_NAME", "Doctorino API")
    environment: str = os.environ.get("ENVIRONMENT", "development")  # e.g., "production", "staging"

    # ECG Processing Settings
    kalman_filter: KalmanFilterSettings = KalmanFilterSettings()

    # Default User Settings (only used in development)
    default_user: DefaultUserSettings = DefaultUserSettings()

    # CORS Settings
    cors_origins: list = Field(
        default_factory=lambda: os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:8000,https://doctorino-app.onrender.com,*").split(",")
    )

    # File Upload Settings
    upload_folder: str = os.environ.get("UPLOAD_FOLDER", "uploads")

    # Plot Settings
    plot_figsize: tuple = (12, 6)
    plot_sample_size: int = int(os.environ.get("PLOT_SAMPLE_SIZE", "1000").split()[0])  # 1000 samples default


# Create a single instance of the settings
settings = Settings()