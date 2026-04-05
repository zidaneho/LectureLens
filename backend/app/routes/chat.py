from fastapi import APIRouter, HTTPException
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat import get_chat_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint for asking questions about video content.
    
    Uses TwelveLabs Search API to find relevant moments and Gemini to generate responses.
    """
    if not request.video_id:
        raise HTTPException(status_code=400, detail="video_id is required")
    
    if not request.message:
        raise HTTPException(status_code=400, detail="message is required")
    
    chat_service = get_chat_service()
    
    try:
        result = await chat_service.chat(
            index_id=request.index_id,
            video_id=request.video_id,
            message=request.message,
            persona=request.persona or "default"
        )
        
        return ChatResponse(
            response_text=result.get("response_text", ""),
            timestamp=result.get("timestamp"),
            audio_url=result.get("audio_url")
        )
    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat message: {str(e)}"
        )
