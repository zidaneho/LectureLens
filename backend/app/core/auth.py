from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import jwt
import hashlib
import hmac
from .config import settings

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using PBKDF2 with stored hash"""
    # Split the stored hash to get salt and hash
    try:
        parts = hashed_password.split('$')
        if len(parts) == 3 and parts[0] == 'pbkdf2':
            iterations = int(parts[1])
            salt_and_hash = parts[2].split(':')
            if len(salt_and_hash) == 2:
                salt, stored_hash = salt_and_hash
                # Recompute hash with same salt
                computed_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode(), salt.encode(), iterations).hex()
                return hmac.compare_digest(computed_hash, stored_hash)
    except (ValueError, IndexError):
        pass
    return False

def get_password_hash(password: str) -> str:
    """Hash password using PBKDF2 with salt"""
    iterations = 100000
    salt = settings.SECRET_KEY[:16]  # Use first 16 chars of secret as salt
    hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), iterations)
    return f"pbkdf2${iterations}${salt}:{hash_obj.hex()}"
