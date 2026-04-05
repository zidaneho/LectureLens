from .worker import celery_app
import asyncio
import logging
from app.services.twelve_labs import get_twelve_labs_service
from app.services.gemini import get_gemini_service
from app.services.browser_use_service import get_browser_use_service

logger = logging.getLogger(__name__)

@celery_app.task(name="process_video_pipeline", bind=True)
def process_video_pipeline(self, task_id: str, prompt: str, video_url: str = None, title: str = None, preferences: dict = None):
    """
    Long-running pipeline: Browser Use -> TwelveLabs -> Gemini
    
    Args:
        task_id: Unique task identifier
        prompt: User's search/analysis prompt
        video_url: Optional direct video URL
        title: Optional video title
        preferences: User's preferences (including API keys and AI persona)
    """
    try:
        preferences = preferences or {}
        gemini_api_key = preferences.get("gemini_api_key")
        twelve_labs_api_key = preferences.get("twelve_labs_api_key")
        persona = preferences.get("persona", "Professor")
        summary_length = preferences.get("summary_length", "medium")

        logger.info(f"Starting pipeline for task {task_id} with prompt: {prompt}")
        # Stage 1: Search for video (Browser Use)
        self.update_state(state="PROGRESS", meta={"stage": "searching_video", "progress": 10})

        import re
        url_regex = re.compile(r'^(https?://|www\.)[^\s/$.?#].[^\s]*$', re.IGNORECASE)

        prompt_clean = prompt.strip()
        if video_url and title:
            logger.info(f"Using provided video URL: {video_url}")
        elif url_regex.match(prompt_clean):
            video_url = prompt_clean
            if video_url.lower().startswith('www.'):
                video_url = 'https://' + video_url
            title = "Video Link"
            logger.info(f"Prompt is a direct URL, bypassing search: {video_url}")
            self.update_state(state="PROGRESS", meta={"stage": "searching_video", "progress": 80})
        else:
            logger.info(f"Using Browser Use to search for: {prompt}")
            self.update_state(state="PROGRESS", meta={"stage": "searching_video", "progress": 30})
            browser_service = get_browser_use_service()
            search_result = asyncio.run(browser_service.search_video(prompt))
            video_url = search_result.get("video_url")
            title = search_result.get("title", "Lecture Video")
            logger.info(f"Found video: {title} at {video_url}")

        # Mark search stage as 100% complete before moving to dashboard
        self.update_state(state="PROGRESS", meta={"stage": "searching_video", "progress": 100})

        # Stage 2: Index and process video with TwelveLabs
        # We provide video_url and title to the state so the frontend can start showing the dashboard
        self.update_state(state="PROGRESS", meta={
            "stage": "processing_video", 
            "progress": 40,
            "video_url": video_url,
            "title": title
        })
        
        def on_tl_progress(task, iteration):
            # Calculate a virtual progress that moves slightly each polling cycle
            # Stage 2 starts at 40, we can move it up towards 75
            v_progress = 40 + min(iteration * 2, 35) 
            self.update_state(state="PROGRESS", meta={
                "stage": "processing_video", 
                "progress": v_progress,
                "video_url": video_url,
                "title": title
            })

        try:
            twelve_labs_data = asyncio.run(
                _index_and_get_video_data(video_url, title, twelve_labs_api_key, on_tl_progress)
            )
        except Exception as e:
            logger.error(f"TwelveLabs processing failed: {str(e)}")
            twelve_labs_data = {
                "index_id": "mock_index",
                "video_id": "mock_video",
                "transcript": [
                    {"start": 0, "end": 10, "text": "Welcome to the lecture"},
                    {"start": 10, "end": 60, "text": "Today we will discuss important concepts"}
                ],
                "key_concepts": [
                    {"label": "Foundational Concept", "timestamp": 10}
                ]
            }
        
        # Stage 3: Generate notes and extract resources with Gemini
        logger.info(f"TwelveLabs stage complete. index_id={twelve_labs_data.get('index_id')}, transcript_len={len(twelve_labs_data.get('transcript', []))}")
        self.update_state(state="PROGRESS", meta={
            "stage": "generating_notes",
            "progress": 80,
            "video_url": video_url,
            "title": title,
            "index_id": twelve_labs_data.get("index_id"),
            "video_id": twelve_labs_data.get("video_id"),
            "key_concepts": twelve_labs_data.get("key_concepts", []),
        })

        gemini_service = get_gemini_service(api_key=gemini_api_key)
        logger.info("Calling Gemini for lecture notes...")

        notes_result = asyncio.run(
            gemini_service.generate_lecture_notes(
                twelve_labs_data,
                title,
                persona=persona,
                summary_length=summary_length
            )
        )

        # Use TwelveLabs Search API to find timestamps for Gemini's key topics
        key_topics = notes_result.get("key_topics", [])
        index_id = twelve_labs_data.get("index_id")
        video_id = twelve_labs_data.get("video_id")
        is_mock = index_id in (None, "mock_index")

        if key_topics and not is_mock:
            self.update_state(state="PROGRESS", meta={
                "stage": "searching_moments",
                "progress": 85,
                "video_url": video_url,
                "title": title,
                "index_id": index_id,
                "video_id": video_id,
                "key_concepts": [],
                "lecture_notes": {"markdown_content": notes_result.get("markdown_content", ""), "external_resources": []}
            })
            logger.info(f"Searching TwelveLabs for {len(key_topics)} key topics...")
            try:
                tl_search_service = get_twelve_labs_service(api_key=twelve_labs_api_key)
                key_moments = asyncio.run(
                    tl_search_service.generate_key_moments(index_id, video_id, key_topics)
                )
                logger.info(f"TwelveLabs search returned {len(key_moments)} key moments")
                if key_moments:
                    twelve_labs_data["key_concepts"] = key_moments
                else:
                    logger.warning("TwelveLabs search returned no results; key_concepts left empty")
                    twelve_labs_data["key_concepts"] = []
            except Exception as e:
                logger.error(f"TwelveLabs key moment search failed: {e}")
                twelve_labs_data["key_concepts"] = []
            
            # Update state with the found moments immediately
            self.update_state(state="PROGRESS", meta={
                "stage": "generating_notes",
                "progress": 90,
                "video_url": video_url,
                "title": title,
                "index_id": index_id,
                "video_id": video_id,
                "key_concepts": twelve_labs_data.get("key_concepts", []),
                "lecture_notes": {"markdown_content": notes_result.get("markdown_content", ""), "external_resources": []}
            })
        else:
            if is_mock:
                logger.info("Mock TwelveLabs data — skipping search for key moments")
            else:
                logger.info("Gemini returned no key topics; skipping TwelveLabs search")
            twelve_labs_data["key_concepts"] = []

        # Extract resources using research queries from Gemini (hard 60s wall-clock timeout)
        self.update_state(state="PROGRESS", meta={
            "stage": "generating_notes", 
            "progress": 92,
            "video_url": video_url,
            "title": title,
            "index_id": index_id,
            "video_id": video_id,
            "key_concepts": twelve_labs_data.get("key_concepts", []),
            "lecture_notes": {"markdown_content": notes_result.get("markdown_content", ""), "external_resources": []}
        })
        research_queries = notes_result.get("research_queries", [])
        try:
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(
                    asyncio.run,
                    gemini_service.extract_resources(research_queries)
                )
                external_resources = future.result(timeout=60)
        except Exception as e:
            logger.warning(f"Resource extraction skipped: {e}")
            external_resources = []

        self.update_state(state="PROGRESS", meta={
            "stage": "generating_notes", 
            "progress": 98,
            "video_url": video_url,
            "title": title,
            "index_id": index_id,
            "video_id": video_id,
            "key_concepts": twelve_labs_data.get("key_concepts", []),
            "lecture_notes": {"markdown_content": notes_result.get("markdown_content", ""), "external_resources": external_resources}
        })
        lecture_notes = {
            "markdown_content": notes_result.get("markdown_content", ""),
            "external_resources": external_resources
        }
        
        # Final result — omit raw transcript (frontend only needs key_concepts)
        return {
            "id": task_id,
            "video_url": video_url,
            "title": title,
            "index_id": twelve_labs_data.get("index_id"),
            "video_id": twelve_labs_data.get("video_id"),
            "twelve_labs_data": {"key_concepts": twelve_labs_data.get("key_concepts", [])},
            "lecture_notes": lecture_notes
        }
    
    except Exception as e:
        logger.error(f"Pipeline failed: {str(e)}", exc_info=True)
        raise


async def _index_and_get_video_data(video_url: str, title: str, api_key: str = None, on_progress: callable = None):
    """
    Index a video on TwelveLabs and extract transcript/concepts using the SDK.
    Checks MongoDB cache first to avoid re-indexing the same video URL.
    """
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.core.config import settings

    cache_key = video_url.strip()

    # Check cache in MongoDB (Celery workers don't share the FastAPI db connection)
    mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
    cache_col = mongo_client[settings.DATABASE_NAME].video_cache
    try:
        cached = await cache_col.find_one({"video_url": cache_key})
        if cached:
            logger.info(f"Cache hit for {video_url} — skipping TwelveLabs indexing")
            cached.pop("_id", None)
            cached.pop("video_url", None)
            mongo_client.close()
            return cached
    except Exception:
        raise
    finally:
        mongo_client.close()

    # Not cached — index with TwelveLabs
    service = get_twelve_labs_service(api_key=api_key)
    try:
        logger.info(f"Submitting video for indexing: {video_url}")
        task_id = await service.submit_video_for_indexing(video_url, title)
        logger.info(f"Video submitted with task_id: {task_id}")

        logger.info(f"Polling TwelveLabs for indexing completion...")
        task_info = await service.poll_until_indexed(task_id, max_attempts=300, poll_interval=2, on_progress=on_progress)
        logger.info(f"Indexing complete for video: {task_info.get('video_id')}")

        logger.info(f"Extracting video data...")
        twelve_labs_data = await service.get_video_data(task_info)

        result = twelve_labs_data.model_dump()
        result["index_id"] = task_info.get("index_id")
        result["video_id"] = task_info.get("video_id")

        # Save to cache for future requests
        mongo_client2 = AsyncIOMotorClient(settings.MONGODB_URL)
        try:
            await mongo_client2[settings.DATABASE_NAME].video_cache.insert_one(
                {"video_url": cache_key, **result}
            )
            logger.info(f"Cached TwelveLabs result for {video_url}")
        except Exception as cache_err:
            logger.warning(f"Failed to cache video result: {cache_err}")
        finally:
            mongo_client2.close()

        return result

    finally:
        await service.close()
