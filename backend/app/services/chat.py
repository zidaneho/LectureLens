"""
Chat service for answering questions about videos.

Uses TwelveLabs Search API to find relevant video moments and Gemini to generate responses.
"""

import logging
from typing import Optional, Dict, Any
from app.services.twelve_labs import get_twelve_labs_service
from app.services.gemini import get_gemini_service

logger = logging.getLogger(__name__)


class ChatService:
    """Service for handling chat interactions about videos"""
    
    def __init__(self):
        self.twelve_labs = get_twelve_labs_service()
        self.gemini = get_gemini_service()
    
    async def chat(
        self,
        index_id: str,
        video_id: str,
        message: str,
        transcript: Optional[list] = None,
        persona: str = "default"
    ) -> Dict[str, Any]:
        """
        Process a chat message and return a response with video timestamp.
        
        Args:
            index_id: TwelveLabs index ID
            video_id: TwelveLabs video ID
            message: User's question or message
            transcript: Optional transcript segments for context
            persona: Persona for response style (default, spongebob, etc.)
        
        Returns: Dictionary with response_text, timestamp, and optional audio_url
        """
        try:
            # Search the video for relevant moments, filtering by video_id
            search_results = await self.twelve_labs.search_video(index_id, message, video_id)
            
            # Extract the best matching moment and its timestamp
            timestamp, relevant_text = self._extract_best_match(search_results, transcript)
            
            # Generate response using Gemini
            response_text = await self._generate_response(
                message, 
                relevant_text, 
                persona
            )
            
            return {
                "response_text": response_text,
                "timestamp": timestamp,
                "audio_url": None
            }
        except Exception as e:
            logger.error(f"Chat error: {str(e)}")
            # Fallback response
            return {
                "response_text": f"I encountered an error processing your question: {str(e)}",
                "timestamp": None,
                "audio_url": None
            }
    
    def _extract_best_match(
        self,
        search_results: Dict[str, Any],
        transcript: Optional[list] = None
    ) -> tuple:
        """
        Extract the best matching segment from search results.
        
        Returns: (timestamp, relevant_text)
        """
        # Parse search results - structure may vary
        if isinstance(search_results, dict):
            data = search_results.get("data", [])
            if not data:
                return None, ""
            
            # Get the first/best match
            if isinstance(data, list) and len(data) > 0:
                best_match = data[0]
            else:
                best_match = data
            
            # Extract timestamp and text
            timestamp = best_match.get("start") or best_match.get("start_time") or 0
            text = best_match.get("text", "")
            
            # If text is empty, try to find it in transcript
            if not text and transcript:
                text = self._find_transcript_text(timestamp, transcript)
            
            return timestamp, text
        
        return None, ""
    
    def _find_transcript_text(self, timestamp: float, transcript: list) -> str:
        """Find transcript text at or near a given timestamp"""
        for segment in transcript:
            if segment.get("start", 0) <= timestamp <= segment.get("end", 0):
                return segment.get("text", "")
        return ""
    
    async def _generate_response(
        self,
        user_message: str,
        relevant_text: str,
        persona: str = "default"
    ) -> str:
        """
        Generate a response using Gemini based on the user's question and relevant video segment.
        
        Args:
            user_message: The user's question
            relevant_text: Relevant text from the video
            persona: Response persona
        
        Returns: Generated response text
        """
        if not self.gemini.model:
            return self._mock_response(user_message, relevant_text)
        
        # Build persona instruction
        persona_instruction = ""
        if persona == "spongebob":
            persona_instruction = "Respond in the enthusiastic and optimistic style of SpongeBob SquarePants, but keep the information accurate."
        else:
            persona_instruction = "Respond in a clear, professional, and educational tone."
        
        prompt = f"""You are an AI tutor helping students understand lecture content.

User's question: {user_message}

Relevant content from the video:
{relevant_text}

{persona_instruction}

Please provide a clear, concise answer to the user's question based on the video content provided. Keep your response to 2-3 sentences."""
        
        try:
            response = self.gemini.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini generation error: {str(e)}")
            return self._mock_response(user_message, relevant_text)
    
    def _mock_response(self, user_message: str, relevant_text: str) -> str:
        """Fallback mock response"""
        return f"Based on the video, regarding your question '{user_message}': {relevant_text if relevant_text else 'The video covers this topic.'}"


# Global service instance
_service: Optional[ChatService] = None


def get_chat_service() -> ChatService:
    """Get or create the chat service"""
    global _service
    if _service is None:
        _service = ChatService()
    return _service
