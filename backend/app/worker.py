import os
from celery import Celery
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the root of the backend directory
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Use Redis as the broker and result backend
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks"]
)

celery_app.conf.task_default_queue = "lecturelens"
celery_app.conf.task_routes = {
    "process_video_pipeline": {"queue": "lecturelens"}
}
