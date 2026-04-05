from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat import get_chat_service
from app.services.eleven_labs import get_eleven_labs_service
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


@router.post("/tts")
async def text_to_speech(request: dict):
    """
    Generate speech from text using ElevenLabs.
    """
    text = request.get("text")
    api_key = request.get("api_key")
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    
    eleven_labs = get_eleven_labs_service()
    
    try:
        # Generate speech generator
        speech_gen = eleven_labs.generate_speech_stream(text, api_key=api_key)
        
        # Return as a streaming response
        return StreamingResponse(
            speech_gen,
            media_type="audio/mpeg"
        )
    except Exception as e:
        logger.error(f"TTS endpoint error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate speech: {str(e)}"
        )
