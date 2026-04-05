import os
from pathlib import Path
from app.core.config import settings

print(f"CWD: {os.getcwd()}")
print(f"GOOGLE_API_KEY set: {bool(settings.GOOGLE_API_KEY)}")
if settings.GOOGLE_API_KEY:
    print(f"GOOGLE_API_KEY: {settings.GOOGLE_API_KEY[:10]}...")
else:
    # Try manual check
    env_path = Path(__file__).parent / ".env"
    print(f"Manual check of {env_path}: {env_path.exists()}")
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if "GOOGLE_API_KEY" in line:
                    print(f"Found in file: {line.strip()[:20]}...")
