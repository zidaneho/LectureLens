"""
Test suite for chat endpoint and ChatService.

Tests cover:
- Chat endpoint validation
- TwelveLabs search integration
- Gemini response generation
- Error handling
- Persona support
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from app.services.chat import ChatService, get_chat_service


class TestChatEndpoint:
    """Tests for the /api/chat endpoint"""
    
    def test_chat_success(self, client: TestClient):
        """Test successful chat request"""
        with patch("app.routes.chat.get_chat_service") as mock_get_service:
            mock_service = AsyncMock()
            mock_service.chat.return_value = {
                "response_text": "This is about quantum computing at 120 seconds.",
                "timestamp": 120.0,
                "audio_url": None
            }
            mock_get_service.return_value = mock_service
            
            payload = {
                "video_id": "test-video-123",
                "message": "What is superposition?",
                "persona": "default"
            }
            response = client.post("/api/chat", json=payload)
            
            assert response.status_code == 200
            data = response.json()
            assert "response_text" in data
            assert data["response_text"] == "This is about quantum computing at 120 seconds."
            assert data["timestamp"] == 120.0
            assert mock_service.chat.called
    
    def test_chat_with_spongebob_persona(self, client: TestClient):
        """Test chat with SpongeBob persona"""
        with patch("app.routes.chat.get_chat_service") as mock_get_service:
            mock_service = AsyncMock()
            mock_service.chat.return_value = {
                "response_text": "Ahahaha! That's GREAT! Superposition is...",
                "timestamp": 100.0,
                "audio_url": None
            }
            mock_get_service.return_value = mock_service
            
            payload = {
                "video_id": "test-video-123",
                "message": "Explain superposition",
                "persona": "spongebob"
            }
            response = client.post("/api/chat", json=payload)
            
            assert response.status_code == 200
            data = response.json()
            assert "response_text" in data
            mock_service.chat.assert_called_with(
                index_id="test-video-123",
                message="Explain superposition",
                persona="spongebob"
            )
    
    def test_chat_missing_video_id(self, client: TestClient):
        """Test chat request with missing video_id"""
        payload = {
            "message": "What is this about?"
        }
        response = client.post("/api/chat", json=payload)
        
        assert response.status_code == 422  # Validation error
    
    def test_chat_missing_message(self, client: TestClient):
        """Test chat request with missing message"""
        payload = {
            "video_id": "test-video-123"
        }
        response = client.post("/api/chat", json=payload)
        
        assert response.status_code == 422  # Validation error
    
    def test_chat_empty_message(self, client: TestClient):
        """Test chat request with empty message"""
        with patch("app.routes.chat.get_chat_service") as mock_get_service:
            mock_service = AsyncMock()
            mock_get_service.return_value = mock_service
            
            payload = {
                "video_id": "test-video-123",
                "message": ""
            }
            response = client.post("/api/chat", json=payload)
            
            # Should fail validation or service call
            assert response.status_code in [400, 422, 500]
    
    def test_chat_service_error(self, client: TestClient):
        """Test handling of service errors"""
        with patch("app.routes.chat.get_chat_service") as mock_get_service:
            mock_service = AsyncMock()
            mock_service.chat.side_effect = Exception("TwelveLabs API error")
            mock_get_service.return_value = mock_service
            
            payload = {
                "video_id": "test-video-123",
                "message": "What about quantum?"
            }
            response = client.post("/api/chat", json=payload)
            
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data


class TestChatService:
    """Tests for the ChatService class"""
    
    @pytest.mark.asyncio
    async def test_chat_with_search_results(self):
        """Test chat method with successful TwelveLabs search"""
        service = ChatService()
        
        with patch.object(service.twelve_labs, "search_video") as mock_search, \
             patch.object(service, "_generate_response") as mock_generate:
            
            mock_search.return_value = {
                "data": [{
                    "start": 120.0,
                    "text": "Superposition is a quantum property..."
                }]
            }
            mock_generate.return_value = "Superposition explains quantum behavior..."
            
            result = await service.chat(
                index_id="test-index",
                message="What is superposition?",
                persona="default"
            )
            
            assert result["response_text"] == "Superposition explains quantum behavior..."
            assert result["timestamp"] == 120.0
            assert mock_search.called
            assert mock_generate.called
    
    @pytest.mark.asyncio
    async def test_chat_search_failure(self):
        """Test chat handling when search fails"""
        service = ChatService()
        
        with patch.object(service.twelve_labs, "search_video") as mock_search:
            mock_search.side_effect = Exception("API failure")
            
            result = await service.chat(
                index_id="test-index",
                message="Test question?"
            )
            
            assert "response_text" in result
            assert "error" in result["response_text"].lower()
    
    def test_extract_best_match_from_list(self):
        """Test extracting timestamp and text from search results"""
        service = ChatService()
        
        search_results = {
            "data": [
                {
                    "start": 120.0,
                    "text": "First match"
                },
                {
                    "start": 200.0,
                    "text": "Second match"
                }
            ]
        }
        
        timestamp, text = service._extract_best_match(search_results)
        
        assert timestamp == 120.0
        assert text == "First match"
    
    def test_extract_best_match_with_alternative_fields(self):
        """Test extracting from results with different field names"""
        service = ChatService()
        
        search_results = {
            "data": [{
                "start_time": 150.0,
                "text": "Alternative field names"
            }]
        }
        
        timestamp, text = service._extract_best_match(search_results)
        
        assert timestamp == 150.0
        assert text == "Alternative field names"
    
    def test_extract_best_match_empty_results(self):
        """Test extracting from empty search results"""
        service = ChatService()
        
        search_results = {"data": []}
        
        timestamp, text = service._extract_best_match(search_results)
        
        assert timestamp is None
        assert text == ""
    
    def test_find_transcript_text_within_segment(self):
        """Test finding transcript text at a specific timestamp"""
        service = ChatService()
        
        transcript = [
            {"start": 0, "end": 10, "text": "Introduction"},
            {"start": 10, "end": 50, "text": "Main topic"},
            {"start": 50, "end": 100, "text": "Conclusion"}
        ]
        
        result = service._find_transcript_text(25.0, transcript)
        
        assert result == "Main topic"
    
    def test_find_transcript_text_not_found(self):
        """Test when transcript text is not found"""
        service = ChatService()
        
        transcript = [
            {"start": 0, "end": 10, "text": "Introduction"},
            {"start": 50, "end": 100, "text": "Conclusion"}
        ]
        
        result = service._find_transcript_text(25.0, transcript)
        
        assert result == ""
    
    @pytest.mark.asyncio
    async def test_generate_response_with_gemini(self):
        """Test response generation with Gemini"""
        service = ChatService()
        
        mock_model = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "Quantum mechanics is fascinating!"
        mock_model.generate_content.return_value = mock_response
        service.gemini.model = mock_model
        
        result = await service._generate_response(
            "What is quantum mechanics?",
            "Quantum mechanics is the study of atomic behavior."
        )
        
        assert result == "Quantum mechanics is fascinating!"
        assert mock_model.generate_content.called
    
    @pytest.mark.asyncio
    async def test_generate_response_spongebob_persona(self):
        """Test response generation with SpongeBob persona"""
        service = ChatService()
        
        mock_model = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "Ahahaha! I'm ready!"
        mock_model.generate_content.return_value = mock_response
        service.gemini.model = mock_model
        
        await service._generate_response(
            "Explain this",
            "Some content",
            persona="spongebob"
        )
        
        # Verify persona instruction was included
        call_args = mock_model.generate_content.call_args[0][0]
        assert "SpongeBob" in call_args or "spongebob" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_generate_response_no_model(self):
        """Test response generation when Gemini model is unavailable"""
        service = ChatService()
        service.gemini.model = None
        
        result = await service._generate_response(
            "Test question?",
            "Test content"
        )
        
        # Should return mock response
        assert isinstance(result, str)
        assert len(result) > 0
    
    @pytest.mark.asyncio
    async def test_generate_response_gemini_error(self):
        """Test error handling in response generation"""
        service = ChatService()
        
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = Exception("API error")
        service.gemini.model = mock_model
        
        result = await service._generate_response(
            "Question",
            "Content"
        )
        
        # Should return fallback response
        assert isinstance(result, str)
        assert "Based on the video" in result or len(result) > 0


class TestTwelveLabsSearchIntegration:
    """Tests for TwelveLabs search integration"""
    
    @pytest.mark.asyncio
    async def test_twelve_labs_search(self):
        """Test TwelveLabs search method"""
        from app.services.twelve_labs import TwelveLabsService
        
        service = TwelveLabsService()
        service.api_key = "test-key"
        
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "data": [
                    {
                        "start": 120.0,
                        "text": "Found content"
                    }
                ]
            }
            mock_post.return_value = mock_response
            
            await service.get_client()
            result = await service.search_video("test-index", "test query")
            
            assert result["data"][0]["text"] == "Found content"
    
    @pytest.mark.asyncio
    async def test_twelve_labs_search_error(self):
        """Test TwelveLabs search error handling"""
        from app.services.twelve_labs import TwelveLabsService
        
        service = TwelveLabsService()
        service.api_key = "test-key"
        
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 400
            mock_response.text = "Bad request"
            mock_post.return_value = mock_response
            
            await service.get_client()
            
            with pytest.raises(Exception):
                await service.search_video("test-index", "test query")


class TestChatServiceIntegration:
    """Integration tests combining multiple components"""
    
    @pytest.mark.asyncio
    async def test_full_chat_flow(self):
        """Test complete chat flow from request to response"""
        service = ChatService()
        
        with patch.object(service.twelve_labs, "search_video") as mock_search, \
             patch.object(service.gemini, "model") as mock_model:
            
            mock_search.return_value = {
                "data": [{
                    "start": 150.0,
                    "text": "Quantum entanglement is a phenomenon..."
                }]
            }
            
            mock_response = MagicMock()
            mock_response.text = "Entanglement is when particles are correlated."
            mock_model.generate_content.return_value = mock_response
            
            result = await service.chat(
                index_id="video-123",
                message="What is quantum entanglement?",
                persona="default"
            )
            
            assert result["timestamp"] == 150.0
            assert "correlated" in result["response_text"]
            assert mock_search.called
            assert mock_model.generate_content.called
