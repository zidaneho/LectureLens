import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock
import sys

# Mock browser_use module BEFORE any other imports to avoid collection-time ImportErrors
# This needs to be done at module level before pytest collects tests
mock_browser_config = MagicMock()
mock_browser_profile = MagicMock()
mock_agent = MagicMock()

# Create mock submodules
sys.modules['browser_use'] = MagicMock()
sys.modules['browser_use.agent'] = MagicMock()
sys.modules['browser_use.agent.service'] = MagicMock(Agent=mock_agent)
sys.modules['browser_use.browser'] = MagicMock()
sys.modules['browser_use.browser.profile'] = MagicMock(BrowserProfile=mock_browser_profile)

@pytest.fixture(autouse=True)
def mock_browser_use_fixture():
    """Fixture to provide access to the mocks if needed, and ensure they are reset."""
    yield mock_browser_config, mock_browser_profile, mock_agent

@pytest.fixture(autouse=True)
def mock_db_connection():
    """Mock MongoDB connection to avoid needing a real instance for tests."""
    with patch("main.connect_to_mongo", new_callable=AsyncMock) as mock_connect, \
         patch("main.close_mongo_connection", new_callable=AsyncMock) as mock_close:
        yield mock_connect, mock_close

@pytest.fixture
def client():
    # We must import 'app' inside the fixture or after mocking to ensure it uses mocks if needed
    from main import app
    with TestClient(app) as c:
        yield c

@pytest.fixture
def mock_db():
    with patch("app.routes.user.db") as mock_db:
        yield mock_db
