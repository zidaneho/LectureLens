from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import video, chat, user
from app.core.database import connect_to_mongo, close_mongo_connection

app = FastAPI(title="LectureLens API")

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to LectureLens API"}

app.include_router(video.router, prefix="/api", tags=["video"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(user.router, prefix="/api/user", tags=["user"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
