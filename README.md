# LectureLens
An AI Lecture Intelligence Platform

## Overview

LectureLens is an intelligent video analysis platform that combines multiple AI services to extract insights from educational videos:

1. **Video Search** (Browser Use) - Find videos matching user queries
2. **Video Intelligence** (TwelveLabs) - Index videos and extract transcripts, key concepts
3. **Content Generation** (Gemini) - Generate structured lecture notes and resources
4. **Interactive Chat** (TwelveLabs Search + Gemini) - Ask questions about video content

## Key Features

- 📺 **Video Analysis**: Automatically extract transcripts and key concepts from any video
- 📝 **Structured Notes**: AI-generated lecture notes with markdown formatting (Task B4 Completed)
- 🔗 **Resource Discovery**: Automated external resource finding for deeper learning (Task B4 Completed)
- 💬 **Interactive Chat**: Ask questions and get timestamped answers from the video (Task B5 Completed)
- ⚡ **Async Processing**: Long-running tasks handled by Celery workers

## Backend Stack

- **FastAPI** - High-performance Python web framework
- **TwelveLabs** - Video intelligence and indexing
- **Google Gemini** - Content generation
- **MongoDB** - Data persistence
- **Celery + Redis** - Asynchronous task processing
- **Playwright/Browser Use** - Web automation and video search

## Getting Started

See [backend/README.md](backend/README.md) for detailed setup and running instructions.
