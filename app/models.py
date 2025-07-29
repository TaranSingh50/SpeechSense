"""
Database models for SpeechPath application.
Defines all SQLAlchemy models for users, authentication, and speech analysis.
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey, Boolean, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
import enum

from .database import Base

class AccountType(str, enum.Enum):
    """User account types"""
    PATIENT = "patient"
    THERAPIST = "therapist"

class User(Base):
    """User model for authentication and profile management"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)  # Match existing schema
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    first_name = Column(String, nullable=True)  # Match existing schema
    last_name = Column(String, nullable=True)   # Match existing schema
    profile_image_url = Column(String, nullable=True)  # Match existing schema
    account_type = Column(String, nullable=False, default="patient")  # Use string instead of enum
    is_email_verified = Column(Boolean, nullable=True, default=False)  # Match existing schema
    created_at = Column(DateTime(timezone=False), nullable=True)  # Match existing schema (no timezone)
    updated_at = Column(DateTime(timezone=False), nullable=True)  # Match existing schema (no timezone)
    
    # Relationships
    auth_tokens = relationship("AuthToken", back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    audio_files = relationship("AudioFile", back_populates="user", cascade="all, delete-orphan")
    speech_analyses = relationship("SpeechAnalysis", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")

class AuthToken(Base):
    """JWT authentication tokens storage"""
    __tablename__ = "auth_tokens"
    
    id = Column(String, primary_key=True, index=True)  # String ID to match existing schema
    user_id = Column(String, ForeignKey("users.id"), nullable=False)  # String to match User.id
    token = Column(String, unique=True, nullable=False)  # Match existing column name
    type = Column(String, nullable=False)  # Match existing column name (access/refresh)
    expires_at = Column(DateTime(timezone=False), nullable=False)  # No timezone to match existing
    created_at = Column(DateTime(timezone=False), nullable=True)  # Match existing schema
    
    # Relationships
    user = relationship("User", back_populates="auth_tokens")

class PasswordResetToken(Base):
    """Password reset tokens for account recovery"""
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)  # String to match User.id
    token = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=False), nullable=False)  # No timezone to match existing
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="password_reset_tokens")

class AudioFile(Base):
    """Audio file metadata and storage information"""
    __tablename__ = "audio_files"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)  # String to match User.id
    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String, nullable=False)
    duration = Column(Float)  # Duration in seconds
    created_at = Column(DateTime(timezone=False), server_default=func.now())  # No timezone
    
    # Relationships
    user = relationship("User", back_populates="audio_files")
    speech_analyses = relationship("SpeechAnalysis", back_populates="audio_file", cascade="all, delete-orphan")

class SpeechAnalysis(Base):
    """Speech analysis results from AI processing"""
    __tablename__ = "speech_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)  # String to match User.id
    audio_file_id = Column(Integer, ForeignKey("audio_files.id"), nullable=False)
    
    # Analysis results
    stuttering_detected = Column(Boolean, default=False)
    stuttering_percentage = Column(Float, default=0.0)
    total_words = Column(Integer, default=0)
    stuttered_words = Column(Integer, default=0)
    average_pause_duration = Column(Float, default=0.0)
    speech_rate = Column(Float, default=0.0)  # Words per minute
    
    # Detailed analysis data (JSON format)
    analysis_data = Column(JSON)
    
    # Processing metadata
    processing_status = Column(String, default="pending")  # pending, processing, completed, failed
    error_message = Column(Text)
    processed_at = Column(DateTime(timezone=False))  # No timezone
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="speech_analyses")
    audio_file = relationship("AudioFile", back_populates="speech_analyses")
    reports = relationship("Report", back_populates="speech_analysis", cascade="all, delete-orphan")

class Report(Base):
    """Professional clinical reports generated from speech analysis"""
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)  # String to match User.id
    speech_analysis_id = Column(Integer, ForeignKey("speech_analyses.id"), nullable=False)
    
    # Report content
    title = Column(String, nullable=False)
    summary = Column(Text)
    recommendations = Column(Text)
    detailed_findings = Column(Text)
    
    # Report metadata
    report_type = Column(String, default="standard")  # standard, detailed, summary
    generated_by = Column(String)  # system, therapist
    created_at = Column(DateTime(timezone=False), server_default=func.now())  # No timezone
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="reports")
    speech_analysis = relationship("SpeechAnalysis", back_populates="reports")

# Legacy session table for compatibility (if needed)
class Session(Base):
    """Legacy session storage table"""
    __tablename__ = "sessions"
    
    sid = Column(String, primary_key=True)
    sess = Column(JSON, nullable=False)
    expire = Column(DateTime(timezone=False), nullable=False)  # No timezone