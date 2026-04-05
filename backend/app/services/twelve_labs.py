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
    
    def __init__(self, api_key: str = settings.TWELVE_LABS_API_KEY):
        self.api_key = api_key
        self.client = TwelveLabs(api_key=self.api_key) if self.api_key else None
        self.index_name = "lecture-lens-index-v5"
        self._index = None
        self._async_client = None

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
                    model_name="marengo3.0",
                    model_options=["visual", "audio"]
                ),
                IndexesCreateRequestModelsItem(
                    model_name="pegasus1.2",
                    model_options=["visual", "audio"]
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
        import yt_dlp
        import tempfile
        import os
        import uuid

        index = await self.get_index()

        logger.info(f"Submitting video to index {index.id}: {video_url}")

        # Use a unique directory per download to avoid collisions when multiple
        # workers process the same URL simultaneously.
        tmp_dir = tempfile.mkdtemp(prefix=f"tl_{uuid.uuid4().hex}_")
        ydl_opts = {
            'format': 'best[ext=mp4]/best',
            'outtmpl': os.path.join(tmp_dir, '%(id)s.%(ext)s'),
            'quiet': True,
        }

        file_path = None
        try:
            # Download video locally to avoid media_url_file_broken errors from signed/expiring URLs
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                logger.info(f"Downloading video from {video_url}...")
                info = ydl.extract_info(video_url, download=True)
                file_path = ydl.prepare_filename(info)
            
            logger.info(f"Downloaded video to {file_path}, uploading to TwelveLabs...")
            with open(file_path, "rb") as f:
                task = self.client.tasks.create(
                    index_id=index.id,
                    video_file=f
                )
            logger.info("Upload complete.")
            return task.id
        except Exception as e:
            logger.error(f"Failed to submit video: {str(e)}")
            raise e
        finally:
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    logger.info(f"Cleaned up temporary file {file_path}")
                except OSError as e:
                    logger.error(f"Error removing temporary file: {e}")
            try:
                os.rmdir(tmp_dir)
            except OSError:
                pass

    async def poll_until_indexed(
        self,
        task_id: str,
        max_attempts: int = 120,
        poll_interval: int = 5,
        on_progress: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        Poll the TwelveLabs API until video indexing is complete.
        
        Returns: Task info
        """
        for i in range(max_attempts):
            task = self.client.tasks.retrieve(task_id)
            
            if on_progress:
                on_progress(task, i)

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
        
        # Key concepts are derived by Gemini during note generation — return empty for now
        key_concepts = []

        return TwelveLabsData(
            transcript=transcript_segments,
            key_concepts=key_concepts
        )

    async def search_video(self, index_id: str, query: str, video_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Search a video index using the TwelveLabs SDK.

        Args:
            index_id: TwelveLabs index ID
            query: Search query
            video_id: Optional video ID to filter results

        Returns: Dictionary with a 'data' list of search result dicts
        """
        if not self.api_key:
            return {"data": []}

        try:
            results = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: list(self.client.search.query(
                    index_id=index_id,
                    query_text=query,
                    search_options=["visual", "audio", "transcription"],
                ))
            )

            if video_id:
                results = [r for r in results if getattr(r, "video_id", None) == video_id]

            data = [
                {
                    "start": getattr(r, "start", None),
                    "end": getattr(r, "end", None),
                    "text": getattr(r, "transcription", "") or "",
                    "video_id": getattr(r, "video_id", None),
                }
                for r in results
            ]
            return {"data": data}
        except Exception as e:
            raise Exception(f"Search request failed: {str(e)}")

    async def generate_key_moments(
        self,
        index_id: str,
        video_id: str,
        topics: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Search the indexed video for each topic label and return key moments with timestamps.

        For each topic, queries the TwelveLabs Search API and picks the top matching clip.
        Returns a list of {"label": str, "timestamp": float} dicts, deduplicated by timestamp.
        """
        if not self.api_key or not topics:
            return []

        seen_timestamps: set = set()
        key_moments: List[Dict[str, Any]] = []

        for topic in topics:
            try:
                results = await self.search_video(index_id, topic, video_id=video_id)
                data = results.get("data", [])
                if not data:
                    continue
                best = data[0]
                ts = best.get("start")
                if ts is None:
                    continue
                # Round to nearest second to avoid near-duplicate timestamps
                ts_rounded = round(float(ts))
                if ts_rounded in seen_timestamps:
                    continue
                seen_timestamps.add(ts_rounded)
                key_moments.append({"label": topic, "timestamp": float(ts)})
            except Exception as e:
                logger.warning(f"Search failed for topic '{topic}': {e}")

        # Sort by timestamp so the frontend timeline is ordered
        key_moments.sort(key=lambda m: m["timestamp"])
        return key_moments

    async def close(self):
        """Close async client"""
        if self._async_client:
            await self._async_client.aclose()

def get_twelve_labs_service(api_key: str = None) -> TwelveLabsService:
    """Get or create the TwelveLabs service"""
    return TwelveLabsService(api_key=api_key or settings.TWELVE_LABS_API_KEY)
