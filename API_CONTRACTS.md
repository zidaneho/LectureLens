# LectureLens API Contracts

This document defines the communication protocol between the Frontend (React) and Backend (FastAPI).

## 1. Video Search & Processing Pipeline

### POST `/api/search-video`
Initializes the search for a video based on a user prompt.

**Request Body:**
```json
{
  "prompt": "string",
  "context": {
    "user_id": "string (optional)",
    "video_url": "string (optional, direct URL to process)",
    "title": "string (optional, video title)"
  }
}
```

**Notes:**
- If `video_url` and `title` are provided in context, the API skips Browser Use and directly indexes the video with TwelveLabs.
- If not provided, the backend uses Browser Use (implementation pending) to search for a video matching the prompt.

**Response (202 Accepted):**
```json
{
  "task_id": "uuid-string",
  "status": "pending",
  "message": "Search initiated"
}
```

---

### GET `/api/task-status/{task_id}`
Polls for the status of the long-running Browser Use + TwelveLabs + Gemini pipeline.

**Response (Processing):**
```json
{
  "task_id": "uuid-string",
  "status": "processing",
  "stage": "searching_video | processing_video | generating_notes",
  "progress": 45
}
```

**Response (Success):**
```json
{
  "task_id": "uuid-string",
  "status": "completed",
  "result": {
    "video_url": "https://youtube.com/watch?v=...",
    "title": "Introduction to Quantum Computing",
    "twelve_labs_data": {
      "transcript": [
        {"start": 0, "end": 10, "text": "Hello world..."},
        {"start": 10, "end": 60, "text": "Today we talk about qubits..."}
      ],
      "key_concepts": [
        {"label": "Superposition", "timestamp": 120}
      ]
    },
    "lecture_notes": {
      "markdown_content": "# Quantum Computing Notes\n...",
      "external_resources": [
        {
          "title": "Quantum Computing for Babies",
          "url": "https://example.com/paper",
          "type": "paper"
        }
      ]
    }
  }
}
```

---

## TwelveLabs Integration Details

### Video Indexing Pipeline

The backend uses **TwelveLabs API** to index and analyze videos. The pipeline works as follows:

1. **Submit Video for Indexing**
   - Endpoint: `POST https://api.twelvelabs.io/v1/indexes`
   - Submits video URL to TwelveLabs for processing
   - Returns an `index_id` used for tracking

2. **Poll for Indexing Completion**
   - Endpoint: `GET https://api.twelvelabs.io/v1/indexes/{index_id}`
   - Polls periodically (every 5 seconds) until state is `ready`
   - Max attempts: 120 (approximately 10 minutes)
   - States: `processing`, `ready`, `failed`

3. **Extract Video Data**
   - Once indexed, retrieve transcript via: `GET /v1/indexes/{index_id}/transcript`
   - Retrieve summary/entities via: `GET /v1/indexes/{index_id}/video-summary?video_summary_type=gist`
   - Parse transcript into segments (start, end, text)
   - Parse entities as key concepts with timestamps

### Response Data Structure

```json
{
  "transcript": [
    {
      "start": 0,
      "end": 5,
      "text": "Introduction text"
    }
  ],
  "key_concepts": [
    {
      "label": "Important Concept",
      "timestamp": 120
    }
  ]
}
```

---

## Gemini Content Generation (Task B4)

The backend uses **Google Gemini (gemini-1.5-flash)** to transform video metadata into structured educational content.

### Note Generation Logic
1. **System Prompting:** TwelveLabs transcript and key concepts are injected into a specialized academic prompt.
2. **Markdown Synthesis:** Gemini generates a structured set of notes with headings, bullet points, and timestamp references.
3. **Research Extraction:** Gemini identifies key topics for further study, which are then used to discover supplementary resources.

### Note Data Structure
```json
{
  "markdown_content": "# Video Title\n## Summary\n...",
  "external_resources": [
    {
      "title": "Topic Study Guide",
      "url": "https://...",
      "type": "guide"
    }
  ]
}
```

---

## 2. Chatbot Interface (Task B5 - Completed)

### POST `/api/chat`
Ask questions about the current video. The endpoint uses TwelveLabs Search API to find specific moments matching your query and leverages Gemini to generate a comprehensive response.

**Implementation Details:**
- Uses TwelveLabs Search API to locate relevant video segments based on natural language queries
- Extracts timestamps of matching moments
- Employs Gemini to synthesize video content with query context for articulate responses
- Supports persona variations (default professional, spongebob enthusiastic)
- Returns exact timestamp for easy video navigation

**Request Body:**
```json
{
  "video_id": "string (TwelveLabs index_id)",
  "message": "What did he say about Shor's algorithm?",
  "persona": "default | spongebob"
}
```

**Response (200 OK):**
```json
{
  "response_text": "He mentions Shor's algorithm as a way to factor large integers using quantum computers to solve integer factorization problems efficiently...",
  "timestamp": 450.5,
  "audio_url": null
}
```

**Notes:**
- `video_id` corresponds to the TwelveLabs index ID (returned from the task result)
- `timestamp` is null if no specific moment was found
- `audio_url` is reserved for future ElevenLabs voice synthesis integration (currently null)
- Persona support allows dynamic response styling

**Service Architecture:**
- **ChatService** (`app/services/chat.py`): Orchestrates search and response generation
- **TwelveLabs Integration**: Searches indexed videos for relevant content
- **Gemini Integration**: Generates contextual, persona-aware responses
- **Error Handling**: Graceful fallbacks if services unavailable

---

## 3. User History (Stretch)

### GET `/api/user/history`
Fetch past processed videos.

**Response (200 OK):**
```json
{
  "history": [
    {
      "video_id": "id1",
      "title": "...",
      "processed_date": "2026-04-04T..."
    }
  ]
}
```
