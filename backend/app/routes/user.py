from fastapi import APIRouter, HTTPException, Body
from app.schemas.user import UserProfile, UserUpdate, UserResponse, UserPreferences
from app.core.database import db
from typing import Dict, Any

router = APIRouter()

# Placeholder for current user logic (e.g. from JWT)
DEFAULT_USER_ID = "default_user"

@router.get("/profile", response_model=UserResponse)
async def get_user_profile():
    user = await db.db.users.find_one({"user_id": DEFAULT_USER_ID})
    if not user:
        # Create a default profile if not found
        new_user = UserProfile(user_id=DEFAULT_USER_ID)
        await db.db.users.insert_one(new_user.model_dump())
        return new_user
    return user

@router.patch("/profile", response_model=UserResponse)
async def update_user_profile(update_data: UserUpdate):
    # Remove None values from update
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        return await get_user_profile()

    # Handle nested preferences update
    if "preferences" in update_dict:
        pref_dict = {f"preferences.{k}": v for k, v in update_dict["preferences"].items() if v is not None}
        del update_dict["preferences"]
        update_dict.update(pref_dict)

    result = await db.db.users.find_one_and_update(
        {"user_id": DEFAULT_USER_ID},
        {"$set": update_dict},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
        
    return result

@router.get("/history")
async def get_user_history():
    # Placeholder for video processing history
    history = await db.db.history.find({"user_id": DEFAULT_USER_ID}).to_list(length=100)
    # Convert MongoDB _id to string or remove it
    for item in history:
        item["_id"] = str(item["_id"])
    return {"history": history}
