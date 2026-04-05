import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent / "backend" / ".env"
load_dotenv(dotenv_path=env_path)

from backend.app.services.gemini import get_gemini_service

async def test_gemini():
    service = get_gemini_service()
    print(f"Model initialized: {service.model is not None}")
    
    mock_data = {
        "transcript": [
            {"start": 0, "end": 10, "text": "Welcome to this lecture on Quantum Computing."},
            {"start": 10, "end": 20, "text": "Today we will talk about qubits and superposition."}
        ],
        "key_concepts": [
            {"label": "Qubits", "timestamp": 10}
        ]
    }
    
    print("Generating notes...")
    result = await service.generate_lecture_notes(mock_data, "Test Lecture")
    print("\nMarkdown Content Preview:")
    print(result.get("markdown_content")[:200] + "...")
    print("\nResearch Queries:")
    print(result.get("research_queries"))

if __name__ == "__main__":
    asyncio.run(test_gemini())
