"""
SpeechPath - AI-Powered Speech Analysis Platform
FastAPI backend application with JWT authentication and PostgreSQL database.
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn
import os
from dotenv import load_dotenv

from app.auth.router import auth_router
from app.speech.router import speech_router
from app.database import engine, Base
from app.auth.dependencies import get_current_user
# Import all models to ensure they're registered with SQLAlchemy
from app.models import User, AuthToken, PasswordResetToken, AudioFile, SpeechAnalysis, Report, Session

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="SpeechPath API",
    description="AI-Powered Speech Analysis Platform for healthcare professionals",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# Database is already initialized, no need to create tables
# Tables exist from the previous TypeScript application

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(speech_router, prefix="/api/speech", tags=["Speech Analysis"])

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "SpeechPath API"}

# Protected route example
@app.get("/api/user")
async def get_current_user_info(current_user = Depends(get_current_user)):
    """Get current authenticated user information"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "firstName": current_user.first_name,
        "lastName": current_user.last_name,
        "accountType": current_user.account_type,
        "createdAt": current_user.created_at
    }

# Serve static files and frontend
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Serve the frontend application
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Serve the frontend application for all non-API routes"""
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    # Serve the main HTML file for frontend routing
    with open("static/index.html", "r") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True if os.getenv("NODE_ENV") == "development" else False
    )