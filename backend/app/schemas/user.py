from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class UserPreferences(BaseModel):
    # UI/App Settings
    full_name: Optional[str] = Field(None, description="User's full name")
    theme: Optional[str] = Field("dark_low", description="App theme (dark_high, dark_low, light_high)")
    
    # AI/Persona Settings
    persona: Optional[str] = Field("Professor", description="AI persona for notes and chat")
    summary_length: Optional[str] = Field("medium", description="Length of generated notes (short, medium, long)")
    
    # API Keys
    gemini_api_key: Optional[str] = Field(None, description="Google Gemini API Key")
    twelve_labs_api_key: Optional[str] = Field(None, description="Twelve Labs API Key")
    browser_use_api_key: Optional[str] = Field(None, description="Browser Use API Key")
    elevenlabs_api_key: Optional[str] = Field(None, description="ElevenLabs API Key")
    
    # Notifications
    notify_processing: Optional[bool] = Field(True, description="Notify when video has finished indexing")
    notify_weekly: Optional[bool] = Field(False, description="Receive weekly learning summary")
    
    # Internal/Service Settings
    browser_context: Optional[str] = Field(None, description="Context for Browser Use (e.g., Coursera login)")

class UserProfile(BaseModel):
    user_id: str
    email: Optional[str] = None
    hashed_password: Optional[str] = None
    preferences: UserPreferences = UserPreferences()

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    preferences: Optional[UserPreferences] = None

class UserResponse(BaseModel):
    user_id: str
    email: Optional[str] = None
    preferences: UserPreferences
