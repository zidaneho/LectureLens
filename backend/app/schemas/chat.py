from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    index_id: Optional[str] = None
    video_id: Optional[str] = None
    message: str
    persona: Optional[str] = "default"
    gemini_api_key: Optional[str] = None
    twelve_labs_api_key: Optional[str] = None

class ChatResponse(BaseModel):
    response_text: str
    timestamp: Optional[float] = None
    audio_url: Optional[str] = None
