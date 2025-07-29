"""
Authentication router with endpoints for registration, login, logout, and password recovery.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime
import os

from ..database import get_db
from ..models import User, AuthToken, PasswordResetToken
from .schemas import (
    UserRegister, UserLogin, ForgotPassword, ResetPassword,
    LoginResponse, RegisterResponse, ForgotPasswordResponse, 
    ResetPasswordResponse, TokenVerificationResponse, RefreshTokenResponse,
    UserResponse
)
from .utils import (
    hash_password, verify_password, create_access_token, 
    create_refresh_token, create_reset_token, get_token_expiry,
    generate_user_id
)
from .dependencies import get_current_user, get_refresh_token_user

auth_router = APIRouter()

@auth_router.post("/register", response_model=RegisterResponse)
async def register_user(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user account"""
    
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered"
        )
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    db_user = User(
        id=generate_user_id(),  # Generate string UUID for user ID
        email=user_data.email,
        password=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        account_type=user_data.account_type
    )
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(db_user.id)})
    
    # Create refresh token
    refresh_token = create_refresh_token()
    auth_token = AuthToken(
        id=generate_user_id(),  # Generate string ID for token
        user_id=db_user.id,
        token=refresh_token,  # Use 'token' field name to match schema
        type="refresh",  # Specify token type
        expires_at=get_token_expiry(60 * 24 * 30)  # 30 days
    )
    
    db.add(auth_token)
    await db.commit()
    
    return RegisterResponse(
        message="User registered successfully",
        user=UserResponse.model_validate(db_user),  # Updated for Pydantic v2
        access_token=access_token
    )

@auth_router.post("/login", response_model=LoginResponse)
async def login_user(
    user_credentials: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return JWT tokens"""
    
    # Find user by email
    result = await db.execute(select(User).where(User.email == user_credentials.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(user_credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # Create refresh token
    refresh_token = create_refresh_token()
    auth_token = AuthToken(
        id=generate_user_id(),  # Generate string ID for token
        user_id=user.id,
        token=refresh_token,  # Use 'token' field name to match schema
        type="refresh",  # Specify token type
        expires_at=get_token_expiry(60 * 24 * 30)  # 30 days
    )
    
    db.add(auth_token)
    await db.commit()
    
    # Set refresh token as HTTP-only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=60 * 60 * 24 * 30,  # 30 days
        httponly=True,
        secure=True if os.getenv("NODE_ENV") == "production" else False,
        samesite="lax"
    )
    
    return LoginResponse(
        message="Login successful",
        user=UserResponse.model_validate(user),  # Updated for Pydantic v2
        access_token=access_token
    )

@auth_router.post("/logout")
async def logout_user(
    response: Response,
    current_user: User = Depends(get_current_user),
    refresh_token_user: User = Depends(get_refresh_token_user),
    db: AsyncSession = Depends(get_db)
):
    """Logout user and invalidate refresh tokens"""
    
    # Delete all refresh tokens for the user
    await db.execute(delete(AuthToken).where(AuthToken.user_id == current_user.id))
    await db.commit()
    
    # Clear refresh token cookie
    response.delete_cookie(key="refresh_token")
    
    return {"message": "Logout successful"}

@auth_router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_access_token(
    current_user: User = Depends(get_refresh_token_user),
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token"""
    
    # Create new access token
    access_token = create_access_token(data={"sub": str(current_user.id)})
    
    return RefreshTokenResponse(
        access_token=access_token,
        message="Token refreshed successfully"
    )

@auth_router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    request_data: ForgotPassword,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset token"""
    
    # Find user by email
    result = await db.execute(select(User).where(User.email == request_data.email))
    user = result.scalar_one_or_none()
    
    # Always return success message for security (don't reveal if email exists)
    success_message = "If this email exists, a password reset link has been sent"
    
    if not user:
        return ForgotPasswordResponse(message=success_message)
    
    # Delete existing reset tokens for this user
    await db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
    
    # Create new reset token
    reset_token = create_reset_token()
    password_reset = PasswordResetToken(
        user_id=user.id,
        token=reset_token,
        expires_at=get_token_expiry(60)  # 1 hour
    )
    
    db.add(password_reset)
    await db.commit()
    
    # In development, return the token for testing
    development_token = reset_token if os.getenv("NODE_ENV") == "development" else None
    
    return ForgotPasswordResponse(
        message=success_message,
        reset_token=development_token
    )

@auth_router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    reset_data: ResetPassword,
    db: AsyncSession = Depends(get_db)
):
    """Reset user password using reset token"""
    
    # Find reset token
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == reset_data.token,
            PasswordResetToken.used == False
        )
    )
    reset_token = result.scalar_one_or_none()
    
    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Check if token is expired
    if reset_token.expires_at < datetime.utcnow():
        await db.delete(reset_token)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
    
    # Get user
    result = await db.execute(select(User).where(User.id == reset_token.user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )
    
    # Update password
    user.password = hash_password(reset_data.password)
    
    # Mark token as used
    reset_token.used = True
    
    # Delete all auth tokens (force re-login)
    await db.execute(delete(AuthToken).where(AuthToken.user_id == user.id))
    
    await db.commit()
    
    return ResetPasswordResponse(
        message="Password has been reset successfully. Please log in with your new password."
    )

@auth_router.get("/verify-reset-token/{token}", response_model=TokenVerificationResponse)
async def verify_reset_token(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Verify if a reset token is valid"""
    
    # Find reset token
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == token,
            PasswordResetToken.used == False
        )
    )
    reset_token = result.scalar_one_or_none()
    
    if not reset_token or reset_token.expires_at < datetime.utcnow():
        return TokenVerificationResponse(
            valid=False,
            message="Token is invalid or expired"
        )
    
    return TokenVerificationResponse(
        valid=True,
        message="Token is valid"
    )