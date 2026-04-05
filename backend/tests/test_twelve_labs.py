"""
Tests for TwelveLabs service and integration.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, Mock, patch, MagicMock
from app.services.twelve_labs import TwelveLabsService
from app.schemas.video import TranscriptSegment, KeyConcept, TwelveLabsData


class TestTwelveLabsService:
    """Test TwelveLabs service functionality"""
    
    @pytest.fixture
    def service(self):
        """Create a TwelveLabs service instance"""
        with patch('app.services.twelve_labs.TwelveLabs'):
             return TwelveLabsService()
    
    @pytest.mark.asyncio
    async def test_get_index_existing(self, service):
        """Test getting an existing index"""
        mock_index = MagicMock()
        mock_index.name = "lecture-lens-index"
        service.client.index.list.return_value = [mock_index]
        
        index = await service.get_index()
        
        assert index == mock_index
        service.client.index.create.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_index_create(self, service):
        """Test creating a new index if none exists"""
        service.client.index.list.return_value = []
        mock_new_index = MagicMock()
        service.client.index.create.return_value = mock_new_index
        
        index = await service.get_index()
        
        assert index == mock_new_index
        service.client.index.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_submit_video_for_indexing(self, service):
        """Test submitting a video for indexing"""
        # Mock get_index
        mock_index = MagicMock()
        mock_index.id = "idx-123"
        service._index = mock_index
        
        mock_task = MagicMock()
        mock_task.id = "task-123"
        service.client.task.create.return_value = mock_task
        
        task_id = await service.submit_video_for_indexing(
            "https://youtube.com/watch?v=abc",
            "Test Video"
        )
        
        assert task_id == "task-123"
        service.client.task.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_poll_until_indexed_success(self, service):
        """Test successful polling until indexed"""
        mock_task_pending = MagicMock()
        mock_task_pending.status = "pending"
        
        mock_task_ready = MagicMock()
        mock_task_ready.status = "ready"
        mock_task_ready.video_id = "vid-123"
        mock_task_ready.index_id = "idx-123"
        
        service.client.task.retrieve.side_effect = [mock_task_pending, mock_task_ready]
        
        status = await service.poll_until_indexed("task-123", max_attempts=5, poll_interval=0)
        
        assert status["status"] == "ready"
        assert status["video_id"] == "vid-123"
    
    @pytest.mark.asyncio
    async def test_get_video_data(self, service):
        """Test extracting video data"""
        task_info = {"video_id": "vid-123", "index_id": "idx-123"}
        
        # Mock transcript
        mock_t1 = MagicMock(start=0, end=10, value="Hello")
        mock_t2 = MagicMock(start=10, end=20, value="World")
        service.client.video.transcription.return_value = [mock_t1, mock_t2]
        
        # Mock summary (chapters)
        mock_chapter = MagicMock()
        mock_chapter.chapter_title = "Chapter 1"
        mock_chapter.start = 5
        
        mock_summary = MagicMock()
        mock_summary.chapters = [mock_chapter]
        mock_summary.highlights = []
        service.client.generate.summarize.return_value = mock_summary
        
        video_data = await service.get_video_data(task_info)
        
        assert isinstance(video_data, TwelveLabsData)
        assert len(video_data.transcript) == 2
        assert video_data.transcript[0].text == "Hello"
        assert len(video_data.key_concepts) == 1
        assert video_data.key_concepts[0].label == "Chapter 1"
        assert video_data.key_concepts[0].timestamp == 5
