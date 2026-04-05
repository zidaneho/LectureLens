from fastapi import APIRouter, HTTPException, Depends
from app.schemas.video import VideoSearchRequest, TaskStatusResponse
from app.tasks import process_video_pipeline
from celery.result import AsyncResult
import uuid

router = APIRouter()

from app.routes.user import get_current_user

@router.post("/search-video", status_code=202)
async def search_video(
    request: VideoSearchRequest, 
    current_user: dict = Depends(get_current_user)
):
    task_id = str(uuid.uuid4())
    
    # Extract preferences from current_user
    preferences = current_user.get("preferences", {})

    # Extract optional video_url and title from context
    video_url = None
    title = None
    if request.context:
        video_url = request.context.get("video_url")
        title = request.context.get("title")
    
    # Delay the task to run in the background
    process_video_pipeline.apply_async(
        args=[task_id, request.prompt, video_url, title, preferences],
        task_id=task_id
    )
    return {
        "task_id": task_id,
        "status": "pending",
        "message": "Search initiated"
    }

@router.get("/task-status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    res = AsyncResult(task_id)
    
    if res.state == 'PENDING':
        return {
            "task_id": task_id,
            "status": "pending"
        }
    elif res.state == 'PROGRESS':
        # Provide any intermediate data from the task info (meta)
        return {
            "task_id": task_id,
            "status": "processing",
            "stage": res.info.get('stage'),
            "progress": res.info.get('progress'),
            "result": {
                "video_url": res.info.get("video_url"),
                "title": res.info.get("title")
            } if res.info.get("video_url") else None
        }
    elif res.state == 'SUCCESS':
        return {
            "task_id": task_id,
            "status": "completed",
            "result": res.result
        }
    elif res.state == 'FAILURE':
        return {
            "task_id": task_id,
            "status": "failed",
            "message": str(res.info)
        }
    
    return {
        "task_id": task_id,
        "status": res.state
    }
