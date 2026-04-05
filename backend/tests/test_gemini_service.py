import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.services.gemini import GeminiService, get_gemini_service
import json

@pytest.mark.asyncio
async def test_generate_lecture_notes_success():
    """Test generating lecture notes with a successful Gemini response"""
    # Mock the genai model
    mock_model = MagicMock()
    mock_response = MagicMock()
    
    # Simulate a JSON response from Gemini
    expected_json = {
        "markdown_content": "# Test Lecture\n\n## Summary\nThis is a test summary.",
        "research_queries": ["test research 1", "test research 2"]
    }
    mock_response.text = json.dumps(expected_json)
    mock_model.generate_content.return_value = mock_response
    
    with patch('google.generativeai.GenerativeModel', return_value=mock_model):
        with patch('google.generativeai.configure'):
            service = GeminiService(api_key="fake-key")
            
            twelve_labs_data = {
                "transcript": [{"start": 0, "end": 10, "text": "Hello world"}],
                "key_concepts": [{"label": "Intro", "timestamp": 0}]
            }
            
            result = await service.generate_lecture_notes(twelve_labs_data, "Test Title")
            
            assert result["markdown_content"] == expected_json["markdown_content"]
            assert result["research_queries"] == expected_json["research_queries"]
            mock_model.generate_content.assert_called_once()

@pytest.mark.asyncio
async def test_generate_lecture_notes_with_markdown_blocks():
    """Test generating lecture notes when Gemini returns markdown code blocks"""
    mock_model = MagicMock()
    mock_response = MagicMock()
    
    expected_json = {
        "markdown_content": "# Test Lecture\n...",
        "research_queries": ["query 1"]
    }
    # Response wrapped in markdown JSON block
    mock_response.text = f"```json\n{json.dumps(expected_json)}\n```"
    mock_model.generate_content.return_value = mock_response
    
    with patch('google.generativeai.GenerativeModel', return_value=mock_model):
        with patch('google.generativeai.configure'):
            service = GeminiService(api_key="fake-key")
            
            result = await service.generate_lecture_notes({}, "Test Title")
            
            assert result["markdown_content"] == expected_json["markdown_content"]
            assert result["research_queries"] == expected_json["research_queries"]

@pytest.mark.asyncio
async def test_generate_lecture_notes_mock_fallback():
    """Test fallback to mock notes when no API key is provided"""
    with patch('app.core.config.settings.GOOGLE_API_KEY', ""):
        service = GeminiService(api_key="")
        
        result = await service.generate_lecture_notes({}, "Test Title")
        
        assert "# Test Title" in result["markdown_content"]
        assert "currently in mock mode" in result["markdown_content"]
        assert result["research_queries"] == ["Test Title"]

@pytest.mark.asyncio
async def test_extract_resources():
    """Test extracting resources based on research queries"""
    service = GeminiService(api_key="fake-key")
    queries = ["quantum computing", "shor's algorithm"]
    
    resources = await service.extract_resources(queries)
    
    assert len(resources) == 2
    assert resources[0]["title"] == "Study Guide for quantum computing"
    assert "quantum+computing" in resources[0]["url"]
    assert resources[1]["title"] == "Study Guide for shor's algorithm"

def test_get_gemini_service_singleton():
    """Test that get_gemini_service returns a singleton instance"""
    with patch('google.generativeai.configure'):
        s1 = get_gemini_service()
        s2 = get_gemini_service()
        assert s1 is s2
