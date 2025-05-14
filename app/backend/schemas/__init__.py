# backend/schemas/__init__.py
from .schemas import (
    Token,
    UserCreate,
    UserResponse,
    PatientBase,
    PatientUpdate,
    PatientUpdateFull,
    PatientResponse,
    ReportCreate,
    ReportResponse,
    PyObjectId,
    PatientRead,
    TextReportCreate
)

from .settings_schemas import (
    UserSettings,
    UserSettingsUpdate,
    NotificationSettings,
    AppearanceSettings,
    PreferenceSettings,
    SecuritySettings
)