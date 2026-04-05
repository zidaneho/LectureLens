from browser_use import Agent, ChatBrowserUse, BrowserProfile
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings
import logging
import asyncio
import json

logger = logging.getLogger(__name__)

class BrowserUseService:
    def __init__(self, google_api_key: str = settings.GOOGLE_API_KEY, browser_use_api_key: str = settings.BROWSER_USE_API_KEY):
        if browser_use_api_key:
            logger.info("Using BROWSER_USE_API_KEY with ChatBrowserUse.")
            self.llm = ChatBrowserUse(api_key=browser_use_api_key)
        elif google_api_key:
            logger.info("Using GOOGLE_API_KEY with ChatGoogleGenerativeAI.")
            self.llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=google_api_key)
        else:
            logger.warning("Neither BROWSER_USE_API_KEY nor GOOGLE_API_KEY set. Browser Use will be mocked.")
            self.llm = None
        
        self.browser_profile = BrowserProfile(
            headless=settings.BROWSER_USE_HEADLESS,
            args=["--mute-audio"]
        )

    async def search_video(self, prompt: str) -> dict:
        """
        Uses Browser Use to find a high-quality lecture video URL based on the user's prompt.
        """
        if not self.llm:
            return self._mock_video_search(prompt)

        search_instruction = f"""
        Search for a high-quality educational lecture, academic video, or informative podcast that matches this prompt: "{prompt}".
        You are not limited to YouTube; you can search on MIT OpenCourseWare, Coursera, academic university sites, or general educational platforms.
        Find the best, most comprehensive video available, navigate to its page, and extract:
        1. The absolute URL to the video or the page hosting it.
        2. The full title of the video.
        
        Return ONLY a JSON object with 'video_url' and 'title'. No markdown code blocks.
        """

        try:
            agent = Agent(
                task=search_instruction,
                llm=self.llm,
                browser_profile=self.browser_profile
            )
            
            result = await agent.run()
            # The agent.run() result is an AgentHistoryList object.
            # We can extract the final result from it.
            final_result = result.final_result()
            logger.info(f"Browser Use Raw Result: {final_result}")
            
            if not final_result:
                 logger.warning("Browser Use returned empty result.")
                 return self._mock_video_search(prompt)

            # Try to parse JSON from the final result string
            try:
                # Cleaning if LLM adds markdown
                clean_result = final_result.strip()
                if "```json" in clean_result:
                    clean_result = clean_result.split("```json")[1].split("```")[0].strip()
                elif "```" in clean_result:
                    clean_result = clean_result.split("```")[1].split("```")[0].strip()
                
                logger.info(f"Cleaned Result for JSON parsing: {clean_result}")
                
                # Check for URLs if it's not strictly JSON
                if "http" in clean_result and "{" not in clean_result:
                    import re
                    match = re.search(r'https?://[^\s<>"]+|www\.[^\s<>"]+', clean_result)
                    if match:
                        found_url = match.group(0)
                        logger.info(f"Extracted URL via regex: {found_url}")
                        return {
                            "video_url": found_url,
                            "title": f"Lecture on {prompt}"
                        }

                parsed_data = json.loads(clean_result)
                video_url = parsed_data.get("video_url", "")
                logger.info(f"Parsed Video URL from JSON: {video_url}")
                return {
                    "video_url": video_url,
                    "title": parsed_data.get("title", f"Lecture on {prompt}")
                }
            except json.JSONDecodeError:
                # If it's not JSON, it might just be the URL or contain it
                import re
                match = re.search(r'https?://[^\s<>"]+|www\.[^\s<>"]+', final_result)
                if match:
                    return {
                        "video_url": match.group(0),
                        "title": f"Lecture on {prompt}"
                    }
                
                logger.warning(f"Failed to parse JSON or find URL from Browser Use: {final_result}")
                return self._mock_video_search(prompt)

        except Exception as e:
            logger.error(f"Browser Use video search failed: {str(e)}")
            return self._mock_video_search(prompt)

    async def extract_resources(self, research_queries: list) -> list:
        """
        Uses Browser Use to find supplementary research papers, articles, or exercises.
        """
        if not self.llm or not research_queries:
            return []

        resources = []
        for query in research_queries:
            instruction = f"""
            Search for high-quality academic or educational resources (papers, articles, exercises) for the topic: "{query}".
            Start by using a general search engine like DuckDuckGo or Google, or go to academic repositories like arXiv or MIT OpenCourseWare.
            Find one excellent resource and extract:
            1. The title of the resource.
            2. The absolute URL to the resource.
            3. A short type label (e.g., 'paper', 'article', 'exercise').
            
            Return ONLY a JSON object with 'title', 'url', and 'type'. No markdown code blocks.
            """
            
            try:
                agent = Agent(
                    task=instruction,
                    llm=self.llm,
                    browser_profile=self.browser_profile
                )
                result = await agent.run()
                final_result = result.final_result()
                
                if final_result:
                    clean_result = final_result.strip()
                    if "```json" in clean_result:
                        clean_result = clean_result.split("```json")[1].split("```")[0].strip()
                    elif "```" in clean_result:
                        clean_result = clean_result.split("```")[1].split("```")[0].strip()
                    
                    try:
                        parsed_data = json.loads(clean_result)
                        resources.append({
                            "title": parsed_data.get("title", f"Resource for {query}"),
                            "url": parsed_data.get("url", ""),
                            "type": parsed_data.get("type", "article")
                        })
                    except json.JSONDecodeError:
                        # Try finding a URL
                        import re
                        match = re.search(r'https?://[^\s<>"]+|www\.[^\s<>"]+', clean_result)
                        if match:
                             resources.append({
                                "title": f"Resource for {query}",
                                "url": match.group(0),
                                "type": "article"
                            })

            except Exception as e:
                logger.error(f"Browser Use resource extraction failed for {query}: {str(e)}")
        
        return resources

    def _mock_video_search(self, prompt: str) -> dict:
        return {
            "video_url": "https://www.youtube.com/watch?v=k6U-i4gXJR8", # MIT OpenCourseWare Quantum Physics
            "title": f"Introduction to {prompt} (MIT OpenCourseWare)"
        }

_service = None

def get_browser_use_service():
    global _service
    if _service is None:
        _service = BrowserUseService()
    return _service
