# LectureLens Backend

FastAPI backend for LectureLens, an AI-powered lecture video analysis and note-generation platform.

## Prerequisites

- **Python 3.10+**
- **Redis**: Required for the Celery task broker and result backend.
- **MongoDB**: Required for persistent storage of video and task data.
- **Node.js/npm**: Required for Playwright dependencies (if not already installed).

## Setup

1.  **Create a Virtual Environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

2.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Install Playwright Browsers:**
    ```bash
    playwright install
    ```

4.  **Configure Environment Variables:**
    Copy the `.env.example` file to `.env` and fill in your API keys:
    ```bash
    cp .env.example .env
    ```
    Required keys include:
    - `GOOGLE_API_KEY`: For Gemini-based generation.
    - `TWELVE_LABS_API_KEY`: For video analysis.
    - `ELEVEN_LABS_API_KEY`: For future speech/voice capabilities.
    - `REDIS_URL`: URL for your Redis instance (default: `redis://localhost:6379/0`).
    - `MONGODB_URL`: URL for your MongoDB instance (default: `mongodb://localhost:27017`).
    - `DATABASE_NAME`: Name of your MongoDB database (default: `lecturelens`).

## Running the Application

### 1. Start the FastAPI Server
```bash
python main.py
```
The API will be available at `http://localhost:8000`. You can access the interactive documentation at `http://localhost:8000/docs`.

### 2. Start the Celery Worker
In a separate terminal (with the virtual environment activated):
```bash
celery -A app.worker.celery_app worker --loglevel=info
```

## Running Tests

To run the automated tests, use `pytest`:
```bash
pytest
```

This will run API tests and task logic tests, mocking external services like Redis and TwelveLabs.

**Test Coverage:**
- `test_api.py`: FastAPI endpoint tests
- `test_chat.py`: Chat service and endpoint tests (20 tests covering B5)
- `test_twelve_labs.py`: TwelveLabs integration tests
- `test_user.py`: User profile endpoint tests
- `test_infra.py`: Infrastructure and database tests

To run only chat tests:
```bash
pytest tests/test_chat.py -v
```

## API Endpoints Summary

### Video Processing
- `POST /api/search-video` - Initiate video search and analysis
- `GET /api/task-status/{task_id}` - Poll for processing status

### Chat (Task B5)
- `POST /api/chat` - Ask questions about video content with timestamp responses

### User Management
- `GET /api/user/profile` - Get user profile and preferences
- `PATCH /api/user/profile` - Update user profile
- `GET /api/user/history` - Fetch user's video history

## Project Structure

- `main.py`: Entry point for the FastAPI application.
- `app/`:
    - `routes/`: API endpoint definitions.
        - `video.py`: Video search and indexing endpoints
        - `chat.py`: Chat interface endpoint
        - `user.py`: User profile endpoints
    - `schemas/`: Pydantic models for request/response validation.
    - `services/`: Service layer for external integrations.
        - `twelve_labs.py`: TwelveLabs video indexing and search
        - `gemini.py`: Google Gemini content generation
        - `chat.py`: Chat orchestration service (B5)
        - `browser_use_service.py`: Playwright-based web automation
    - `tasks.py`: Celery task definitions for the background processing pipeline.
    - `worker.py`: Celery configuration and app instance.
    - `core/`: Core logic and configurations.
        - `database.py`: MongoDB connection
        - `config.py`: Environment configuration
- `requirements.txt`: Python dependencies.
- `tests/`: Test suite with full coverage.
    - `test_chat.py`: Chat endpoint and service tests (20 tests, Task B5)

# LIVE AT: lecturelens.tech
