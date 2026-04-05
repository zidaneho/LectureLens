from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class UserPreferences(BaseModel):
    browser_context: Optional[str] = Field(None, description="Context for Browser Use (e.g., Coursera login)")
    persona: Optional[str] = Field("Professor", description="AI persona for notes and chat")
    summary_length: Optional[str] = Field("medium", description="Length of generated notes (short, medium, long)")

class UserProfile(BaseModel):
    user_id: str
    email: Optional[str] = None
    preferences: UserPreferences = UserPreferences()

class UserUpdate(BaseModel):
    email: Optional[str] = None
    preferences: Optional[UserPreferences] = None

class UserResponse(BaseModel):
    user_id: str
    email: Optional[str] = None
    preferences: UserPreferences
