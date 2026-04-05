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
        # Updated to use 'indexes' instead of 'index'
        service.client.indexes.list.return_value = [mock_index]
        
        index = await service.get_index()
        
        assert index == mock_index
        service.client.indexes.create.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_index_create(self, service):
        """Test creating a new index if none exists"""
        # Updated to use 'indexes' instead of 'index'
        service.client.indexes.list.return_value = []
        mock_new_index = MagicMock()
        service.client.indexes.create.return_value = mock_new_index
        
        index = await service.get_index()
        
        assert index == mock_new_index
        service.client.indexes.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_submit_video_for_indexing(self, service):
        """Test submitting a video for indexing"""
        # Mock get_index
        mock_index = MagicMock()
        mock_index.id = "idx-123"
        service._index = mock_index
        
        mock_task = MagicMock()
        mock_task.id = "task-123"
        # Updated to use 'tasks' instead of 'task'
        service.client.tasks.create.return_value = mock_task
        
        task_id = await service.submit_video_for_indexing(
            "https://youtube.com/watch?v=abc",
            "Test Video"
        )
        
        assert task_id == "task-123"
        service.client.tasks.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_poll_until_indexed_success(self, service):
        """Test successful polling until indexed"""
        mock_task_pending = MagicMock()
        mock_task_pending.status = "pending"
        
        mock_task_ready = MagicMock()
        mock_task_ready.status = "ready"
        mock_task_ready.video_id = "vid-123"
        mock_task_ready.index_id = "idx-123"
        
        # Updated to use 'tasks' instead of 'task'
        service.client.tasks.retrieve.side_effect = [mock_task_pending, mock_task_ready]
        
        status = await service.poll_until_indexed("task-123", max_attempts=5, poll_interval=0)
        
        assert status["status"] == "ready"
        assert status["video_id"] == "vid-123"
    
    @pytest.mark.asyncio
    async def test_get_video_data(self, service):
        """Test extracting video data"""
        task_info = {"video_id": "vid-123", "index_id": "idx-123"}
        
        # Mock transcription
        mock_t1 = MagicMock(start=0, end=10, value="Hello")
        mock_t2 = MagicMock(start=10, end=20, value="World")
        
        mock_video = MagicMock()
        mock_video.transcription = [mock_t1, mock_t2]
        # Updated to use indexes.videos.retrieve
        service.client.indexes.videos.retrieve.return_value = mock_video
        
        # Mock analyze for summary (replacing generate.summarize)
        # Note: In the real code we will use analyze, so we mock analyze
        # For now, I'll update the service code to use analyze as well.
        # But wait, let's keep the test mocking what we expect.
        
        # Actually, let's fix the service code first before updating the test for analyze.
        # Wait, I'll just write the full fixed test file now.
        
        mock_chapter = MagicMock()
        mock_chapter.chapter_title = "Chapter 1"
        mock_chapter.start = 5
        
        # If we use analyze, we might get a different structure.
        # But if we use generate.summarize (if it works), we keep it.
        # Since I suspect it doesn't work, I'll update the service to use analyze.
        
        # Mock analyze result
        # Assuming analyze returns an object with 'chapters' property if requested via schema,
        # or we just mock what the service expects.
        mock_summary = MagicMock()
        mock_summary.chapters = [mock_chapter]
        mock_summary.highlights = []
        
        # We will update service to use analyze
        service.client.analyze.return_value = mock_summary
        
        # Wait, the current service code uses client.generate.summarize
        # I'll update it to use analyze.
        
        video_data = await service.get_video_data(task_info)
        
        assert isinstance(video_data, TwelveLabsData)
        assert len(video_data.transcript) == 2
        assert video_data.transcript[0].text == "Hello"
        assert len(video_data.key_concepts) == 1
        assert video_data.key_concepts[0].label == "Chapter 1"
        assert video_data.key_concepts[0].timestamp == 5
