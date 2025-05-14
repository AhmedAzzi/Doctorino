from typing import Optional, Literal
from pydantic import BaseModel, Field

class NotificationSettings(BaseModel):
    email: bool = Field(default=True, description="Receive email notifications")
    sms: bool = Field(default=False, description="Receive SMS notifications")
    appointment: bool = Field(default=True, description="Receive appointment reminders")
    marketing: bool = Field(default=False, description="Receive marketing communications")

class AppearanceSettings(BaseModel):
    theme: Literal["light", "dark", "system"] = Field(default="light", description="UI theme preference")
    compactMode: bool = Field(default=False, description="Use compact UI mode")

class PreferenceSettings(BaseModel):
    language: Literal["English", "French", "Arabic"] = Field(default="English", description="Interface language")
    timeFormat: Literal["12h", "24h"] = Field(default="24h", description="Time format")
    dateFormat: Literal["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] = Field(default="DD/MM/YYYY", description="Date format")
    currency: Literal["DZD", "USD", "EUR"] = Field(default="DZD", description="Currency for financial information")

class SecuritySettings(BaseModel):
    twoFactorAuth: bool = Field(default=False, description="Enable two-factor authentication")
    sessionTimeout: str = Field(default="30", description="Session timeout in minutes")

class UserSettings(BaseModel):
    notifications: NotificationSettings = Field(default_factory=NotificationSettings)
    appearance: AppearanceSettings = Field(default_factory=AppearanceSettings)
    preferences: PreferenceSettings = Field(default_factory=PreferenceSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)

class UserSettingsUpdate(BaseModel):
    notifications: Optional[NotificationSettings] = None
    appearance: Optional[AppearanceSettings] = None
    preferences: Optional[PreferenceSettings] = None
    security: Optional[SecuritySettings] = None
