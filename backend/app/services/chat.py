"""
Chat service for answering questions about videos.

Uses TwelveLabs Search API to find relevant video moments and Gemini to generate responses.
"""

import asyncio
import logging
from typing import Optional, Dict, Any
from app.services.twelve_labs import get_twelve_labs_service
from app.services.gemini import get_gemini_service
from app.core.config import settings

logger = logging.getLogger(__name__)


class ChatService:
    """Service for handling chat interactions about videos"""

    def __init__(self, gemini_api_key: str = None, twelve_labs_api_key: str = None):
        self.twelve_labs = get_twelve_labs_service(api_key=twelve_labs_api_key or settings.TWELVE_LABS_API_KEY)
        self.gemini = get_gemini_service(api_key=gemini_api_key or settings.GOOGLE_API_KEY)
    
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
        """
        try:
            timestamp = None
            matches = []

            # Only search TwelveLabs if both IDs are available
            if index_id and video_id:
                search_results = await self.twelve_labs.search_video(index_id, message, video_id)
                matches = self._extract_matches(search_results, transcript)
                if matches:
                    # Pick the best timestamp (first one) to return as a primary reference
                    timestamp = matches[0].get("timestamp")

            # Generate response using Gemini
            response_text = await self._generate_response(
                message,
                matches,
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
    
    def _extract_matches(
        self,
        search_results: Dict[str, Any],
        transcript: Optional[list] = None
    ) -> list:
        """
        Extract the best matching segments from search results.
        
        Returns: list of {"timestamp": float, "text": str}
        """
        matches = []
        if isinstance(search_results, dict):
            data = search_results.get("data", [])
            if not data:
                return []
            
            # Get the top matches (up to 5)
            top_data = data[:5] if isinstance(data, list) else [data]
            
            for item in top_data:
                timestamp = item.get("start") or item.get("start_time") or 0
                text = item.get("text", "")
                
                # If text is empty, try to find it in transcript
                if not text and transcript:
                    text = self._find_transcript_text(timestamp, transcript)
                
                matches.append({
                    "timestamp": timestamp,
                    "text": text
                })
        
        return matches
    
    def _find_transcript_text(self, timestamp: float, transcript: list) -> str:
        """Find transcript text at or near a given timestamp"""
        for segment in transcript:
            # Handle both dict and object (Pydantic model)
            start = segment.get("start", 0) if isinstance(segment, dict) else getattr(segment, "start", 0)
            end = segment.get("end", 0) if isinstance(segment, dict) else getattr(segment, "end", 0)
            text = segment.get("text", "") if isinstance(segment, dict) else getattr(segment, "text", "")
            
            if start <= timestamp <= end:
                return text
        return ""
    
    async def _generate_response(
        self,
        user_message: str,
        matches: list,
        persona: str = "default"
    ) -> str:
        """
        Generate a response using Gemini based on the user's question and relevant video segments.
        """
        if not self.gemini.model:
            raise RuntimeError("Gemini API key is not configured. Please add your Gemini API key in Settings.")

        # Build persona instruction
        if persona == "spongebob":
            persona_instruction = "Respond in the enthusiastic and optimistic style of SpongeBob SquarePants, but keep the information accurate."
        else:
            persona_instruction = "Respond in a clear, helpful, and educational tone."

        context_parts = []
        if matches:
            context_parts.append("Relevant content from the lecture video (with timestamps):")
            for m in matches:
                ts = m.get("timestamp", 0)
                text = m.get("text", "")
                # Format timestamp as MM:SS
                mins = int(ts // 60)
                secs = int(ts % 60)
                ts_str = f"{mins}:{secs:02d}"
                context_parts.append(f"- [{ts_str}] ({ts} seconds): {text}")

        video_context = "\n".join(context_parts) if context_parts else ""

        prompt = f"""You are a helpful AI tutor assistant. Answer the user's question clearly and thoroughly.

{video_context}

{persona_instruction}
When mentioning specific information from the video, you MUST reference the timestamp in brackets, e.g., [03:45].

User: {user_message}
Assistant:"""

        try:
            response = await asyncio.to_thread(self.gemini.model.generate_content, prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini generation error: {str(e)}")
            raise RuntimeError(f"Gemini API error: {str(e)}")

    def _mock_response(self, user_message: str, matches: list) -> str:
        """Fallback mock response"""
        relevant_text = matches[0].get("text", "") if matches else "The video covers this topic."
        return f"Based on the video, regarding your question '{user_message}': {relevant_text}"


# Global service instance
_service: Optional[ChatService] = None


def get_chat_service() -> ChatService:
    """Get or create the chat service"""
    global _service
    if _service is None:
        _service = ChatService()
    return _service
