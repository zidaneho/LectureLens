import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Find and load .env explicitly into os.environ
def find_env_file():
    cwd = Path.cwd()
    if (cwd / ".env").exists():
        return cwd / ".env"
    this_dir = Path(__file__).resolve().parent
    for _ in range(5):
        if (this_dir / ".env").exists():
            return this_dir / ".env"
        this_dir = this_dir.parent
    return None

env_path = find_env_file()
if env_path:
    load_dotenv(dotenv_path=env_path, override=True)

class Settings(BaseSettings):
    # API Keys - using direct os.getenv to be 100% sure
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    TWELVE_LABS_API_KEY: str = os.getenv("TWELVE_LABS_API_KEY", "")
    ELEVEN_LABS_API_KEY: str = os.getenv("ELEVEN_LABS_API_KEY", "")
    BROWSER_USE_API_KEY: str = os.getenv("BROWSER_USE_API_KEY", "")
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # MongoDB
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "lecturelens")

    # Browser Use
    BROWSER_USE_HEADLESS: bool = True

    model_config = SettingsConfigDict(extra='ignore')

settings = Settings()
