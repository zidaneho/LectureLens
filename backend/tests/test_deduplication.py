import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

def test_search_video_deduplication(client: TestClient):
    """Test that submitting the same prompt twice returns the same task_id and doesn't trigger new task"""
    prompt = "Duplicate prompt test"
    
    # First call - mock as if it's a new task (PENDING means not found in some Celery backends, 
    # but here we check state. Let's mock AsyncResult to return something like 'not started')
    with patch("app.routes.video.AsyncResult") as mock_result:
        # Mocking the state to be something that triggers a NEW task
        mock_result.return_value.state = 'EMPTY' 
        
        with patch("app.routes.video.process_video_pipeline.apply_async") as mock_apply:
            response1 = client.post("/api/search-video", json={"prompt": prompt})
            assert response1.status_code == 202
            task_id1 = response1.json()["task_id"]
            assert mock_apply.called
            
            # Reset mock for second call
            mock_apply.reset_mock()
            
            # Second call - mock as if it's already running
            mock_result.return_value.state = 'PROGRESS'
            response2 = client.post("/api/search-video", json={"prompt": prompt})
            assert response2.status_code == 202
            task_id2 = response2.json()["task_id"]
            
            assert task_id1 == task_id2
            assert not mock_apply.called
            assert "already exists" in response2.json()["message"]

def test_cancel_task_success(client: TestClient):
    """Test successful task cancellation"""
    task_id = "test-task-to-cancel"
    
    with patch("app.routes.video.AsyncResult") as mock_result:
        mock_instance = mock_result.return_value
        mock_instance.state = 'PROGRESS'
        
        response = client.post(f"/api/cancel-task/{task_id}")
        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"
        mock_instance.revoke.assert_called_once_with(terminate=True)

def test_task_status_revoked(client: TestClient):
    """Test that REVOKED state is correctly handled in status endpoint"""
    task_id = "revoked-task"
    
    with patch("app.routes.video.AsyncResult") as mock_result:
        mock_result.return_value.state = 'REVOKED'
        
        response = client.get(f"/api/task-status/{task_id}")
        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"
