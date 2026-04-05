import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

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
