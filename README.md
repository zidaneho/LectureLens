# LectureLens

**AI-powered lecture intelligence platform** that transforms educational videos into structured study materials. Search for any lecture topic, and LectureLens will automatically find relevant videos, extract key concepts with timestamps, generate comprehensive notes, and let you ask questions directly about the content.

---

## Features

### 🔍 Video Discovery & Processing
- **Natural language video search** — describe a topic and Browser Use automatically finds the best matching lecture video
- **Direct URL support** — paste a YouTube URL to skip the search step and process the video directly
- **Background processing** — videos are indexed asynchronously via Celery with real-time progress updates (Searching → Indexing → Generating)
- **Multi-modal analysis** — TwelveLabs Marengo 3.0 + Pegasus 1.2 analyze both visual and audio content for deep understanding
- **Intelligent Caching** — processed videos are cached in MongoDB to avoid redundant API usage and provide instant access to previously analyzed content

### 📝 Lecture Note Generation
- **Structured markdown notes** — Gemini generates organized, readable notes from transcripts and key concepts
- **Configurable length** — choose between short (~300 words), medium (~800 words), or long (1500+ words) summaries
- **Custom personas** — choose a tone like "Professor", "SpongeBob", or define your own to match your learning style
- **Key topic extraction** — automatically identifies important concepts and creates a clickable timeline for navigation

### 💬 Interactive Chat
- **Video-aware Q&A** — ask questions about the lecture and get contextual answers based on the video's content
- **Timestamp navigation** — responses include exact timestamps, allowing you to jump directly to the relevant moment in the video
- **Persona-aware responses** — chat responses dynamically match your chosen summary persona

### 🎨 User Experience
- **Dashboard** — browse and revisit all previously processed videos in your personal history
- **Embedded video player** — watch videos directly in the app with deep-link timestamp integration
- **Text-to-speech** — listen to generated notes via ElevenLabs high-quality audio synthesis
- **Multiple themes** — high-contrast dark and light modes supported through a dedicated Theme system
- **Persistent Preferences** — custom API keys and learning preferences are stored per user for a tailored experience

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion |
| **Backend** | FastAPI, Python, Pydantic |
| **Task Queue** | Celery + Redis |
| **Database** | MongoDB (async via Motor) |
| **Video Analysis** | TwelveLabs (Marengo 3.0 + Pegasus 1.2) |
| **Note Generation** | Google Gemini (`gemini-1.5-flash`) |
| **Video Search** | Browser Use + Playwright |
| **Text-to-Speech** | ElevenLabs |
| **Video Download** | yt-dlp |
| **Auth** | JWT (python-jose) + bcrypt (passlib) |

---

## Project Structure

```
LectureLens/
├── backend/
│   ├── main.py                   # FastAPI app entry point
│   ├── requirements.txt          # Python dependencies
│   └── app/
│       ├── routes/               # API endpoints (video, chat, user)
│       ├── schemas/              # Pydantic request/response models
│       ├── services/             # External API integrations (TwelveLabs, Gemini, Browser Use, ElevenLabs)
│       ├── core/                 # Config, database, auth
│       ├── tasks.py              # Celery pipeline definition
│       └── worker.py             # Celery app configuration
├── frontend/
│   └── src/
│       ├── pages/                # AnalysisView, Dashboard, Settings, Auth
│       ├── components/           # ChatComponent, MainLayout, VoiceButton, etc.
│       ├── SettingsContext.tsx   # Global user preferences & state
│       └── ThemeContext.tsx      # Theme management
└── docker-compose.yml            # Redis + MongoDB services
```

---

## Getting Started

### 1. Start Infrastructure
Ensure Docker is running, then start the database and task broker:
```bash
docker-compose up -d
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install
```

Configure environment variables in `backend/.env` (see Environment Variables section below).

Start the API server and Celery worker:
```bash
# Terminal 1 — API server
python main.py

# Terminal 2 — Celery worker
celery -A app.worker.celery_app worker --loglevel=info
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Environment Variables

Create `backend/.env` with the following keys:

| Variable | Description |
|---|---|
| `TWELVE_LABS_API_KEY` | TwelveLabs API key for video indexing |
| `GOOGLE_API_KEY` | Google Gemini API key for note generation |
| `BROWSER_USE_API_KEY` | Browser Use API key (or uses Gemini if omitted) |
| `ELEVEN_LABS_API_KEY` | ElevenLabs API key for text-to-speech |
| `MONGODB_URL` | MongoDB connection URL (default: `mongodb://localhost:27017`) |
| `REDIS_URL` | Redis connection URL (default: `redis://localhost:6379/0`) |
| `SECRET_KEY` | Random secret key for JWT authentication |

---

## API Overview

- `POST /api/search-video`: Initiate the search and analysis pipeline (returns `task_id`)
- `GET /api/task-status/{task_id}`: Poll for real-time processing status
- `POST /api/chat`: Contextual Q&A about the processed video
- `POST /api/tts`: Convert generated notes to streaming audio
- `GET /api/user/history`: Retrieve previously analyzed videos

---

## License
MIT
