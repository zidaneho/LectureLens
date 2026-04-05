from fastapi import APIRouter, HTTPException, Body, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from app.schemas.user import UserProfile, UserUpdate, UserResponse, UserPreferences, UserCreate, Token
from app.core.database import db
from app.core.config import settings
from app.core.auth import verify_password, get_password_hash, create_access_token
from typing import Dict, Any
import uuid

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/user/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = await db.db.users.find_one({"user_id": user_id})
    if user is None:
        raise credentials_exception
    return user

@router.post("/signup", response_model=UserResponse)
async def signup(user_in: UserCreate):
    # Check if user already exists
    existing_user = await db.db.users.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )
    
    user_id = str(uuid.uuid4())
    new_user = UserProfile(
        user_id=user_id,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        preferences=UserPreferences(full_name=user_in.full_name)
    )
    
    await db.db.users.insert_one(new_user.model_dump())
    return new_user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(subject=user["user_id"])
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/profile", response_model=UserResponse)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    return current_user

@router.patch("/profile", response_model=UserResponse)
async def update_user_profile(
    update_data: UserUpdate, 
    current_user: dict = Depends(get_current_user)
):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        return current_user

    # Handle nested preferences update
    if "preferences" in update_dict:
        pref_dict = {f"preferences.{k}": v for k, v in update_dict["preferences"].items() if v is not None}
        del update_dict["preferences"]
        update_dict.update(pref_dict)

    result = await db.db.users.find_one_and_update(
        {"user_id": current_user["user_id"]},
        {"$set": update_dict},
        return_document=True
    )
    
    return result

@router.get("/history")
async def get_user_history(current_user: dict = Depends(get_current_user)):
    history = await db.db.history.find({"user_id": current_user["user_id"]}).to_list(length=100)
    for item in history:
        item["_id"] = str(item["_id"])
    return {"history": history}
