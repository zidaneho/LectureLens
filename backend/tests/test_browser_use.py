import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.browser_use_service import BrowserUseService

@pytest.fixture
def browser_service():
    # Provide a dummy API key to avoid mock mode in __init__
    return BrowserUseService(browser_use_api_key="dummy_key")

@pytest.mark.asyncio
async def test_search_video_success(browser_service):
    # Mocking Agent and BrowserProfile
    with patch("app.services.browser_use_service.Agent") as mock_agent_class, \
         patch("app.services.browser_use_service.ChatBrowserUse") as mock_llm_class, \
         patch("app.services.browser_use_service.BrowserProfile") as mock_profile_class:
        
        mock_agent_instance = mock_agent_class.return_value
        # Mocking agent.run() to return an object with final_result()
        mock_run_result = MagicMock()
        mock_run_result.final_result.return_value = '{"video_url": "https://youtube.com/watch?v=123", "title": "Test Lecture"}'
        mock_agent_instance.run = AsyncMock(return_value=mock_run_result)

        result = await browser_service.search_video("machine learning")
        
        assert result["video_url"] == "https://youtube.com/watch?v=123"
        assert result["title"] == "Test Lecture"
        assert mock_agent_class.called

@pytest.mark.asyncio
async def test_search_video_fallback(browser_service):
    with patch("app.services.browser_use_service.Agent") as mock_agent_class, \
         patch("app.services.browser_use_service.ChatBrowserUse") as mock_llm_class, \
         patch("app.services.browser_use_service.BrowserProfile") as mock_profile_class:
        
        mock_agent_instance = mock_agent_class.return_value
        mock_run_result = MagicMock()
        # Return plain URL instead of JSON
        mock_run_result.final_result.return_value = 'https://youtube.com/watch?v=456'
        mock_agent_instance.run = AsyncMock(return_value=mock_run_result)

        result = await browser_service.search_video("robotics")
        
        assert result["video_url"] == "https://youtube.com/watch?v=456"
        assert result["title"] == "Lecture on robotics"

@pytest.mark.asyncio
async def test_extract_resources(browser_service):
    with patch("app.services.browser_use_service.Agent") as mock_agent_class, \
         patch("app.services.browser_use_service.ChatBrowserUse") as mock_llm_class, \
         patch("app.services.browser_use_service.BrowserProfile") as mock_profile_class:
        
        mock_agent_instance = mock_agent_class.return_value
        mock_run_result = MagicMock()
        mock_run_result.final_result.return_value = '{"title": "Paper 1", "url": "https://arxiv.org/1", "type": "paper"}'
        mock_agent_instance.run = AsyncMock(return_value=mock_run_result)

        resources = await browser_service.extract_resources(["deep learning"])
        
        assert len(resources) == 1
        assert resources[0]["title"] == "Paper 1"
        assert resources[0]["type"] == "paper"

@pytest.mark.asyncio
async def test_browser_use_mock_mode():
    # Test initialization without API key
    service = BrowserUseService(google_api_key=None, browser_use_api_key=None)
    result = await service.search_video("test")
    assert "k6U-i4gXJR8" in result["video_url"]
