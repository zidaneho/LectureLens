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
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def generate_lecture_notes(self, twelve_labs_data: dict, title: str, persona: str = "Professor", summary_length: str = "medium") -> dict:
        """
        Engineers a system prompt to transform TwelveLabs data into structured lecture notes.
        """
        if not self.model:
            return self._mock_notes(title)

        transcript = twelve_labs_data.get("transcript", [])
        key_concepts = twelve_labs_data.get("key_concepts", [])

        # Format transcript and concepts for the prompt
        transcript_text = "\n".join([f"[{t['start']}-{t['end']}s]: {t['text']}" for t in transcript])
        concepts_text = "\n".join([f"- {c['label']} at {c['timestamp']}s" for c in key_concepts])

        length_instruction = {
            "short": "concise and high-level (approx 300 words)",
            "medium": "standard and balanced (approx 800 words)",
            "long": "extremely detailed and comprehensive (approx 1500+ words)"
        }.get(summary_length, "balanced")

        prompt = f"""
        You are an expert academic assistant acting as a {persona}.
        Your goal is to transform raw video transcripts and metadata into high-quality, structured lecture notes.
        
        The notes should be {length_instruction}.
        
        Video Title: {title}
        
        Transcript segments:
        {transcript_text}
        
        Key Concepts identified:
        {concepts_text}
        
        Your task:
        1. Create a well-structured markdown set of lecture notes from the perspective of a {persona}.
        2. Use clear headings, bullet points, and emphasis where appropriate.
        3. Include timestamps for key sections so the user can refer back to the video.
        4. Synthesize the transcript into logical themes.
        5. Identify 2-3 specific topics that would benefit from further research (supplementary resources).
        
        Format your response as a JSON object with the following structure:
        {{
            "markdown_content": "Full markdown lecture notes here...",
            "research_queries": ["query 1", "query 2"]
        }}
        """

        try:
            response = self.model.generate_content(prompt)
            # Find the JSON part in the response (sometimes Gemini adds markdown code blocks)
            text = response.text
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(text)
            return {
                "markdown_content": result.get("markdown_content", ""),
                "research_queries": result.get("research_queries", [])
            }
        except Exception as e:
            logger.error(f"Gemini note generation failed: {str(e)}")
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
            "research_queries": [title]
        }

def get_gemini_service(api_key: str = None):
    """Get or create the Gemini service"""
    return GeminiService(api_key=api_key or settings.GOOGLE_API_KEY)
