from fastapi.testclient import TestClient
from unittest.mock import patch

def test_read_root(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to LectureLens API"}

def test_search_video_success(client: TestClient):
    # Mocking celery apply_async to avoid needing Redis/Worker
    with patch("app.routes.video.process_video_pipeline.apply_async") as mock_task:
        payload = {"prompt": "Deep learning lecture for beginners"}
        response = client.post("/api/search-video", json=payload)
        
        assert response.status_code == 202
        data = response.json()
        assert "task_id" in data
        assert data["status"] == "pending"
        assert mock_task.called

def test_get_task_status_pending(client: TestClient):
    # Mocking AsyncResult to simulate a pending task
    with patch("app.routes.video.AsyncResult") as mock_result:
        mock_result.return_value.state = "PENDING"
        
        task_id = "test-task-id"
        response = client.get(f"/api/task-status/{task_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == task_id
        assert data["status"] == "pending"

def test_get_task_status_completed(client: TestClient):
    with patch("app.routes.video.AsyncResult") as mock_result:
        mock_result.return_value.state = "SUCCESS"
        mock_result.return_value.result = {
            "video_url": "https://example.com/video",
            "title": "Test Video"
        }
        
        task_id = "test-task-id"
        response = client.get(f"/api/task-status/{task_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["result"]["title"] == "Test Video"
