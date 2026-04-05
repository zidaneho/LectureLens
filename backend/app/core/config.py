from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Keys
    GOOGLE_API_KEY: str = ""
    TWELVE_LABS_API_KEY: str = ""
    ELEVEN_LABS_API_KEY: str = ""
    BROWSER_USE_API_KEY: str = ""
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "lecturelens"

    # Browser Use
    BROWSER_USE_HEADLESS: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
