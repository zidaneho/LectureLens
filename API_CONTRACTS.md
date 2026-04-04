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
    "user_id": "string (optional)"
  }
}
```

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

## 2. Chatbot Interface

### POST `/api/chat`
Ask questions about the current video.

**Request Body:**
```json
{
  "video_id": "string",
  "message": "What did he say about Shor's algorithm?",
  "persona": "default | spongebob"
}
```

**Response (200 OK):**
```json
{
  "response_text": "He mentions Shor's algorithm as a way to factor large integers...",
  "timestamp": 450,
  "audio_url": "https://api.elevenlabs.io/..." (optional)
}
```

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
