from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock

def test_get_user_profile(client: TestClient, mock_db):
    # Mock 'find_one' for a non-existent user to trigger default creation
    mock_db.db.users.find_one = AsyncMock(return_value=None)
    mock_db.db.users.insert_one = AsyncMock()

    response = client.get("/api/user/profile")
    
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "default_user"
    assert "preferences" in data
    assert mock_db.db.users.insert_one.called

def test_get_existing_user_profile(client: TestClient, mock_db):
    existing_user = {
        "user_id": "default_user",
        "email": "test@example.com",
        "preferences": {
            "browser_context": "None",
            "persona": "Professor",
            "summary_length": "medium"
        }
    }
    mock_db.db.users.find_one = AsyncMock(return_value=existing_user)

    response = client.get("/api/user/profile")
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"

def test_update_user_profile(client: TestClient, mock_db):
    updated_user = {
        "user_id": "default_user",
        "preferences": {
            "persona": "Student",
            "browser_context": "None",
            "summary_length": "short"
        }
    }
    mock_db.db.users.find_one_and_update = AsyncMock(return_value=updated_user)

    payload = {"preferences": {"persona": "Student"}}
    response = client.patch("/api/user/profile", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["preferences"]["persona"] == "Student"
    assert mock_db.db.users.find_one_and_update.called

def test_get_user_history(client: TestClient, mock_db):
    mock_history = [
        {"_id": "507f1f77bcf86cd799439011", "user_id": "default_user", "video_url": "url1"},
        {"_id": "507f1f77bcf86cd799439012", "user_id": "default_user", "video_url": "url2"}
    ]
    # Motor's find().to_list()
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=mock_history)
    mock_db.db.history.find = MagicMock(return_value=mock_cursor)

    response = client.get("/api/user/history")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["history"]) == 2
    assert data["history"][0]["_id"] == "507f1f77bcf86cd799439011"
