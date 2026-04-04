from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import video, chat, user

app = FastAPI(title="LectureLens API")

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

# Basic structure for routes - will be implemented in app/routes
# app.include_router(video.router, prefix="/api", tags=["video"])
# app.include_router(chat.router, prefix="/api", tags=["chat"])
# app.include_router(user.router, prefix="/api", tags=["user"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
