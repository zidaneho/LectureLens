import pytest
from unittest.mock import patch, AsyncMock
from app.core.database import connect_to_mongo, close_mongo_connection, db

@pytest.mark.asyncio
async def test_connect_to_mongo():
    with patch("app.core.database.AsyncIOMotorClient") as mock_client:
        await connect_to_mongo()
        assert mock_client.called
        assert db.client is not None
        assert db.db is not None

@pytest.mark.asyncio
async def test_close_mongo_connection():
    # Setup mock client
    mock_client = AsyncMock()
    db.client = mock_client
    
    await close_mongo_connection()
    assert mock_client.close.called
