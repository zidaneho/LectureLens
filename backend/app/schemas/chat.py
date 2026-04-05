from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    index_id: str
    video_id: str
    message: str
    persona: Optional[str] = "default"

class ChatResponse(BaseModel):
    response_text: str
    timestamp: Optional[float] = None
    audio_url: Optional[str] = None
