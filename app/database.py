"""
Database configuration and session management for SpeechPath application.
Uses SQLAlchemy with async PostgreSQL connection.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Convert postgres:// to postgresql+asyncpg:// for async support
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Remove sslmode from URL if present (asyncpg doesn't support this parameter format)
if "sslmode=" in DATABASE_URL:
    # Split the URL to remove sslmode parameter
    parts = DATABASE_URL.split("?")
    if len(parts) > 1:
        # Remove sslmode parameter
        params = parts[1].split("&")
        params = [p for p in params if not p.startswith("sslmode=")]
        if params:
            DATABASE_URL = parts[0] + "?" + "&".join(params)
        else:
            DATABASE_URL = parts[0]

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=True if os.getenv("NODE_ENV") == "development" else False,
    future=True
)

# Create async session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for all database models
Base = declarative_base()

# Dependency to get database session
async def get_db():
    """Database session dependency for FastAPI"""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()