from app.tasks import process_video_pipeline
from unittest.mock import MagicMock, patch
import pytest

def test_process_video_pipeline_logic():
    """Test the process_video_pipeline task with mocked TwelveLabs"""
    task_id = "test-task"
    prompt = "Test prompt"
    video_url = "https://youtube.com/watch?v=test"
    title = "Test Lecture Video"
    
    # Mock the update_state method
    with patch.object(process_video_pipeline, 'update_state') as mock_update:
        # Mock the TwelveLabs service
        with patch('app.tasks._index_and_get_video_data') as mock_index:
            mock_index.return_value = {
                "transcript": [
                    {"start": 0, "end": 10, "text": "Hello everyone"},
                    {"start": 10, "end": 60, "text": "Today we discuss important topics"}
                ],
                "key_concepts": [
                    {"label": "Key Concept 1", "timestamp": 15}
                ]
            }
            
            # Run the task with video URL provided
            result = process_video_pipeline.run(task_id, prompt, video_url, title)
            
            # Verify update_state was called for different stages
            assert mock_update.call_count >= 3
            
            # Check for keys in the final result
            assert "video_url" in result
            assert "lecture_notes" in result
            assert "twelve_labs_data" in result
            assert result["title"] == title
            assert result["video_url"] == video_url
            
            # Task B4: Specific check for Gemini results in the task output
            assert "markdown_content" in result["lecture_notes"]
            assert "external_resources" in result["lecture_notes"]
            assert isinstance(result["lecture_notes"]["external_resources"], list)


def test_process_video_pipeline_without_video_url():
    """Test pipeline without pre-provided video URL (Browser Use flow)"""
    task_id = "test-task-2"
    prompt = "Find a quantum computing lecture"
    
    with patch.object(process_video_pipeline, 'update_state') as mock_update:
        with patch('app.tasks._index_and_get_video_data') as mock_index:
            mock_index.return_value = {
                "transcript": [{"start": 0, "end": 10, "text": "Welcome"}],
                "key_concepts": [{"label": "Quantum", "timestamp": 5}]
            }
            
            # Run without video URL (should use Browser Use)
            result = process_video_pipeline.run(task_id, prompt)
            
            assert "video_url" in result
            assert "title" in result
            assert result["twelve_labs_data"]["transcript"][0]["text"] == "Welcome"

