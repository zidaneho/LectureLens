import google.generativeai as genai
from app.core.config import settings
import logging
import json

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self, api_key: str = settings.GOOGLE_API_KEY):
        if not api_key:
            logger.warning("GOOGLE_API_KEY not set. Gemini integration will be mocked.")
            self.model = None
        else:
            genai.configure(api_key=api_key, transport="rest")
            self.model = genai.GenerativeModel('gemini-flash-latest')

    async def generate_lecture_notes(self, twelve_labs_data: dict, title: str, persona: str = "Professor", summary_length: str = "medium") -> dict:
        """
        Engineers a system prompt to transform TwelveLabs data into structured lecture notes.
        """
        if not self.model:
            return self._mock_notes(title)

        transcript = twelve_labs_data.get("transcript", [])
        key_concepts = twelve_labs_data.get("key_concepts", [])

        # Cap transcript to ~500 segments to keep the prompt within Gemini's practical limits
        MAX_SEGMENTS = 500
        if len(transcript) > MAX_SEGMENTS:
            step = len(transcript) // MAX_SEGMENTS
            transcript = transcript[::step][:MAX_SEGMENTS]

        # Format transcript for the prompt
        transcript_text = "\n".join([f"[{t['start']}-{t['end']}s]: {t['text']}" for t in transcript])

        length_instruction = {
            "short": "concise and high-level (approx 300 words)",
            "medium": "standard and balanced (approx 800 words)",
            "long": "extremely detailed and comprehensive (approx 1500+ words)"
        }.get(summary_length, "balanced")

        prompt = f"""
        You are an expert academic assistant acting as a {persona}.
        Your goal is to transform raw video transcripts into high-quality, structured lecture notes.

        The notes should be {length_instruction}.

        Video Title: {title}

        Transcript segments (format: [start-end seconds]: text):
        {transcript_text}

        Your tasks:
        1. Create well-structured markdown lecture notes from the perspective of a {persona}.
           Use clear headings, bullet points, and emphasis where appropriate.
        2. Identify 5-8 key topics covered in the video — topic transitions, important concepts, or
           pivotal explanations. For each, provide a short descriptive label (3-6 words) that can be
           used as a search query to locate that moment in the video. Choose topics spread across
           the full video.
        3. Identify 2-3 specific topics that would benefit from further research.

        Output MUST be a valid JSON object with exactly this structure:
        {{
            "markdown_content": "Full markdown lecture notes here...",
            "key_topics": [
                "Introduction and overview",
                "Main algorithm explanation",
                "Example walkthrough"
            ],
            "research_queries": ["query 1", "query 2"]
        }}
        """

        try:
            # Enforce JSON mode via generation_config
            response = self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            text = response.text.strip()
            # Still handle potential markdown wrapping just in case
            if text.startswith("```json"):
                text = text.replace("```json", "", 1).rstrip("`").strip()
            elif text.startswith("```"):
                text = text.replace("```", "", 1).rstrip("`").strip()
            
            result = json.loads(text)
            return {
                "markdown_content": result.get("markdown_content", ""),
                "key_topics": result.get("key_topics", []),
                "research_queries": result.get("research_queries", [])
            }
        except Exception as e:
            logger.error(f"Gemini note generation failed: {str(e)}")
            # Fallback to a simpler prompt if JSON mode fails or if there's a parsing error
            try:
                logger.info("Retrying Gemini with simpler parameters...")
                retry_response = self.model.generate_content(prompt + "\nIMPORTANT: Return ONLY the JSON object.")
                retry_text = retry_response.text
                if "```json" in retry_text:
                    retry_text = retry_text.split("```json")[1].split("```")[0].strip()
                elif "```" in retry_text:
                    retry_text = retry_text.split("```")[1].split("```")[0].strip()
                
                result = json.loads(retry_text)
                return {
                    "markdown_content": result.get("markdown_content", ""),
                    "key_topics": result.get("key_topics", []),
                    "research_queries": result.get("research_queries", [])
                }
            except Exception as retry_e:
                logger.error(f"Gemini retry failed: {str(retry_e)}")
                return self._mock_notes(title)

    async def extract_resources(self, research_queries: list) -> list:
        """
        Finds supplementary papers/exercises based on Gemini's research queries.
        Uses Browser Use.
        """
        from app.services.browser_use_service import get_browser_use_service
        
        if not research_queries:
            return []
            
        logger.info(f"Extracting resources for: {research_queries}")
        browser_service = get_browser_use_service()
        resources = await browser_service.extract_resources(research_queries)
        
        return resources

    def _mock_notes(self, title: str) -> dict:
        return {
            "markdown_content": f"# {title}\n\n## Summary\nLecture notes generation is currently in mock mode because no API key was provided.\n\n## Key Takeaways\n- Placeholder note 1\n- Placeholder note 2",
            "key_topics": [],
            "research_queries": []
        }

def get_gemini_service(api_key: str = None):
    """Get or create the Gemini service"""
    return GeminiService(api_key=api_key or settings.GOOGLE_API_KEY)
