"""
TwelveLabs service for video indexing and processing.
Uses the official twelvelabs-python SDK.
"""

from twelvelabs import TwelveLabs
import asyncio
import logging
import httpx
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
        self._async_client = None
        self.base_url = "https://api.twelvelabs.io/v1"

    async def get_index(self):
        """Get or create a default index for the project"""
        if self._index:
            return self._index
        
        indexes = self.client.indexes.list()
        for idx in indexes:
            if idx.index_name == self.index_name:
                self._index = idx
                return idx
        
        # Create new index if not found
        logger.info(f"Creating new TwelveLabs index: {self.index_name}")
        from twelvelabs.indexes import IndexesCreateRequestModelsItem
        self._index = self.client.indexes.create(
            index_name=self.index_name,
            models=[
                IndexesCreateRequestModelsItem(
                    model_name="marengo2.6",
                    model_options=["visual", "conversation", "text_in_video", "logo"]
                ),
                IndexesCreateRequestModelsItem(
                    model_name="pegasus1.1",
                    model_options=["visual", "conversation"]
                )
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
        task = self.client.tasks.create(
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
            task = self.client.tasks.retrieve(task_id)
            
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
        index_id = task_info["index_id"]
        
        # Get transcript
        logger.info(f"Fetching transcript for video {video_id} in index {index_id}")
        video = self.client.indexes.videos.retrieve(index_id, video_id, transcription=True)
        transcript_data = video.transcription if video.transcription else []
        
        transcript_segments = [
            TranscriptSegment(
                start=t.start,
                end=t.end,
                text=t.value
            ) for t in transcript_data
        ]
        
        # Get summary/chapters for key concepts
        logger.info(f"Generating summary for video {video_id} using analyze")
        # In v1.3, we use analyze or analyze_async for generation tasks
        # We'll use analyze with a prompt to get chapters
        try:
            summary_response = self.client.analyze(
                video_id=video_id,
                prompt="Summarize this video into chapters with titles and timestamps",
            )
            # For now, we'll assume the response might need parsing or has a structure
            # based on how analyze is implemented in the SDK.
            # In a real scenario, we would use response_format for structured JSON.
            summary = summary_response
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            summary = None
        
        key_concepts = []
        if summary and hasattr(summary, 'chapters') and summary.chapters:
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
        
        # Fallback if no chapters or highlights
        if not key_concepts:
            key_concepts.append(KeyConcept(
                label="Main Overview",
                timestamp=0
            ))

        return TwelveLabsData(
            transcript=transcript_segments,
            key_concepts=key_concepts
        )

    async def get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client for search"""
        if self._async_client is None:
            self._async_client = httpx.AsyncClient()
        return self._async_client

    async def search_video(self, index_id: str, query: str, video_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Search a video index using TwelveLabs Search API.
        
        Args:
            index_id: TwelveLabs index ID
            query: Search query
            video_id: Optional video ID to filter results
        
        Returns: Dictionary with search results
        """
        client = await self.get_client()
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "query": query,
            "index_id": index_id,
            "search_options": ["visual", "conversation", "text_in_video"]
        }
        
        if video_id:
            payload["filters"] = [{"id": [video_id]}]
        
        try:
            response = await client.post(
                f"{self.base_url}/search",
                json=payload,
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Search API error: {response.text}")
            
            return response.json()
        except httpx.RequestError as e:
            raise Exception(f"Search request failed: {str(e)}")

    async def close(self):
        """Close async client"""
        if self._async_client:
            await self._async_client.aclose()

# Global service instance
_twelve_labs_service: Optional[TwelveLabsService] = None

def get_twelve_labs_service() -> TwelveLabsService:
    """Get or create the TwelveLabs service"""
    global _twelve_labs_service
    if _twelve_labs_service is None:
        _twelve_labs_service = TwelveLabsService()
    return _twelve_labs_service
