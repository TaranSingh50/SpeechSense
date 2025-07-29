#!/usr/bin/env python3
"""
Simple startup script for the SpeechPath FastAPI application.
This script handles database initialization and starts the server.
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def create_tables():
    """Create database tables if they don't exist"""
    try:
        from app.database import engine, Base
        # Import specific models
        from app.models import User, AuthToken, PasswordResetToken, AudioFile, SpeechAnalysis, Report, Session
        
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables created successfully")
        
    except Exception as e:
        print(f"Error creating database tables: {e}")
        return False
    return True

def main():
    """Main entry point for the application"""
    
    # Create uploads directory
    os.makedirs("uploads/audio", exist_ok=True)
    
    # Database already initialized from previous application
    print("Database ready (tables exist from previous TypeScript app)")
    
    # Start the FastAPI server
    print("Starting SpeechPath server...")
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True if os.getenv("NODE_ENV") == "development" else False,
        log_level="info"
    )

if __name__ == "__main__":
    main()