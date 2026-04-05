"""
TwelveLabs service for video indexing and processing.
Uses the official twelvelabs-python SDK.
"""

from twelvelabs import TwelveLabs
import asyncio
import logging
from typing import Optional, Dict, Any, List
from app.core.config import settings
from app.schemas.video import TranscriptSegment, KeyConcept, TwelveLabsData

logger = logging.getLogger(__name__)

class TwelveLabsService:
    """Service for TwelveLabs API interactions using official SDK"""
    
    def __init__(self):
        self.api_key = settings.TWELVE_LABS_API_KEY
        self.client = TwelveLabs(api_key=self.api_key)
        self.index_name = "lecture-lens-index"
        self._index = None

    async def get_index(self):
        """Get or create a default index for the project"""
        if self._index:
            return self._index
        
        indices = self.client.index.list()
        for idx in indices:
            if idx.name == self.index_name:
                self._index = idx
                return idx
        
        # Create new index if not found
        logger.info(f"Creating new TwelveLabs index: {self.index_name}")
        self._index = self.client.index.create(
            name=self.index_name,
            engines=[
                {
                    "engine_name": "marengo2.6",
                    "engine_options": ["visual", "conversation", "text_in_video", "logo"]
                },
                {
                    "engine_name": "pegasus1.1",
                    "engine_options": ["visual", "conversation"]
                }
            ]
        )
        return self._index

    async def submit_video_for_indexing(
        self,
        video_url: str,
        title: str,
        language: str = "en"
    ) -> str:
        """
        Submit a video for indexing on TwelveLabs.
        
        Returns: task_id (not index_id, as we are using a shared index)
        """
        index = await self.get_index()
        
        logger.info(f"Submitting video to index {index.id}: {video_url}")
        task = self.client.task.create(
            index_id=index.id,
            url=video_url,
            language=language
        )
        return task.id

    async def poll_until_indexed(
        self,
        task_id: str,
        max_attempts: int = 120,
        poll_interval: int = 5
    ) -> Dict[str, Any]:
        """
        Poll the TwelveLabs API until video indexing is complete.
        
        Returns: Task info
        """
        for _ in range(max_attempts):
            task = self.client.task.retrieve(task_id)
            
            if task.status == "ready":
                return {
                    "status": "ready",
                    "video_id": task.video_id,
                    "index_id": task.index_id
                }
            
            if task.status == "failed":
                raise Exception(f"Video indexing failed: {task.process}")
            
            await asyncio.sleep(poll_interval)
        
        raise TimeoutError(f"Video indexing timed out for task {task_id}")

    async def get_video_data(self, task_info: Dict[str, Any]) -> TwelveLabsData:
        """
        Extract transcript and key concepts from indexed video.
        """
        video_id = task_info["video_id"]
        
        # Get transcript
        logger.info(f"Fetching transcript for video {video_id}")
        transcript_data = self.client.video.transcription(video_id)
        transcript_segments = [
            TranscriptSegment(
                start=t.start,
                end=t.end,
                text=t.value
            ) for t in transcript_data
        ]
        
        # Get summary/chapters for key concepts
        logger.info(f"Generating summary for video {video_id}")
        summary = self.client.generate.summarize(video_id, type="chapter")
        
        key_concepts = []
        if hasattr(summary, 'chapters') and summary.chapters:
            for chapter in summary.chapters:
                key_concepts.append(KeyConcept(
                    label=getattr(chapter, 'chapter_title', 'Key Moment'),
                    timestamp=getattr(chapter, 'start', 0)
                ))
        elif hasattr(summary, 'highlights') and summary.highlights:
             for highlight in summary.highlights:
                key_concepts.append(KeyConcept(
                    label=getattr(highlight, 'highlight_summary', 'Highlight'),
                    timestamp=getattr(highlight, 'start', 0)
                ))
        
        # Fallback to gist if no chapters
        if not key_concepts:
            gist = self.client.generate.summarize(video_id, type="gist")
            key_concepts.append(KeyConcept(
                label="Main Overview",
                timestamp=0
            ))

        return TwelveLabsData(
            transcript=transcript_segments,
            key_concepts=key_concepts
        )

    async def close(self):
        """No-op for SDK client"""
        pass

# Global service instance
_twelve_labs_service: Optional[TwelveLabsService] = None

def get_twelve_labs_service() -> TwelveLabsService:
    """Get or create the TwelveLabs service"""
    global _twelve_labs_service
    if _twelve_labs_service is None:
        _twelve_labs_service = TwelveLabsService()
    return _twelve_labs_service
