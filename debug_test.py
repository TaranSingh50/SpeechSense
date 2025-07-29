#!/usr/bin/env python3
"""
Debug script to test registration endpoint directly
"""

import asyncio
import sys
from fastapi.testclient import TestClient
from app.database import engine, get_db
from app.models import User
from sqlalchemy import select

async def test_registration():
    """Test registration endpoint with direct database access"""
    
    try:
        # Import the FastAPI app
        from main import app
        
        # Create test client
        client = TestClient(app)
        
        # Test registration
        print("Testing registration endpoint...")
        response = client.post("/api/auth/register", json={
            "email": "debug@example.com",
            "password": "testpassword123", 
            "confirm_password": "testpassword123",
            "first_name": "Debug",
            "last_name": "User",
            "account_type": "patient"
        })
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            print("Registration failed!")
            return False
            
        print("Registration successful!")
        return True
        
    except Exception as e:
        print(f"Error during registration test: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_registration())
    sys.exit(0 if result else 1)