import os
import logging
from typing import Optional, AsyncGenerator
from elevenlabs.client import AsyncElevenLabs
from app.core.config import settings

logger = logging.getLogger(__name__)

class ElevenLabsService:
    """Service for handling text-to-speech with ElevenLabs"""
    
    def __init__(self):
        self.client = None
        if settings.ELEVEN_LABS_API_KEY:
            self.client = AsyncElevenLabs(api_key=settings.ELEVEN_LABS_API_KEY)
        else:
            logger.warning("ELEVEN_LABS_API_KEY not found in settings")

    async def generate_speech_stream(
        self, 
        text: str, 
        voice_id: str = "21m00Tcm4TlvDq8ikWAM", # Standard "Rachel" voice
        model_id: str = "eleven_multilingual_v2",
        api_key: Optional[str] = None
    ) -> AsyncGenerator[bytes, None]:
        """
        Generates speech for the given text and returns an async generator of audio chunks.
        """
        # Use provided api_key if available, otherwise use global client
        client = None
        if api_key:
            client = AsyncElevenLabs(api_key=api_key)
        else:
            client = self.client
            
        if not client:
            logger.error("ElevenLabs client not initialized - missing API key")
            raise ValueError("ElevenLabs client not initialized. Check API key.")
        
        try:
            logger.info(f"Generating speech for text: {text[:50]}...")
            
            # The current SDK convert_as_stream returns an AsyncIterator[bytes]
            audio_stream = await client.text_to_speech.convert_as_stream(
                voice_id=voice_id,
                text=text,
                model_id=model_id,
            )
            
            async for chunk in audio_stream:
                if chunk:
                    yield chunk
                    
        except Exception as e:
            logger.error(f"ElevenLabs TTS error: {str(e)}")
            raise e

# Global service instance
_service: Optional[ElevenLabsService] = None

def get_eleven_labs_service() -> ElevenLabsService:
    """Get or create the ElevenLabs service"""
    global _service
    if _service is None:
        _service = ElevenLabsService()
    return _service
