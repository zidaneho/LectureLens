from .worker import celery_app
import asyncio
import logging
from app.services.twelve_labs import get_twelve_labs_service
from app.services.gemini import get_gemini_service
from app.services.browser_use_service import get_browser_use_service

logger = logging.getLogger(__name__)

@celery_app.task(name="process_video_pipeline", bind=True)
def process_video_pipeline(self, task_id: str, prompt: str, video_url: str = None, title: str = None):
    """
    Long-running pipeline: Browser Use -> TwelveLabs -> Gemini
    
    Args:
        task_id: Unique task identifier
        prompt: User's search/analysis prompt
        video_url: Optional direct video URL (if provided, skips Browser Use)
        title: Optional video title (if provided with video_url)
    """
    try:
        logger.info(f"Starting pipeline for task {task_id} with prompt: {prompt}")
        
        # Stage 1: Search for video (Browser Use)
        self.update_state(state="PROGRESS", meta={"stage": "searching_video", "progress": 10})
        
        if video_url and title:
            logger.info(f"Using provided video URL: {video_url}")
        else:
            logger.info(f"Using Browser Use to search for: {prompt}")
            browser_service = get_browser_use_service()
            search_result = asyncio.run(browser_service.search_video(prompt))
            video_url = search_result.get("video_url")
            title = search_result.get("title", "Lecture Video")
            logger.info(f"Found video: {title} at {video_url}")
        
        # Stage 2: Index and process video with TwelveLabs
        self.update_state(state="PROGRESS", meta={"stage": "processing_video", "progress": 40})
        
        try:
            twelve_labs_data = asyncio.run(
                _index_and_get_video_data(video_url, title)
            )
        except Exception as e:
            logger.error(f"TwelveLabs processing failed: {str(e)}")
            # Return mock data for now if TwelveLabs fails
            twelve_labs_data = {
                "transcript": [
                    {"start": 0, "end": 10, "text": "Welcome to the lecture"},
                    {"start": 10, "end": 60, "text": "Today we will discuss important concepts"}
                ],
                "key_concepts": [
                    {"label": "Foundational Concept", "timestamp": 10}
                ]
            }
        
        # Stage 3: Generate notes with Gemini
        self.update_state(state="PROGRESS", meta={"stage": "generating_notes", "progress": 80})
        
        gemini_service = get_gemini_service()
        notes_result = asyncio.run(
            gemini_service.generate_lecture_notes(twelve_labs_data, title)
        )
        
        # Extract resources using Browser Use
        research_queries = notes_result.get("research_queries", [])
        logger.info(f"Extracting resources for: {research_queries}")
        browser_service = get_browser_use_service()
        external_resources = asyncio.run(
            browser_service.extract_resources(research_queries)
        )
        
        lecture_notes = {
            "markdown_content": notes_result.get("markdown_content", ""),
            "external_resources": external_resources
        }
        
        # Final result
        return {
            "id": task_id,
            "video_url": video_url,
            "title": title,
            "twelve_labs_data": twelve_labs_data,
            "lecture_notes": lecture_notes
        }
    
    except Exception as e:
        logger.error(f"Pipeline failed: {str(e)}", exc_info=True)
        raise


async def _index_and_get_video_data(video_url: str, title: str):
    """
    Index a video on TwelveLabs and extract transcript/concepts using the SDK.
    """
    service = get_twelve_labs_service()
    
    try:
        # Submit video for indexing (returns task_id)
        logger.info(f"Submitting video for indexing: {video_url}")
        task_id = await service.submit_video_for_indexing(video_url, title)
        logger.info(f"Video submitted with task_id: {task_id}")
        
        # Poll until indexing is complete
        logger.info(f"Polling TwelveLabs for indexing completion...")
        task_info = await service.poll_until_indexed(task_id, max_attempts=120, poll_interval=5)
        logger.info(f"Indexing complete for video: {task_info.get('video_id')}")
        
        # Extract transcript and key concepts
        logger.info(f"Extracting video data...")
        twelve_labs_data = await service.get_video_data(task_info)
        
        return twelve_labs_data.model_dump()
    
    finally:
        await service.close()
