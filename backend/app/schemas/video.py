from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID

class VideoSearchRequest(BaseModel):
    prompt: str
    context: Optional[Dict[str, str]] = None

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    stage: Optional[str] = None
    progress: Optional[int] = None
    message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None

class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str

class KeyConcept(BaseModel):
    label: str
    timestamp: float

class ExternalResource(BaseModel):
    title: str
    url: str
    type: str

class LectureNotes(BaseModel):
    markdown_content: str
    external_resources: List[ExternalResource]

class TwelveLabsData(BaseModel):
    transcript: List[TranscriptSegment]
    key_concepts: List[KeyConcept]

class VideoResult(BaseModel):
    id: str
    index_id: str
    video_id: str
    video_url: str
    title: str
    twelve_labs_data: TwelveLabsData
    lecture_notes: LectureNotes
