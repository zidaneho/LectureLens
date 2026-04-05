import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent.parent / ".env"
print(f"DEBUG: env_path={env_path.absolute()}")
print(f"DEBUG: exists={env_path.exists()}")
loaded = load_dotenv(dotenv_path=env_path)
print(f"DEBUG: loaded={loaded}")
print(f"DEBUG: GOOGLE_API_KEY in os.environ={bool(os.environ.get('GOOGLE_API_KEY'))}")
if os.environ.get('GOOGLE_API_KEY'):
    print(f"DEBUG: value={os.environ.get('GOOGLE_API_KEY')[:10]}...")
