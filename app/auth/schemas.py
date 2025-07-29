"""
Pydantic schemas for authentication endpoints.
Defines request/response models for user registration, login, and password recovery.
"""

from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime
from enum import Enum

class AccountTypeEnum(str, Enum):
    """Account type enumeration"""
    PATIENT = "patient"
    THERAPIST = "therapist"

class UserRegister(BaseModel):
    """User registration request schema"""
    email: EmailStr
    password: str
    confirm_password: str
    first_name: str
    last_name: str
    account_type: AccountTypeEnum = AccountTypeEnum.PATIENT
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserLogin(BaseModel):
    """User login request schema"""
    email: EmailStr
    password: str

class ForgotPassword(BaseModel):
    """Forgot password request schema"""
    email: EmailStr

class ResetPassword(BaseModel):
    """Reset password request schema"""
    token: str
    password: str
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserResponse(BaseModel):
    """User response schema (without password)"""
    id: str  # Changed to string to match database schema
    email: str
    first_name: str
    last_name: str
    account_type: str  # Changed to string to match database schema
    created_at: Optional[datetime] = None  # Made optional to match database schema
    
    class Config:
        from_attributes = True  # Updated for Pydantic v2

class LoginResponse(BaseModel):
    """Login response schema"""
    message: str
    user: UserResponse
    access_token: str

class RegisterResponse(BaseModel):
    """Registration response schema"""
    message: str
    user: UserResponse
    access_token: str

class ForgotPasswordResponse(BaseModel):
    """Forgot password response schema"""
    message: str
    reset_token: Optional[str] = None  # Only in development

class ResetPasswordResponse(BaseModel):
    """Reset password response schema"""
    message: str

class TokenVerificationResponse(BaseModel):
    """Token verification response schema"""
    valid: bool
    message: str

class RefreshTokenResponse(BaseModel):
    """Refresh token response schema"""
    access_token: str
    message: str