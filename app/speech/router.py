"""
Speech analysis router with endpoints for audio upload, analysis, and reporting.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import os
import aiofiles
from datetime import datetime
import uuid

from ..database import get_db
from ..models import User, AudioFile, SpeechAnalysis, Report
from ..auth.dependencies import get_current_user
from .schemas import AudioFileUpload, SpeechAnalysisResponse, ReportResponse

speech_router = APIRouter()

@speech_router.post("/upload", response_model=AudioFileUpload)
async def upload_audio_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload an audio file for speech analysis"""
    
    # Validate file type
    allowed_types = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/m4a"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not supported. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Validate file size (max 50MB)
    max_size = 50 * 1024 * 1024  # 50MB
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 50MB limit"
        )
    
    # Reset file pointer
    await file.seek(0)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ".bin"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    # Create upload directory if it doesn't exist
    upload_dir = "uploads/audio"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(upload_dir, unique_filename)
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_content)
    
    # Create database record
    db_audio_file = AudioFile(
        user_id=current_user.id,
        filename=unique_filename,
        original_name=file.filename or "unknown",
        file_path=file_path,
        file_size=len(file_content),
        mime_type=file.content_type
    )
    
    db.add(db_audio_file)
    await db.commit()
    await db.refresh(db_audio_file)
    
    return AudioFileUpload(
        id=db_audio_file.id,
        filename=db_audio_file.filename,
        original_name=db_audio_file.original_name,
        file_size=db_audio_file.file_size,
        mime_type=db_audio_file.mime_type,
        duration=db_audio_file.duration,
        created_at=db_audio_file.created_at
    )

@speech_router.post("/analyze/{audio_file_id}", response_model=SpeechAnalysisResponse)
async def analyze_speech(
    audio_file_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start speech analysis for an audio file"""
    
    # Get audio file
    result = await db.execute(
        select(AudioFile).where(
            AudioFile.id == audio_file_id,
            AudioFile.user_id == current_user.id
        )
    )
    audio_file = result.scalar_one_or_none()
    
    if not audio_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file not found"
        )
    
    # Check if analysis already exists
    result = await db.execute(
        select(SpeechAnalysis).where(SpeechAnalysis.audio_file_id == audio_file_id)
    )
    existing_analysis = result.scalar_one_or_none()
    
    if existing_analysis:
        return SpeechAnalysisResponse(
            id=existing_analysis.id,
            audio_file_id=existing_analysis.audio_file_id,
            stuttering_detected=existing_analysis.stuttering_detected,
            stuttering_percentage=existing_analysis.stuttering_percentage,
            total_words=existing_analysis.total_words,
            stuttered_words=existing_analysis.stuttered_words,
            average_pause_duration=existing_analysis.average_pause_duration,
            speech_rate=existing_analysis.speech_rate,
            analysis_data=existing_analysis.analysis_data,
            processing_status=existing_analysis.processing_status,
            processed_at=existing_analysis.processed_at,
            created_at=existing_analysis.created_at
        )
    
    # Create new analysis (mock implementation)
    # In a real application, this would trigger actual AI analysis
    mock_analysis_data = {
        "stuttering_events": [
            {"timestamp": 2.3, "type": "repetition", "word": "the"},
            {"timestamp": 5.7, "type": "prolongation", "word": "speech"},
            {"timestamp": 12.1, "type": "block", "duration": 0.8}
        ],
        "confidence_score": 0.92,
        "processing_method": "mock_ai_v1.0"
    }
    
    db_analysis = SpeechAnalysis(
        user_id=current_user.id,
        audio_file_id=audio_file_id,
        stuttering_detected=True,
        stuttering_percentage=15.2,
        total_words=120,
        stuttered_words=18,
        average_pause_duration=0.45,
        speech_rate=95.5,
        analysis_data=mock_analysis_data,
        processing_status="completed",
        processed_at=datetime.utcnow()
    )
    
    db.add(db_analysis)
    await db.commit()
    await db.refresh(db_analysis)
    
    return SpeechAnalysisResponse(
        id=db_analysis.id,
        audio_file_id=db_analysis.audio_file_id,
        stuttering_detected=db_analysis.stuttering_detected,
        stuttering_percentage=db_analysis.stuttering_percentage,
        total_words=db_analysis.total_words,
        stuttered_words=db_analysis.stuttered_words,
        average_pause_duration=db_analysis.average_pause_duration,
        speech_rate=db_analysis.speech_rate,
        analysis_data=db_analysis.analysis_data,
        processing_status=db_analysis.processing_status,
        processed_at=db_analysis.processed_at,
        created_at=db_analysis.created_at
    )

@speech_router.get("/analyses", response_model=List[SpeechAnalysisResponse])
async def get_user_analyses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all speech analyses for the current user"""
    
    result = await db.execute(
        select(SpeechAnalysis).where(SpeechAnalysis.user_id == current_user.id)
    )
    analyses = result.scalars().all()
    
    return [
        SpeechAnalysisResponse(
            id=analysis.id,
            audio_file_id=analysis.audio_file_id,
            stuttering_detected=analysis.stuttering_detected,
            stuttering_percentage=analysis.stuttering_percentage,
            total_words=analysis.total_words,
            stuttered_words=analysis.stuttered_words,
            average_pause_duration=analysis.average_pause_duration,
            speech_rate=analysis.speech_rate,
            analysis_data=analysis.analysis_data,
            processing_status=analysis.processing_status,
            processed_at=analysis.processed_at,
            created_at=analysis.created_at
        )
        for analysis in analyses
    ]

@speech_router.post("/reports/{analysis_id}", response_model=ReportResponse)
async def generate_report(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate a professional report from speech analysis"""
    
    # Get analysis
    result = await db.execute(
        select(SpeechAnalysis).where(
            SpeechAnalysis.id == analysis_id,
            SpeechAnalysis.user_id == current_user.id
        )
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Speech analysis not found"
        )
    
    # Check if report already exists
    result = await db.execute(
        select(Report).where(Report.speech_analysis_id == analysis_id)
    )
    existing_report = result.scalar_one_or_none()
    
    if existing_report:
        return ReportResponse(
            id=existing_report.id,
            speech_analysis_id=existing_report.speech_analysis_id,
            title=existing_report.title,
            summary=existing_report.summary,
            recommendations=existing_report.recommendations,
            detailed_findings=existing_report.detailed_findings,
            report_type=existing_report.report_type,
            created_at=existing_report.created_at,
            updated_at=existing_report.updated_at
        )
    
    # Generate report content based on analysis
    summary = f"Speech analysis detected {'stuttering patterns' if analysis.stuttering_detected else 'no significant stuttering'} in the audio sample."
    
    recommendations = """
1. Continue monitoring speech patterns during daily activities
2. Practice controlled breathing techniques during speech
3. Consider consultation with a speech-language pathologist
4. Regular follow-up assessments recommended
    """.strip()
    
    detailed_findings = f"""
Analysis Results:
- Total words analyzed: {analysis.total_words}
- Stuttering events detected: {analysis.stuttered_words}
- Stuttering percentage: {analysis.stuttering_percentage}%
- Average pause duration: {analysis.average_pause_duration}s
- Speech rate: {analysis.speech_rate} words per minute

The analysis indicates {'moderate' if analysis.stuttering_percentage > 10 else 'mild'} stuttering patterns.
    """.strip()
    
    # Create report
    db_report = Report(
        user_id=current_user.id,
        speech_analysis_id=analysis_id,
        title=f"Speech Analysis Report - {datetime.utcnow().strftime('%Y-%m-%d')}",
        summary=summary,
        recommendations=recommendations,
        detailed_findings=detailed_findings,
        report_type="standard",
        generated_by="system"
    )
    
    db.add(db_report)
    await db.commit()
    await db.refresh(db_report)
    
    return ReportResponse(
        id=db_report.id,
        speech_analysis_id=db_report.speech_analysis_id,
        title=db_report.title,
        summary=db_report.summary,
        recommendations=db_report.recommendations,
        detailed_findings=db_report.detailed_findings,
        report_type=db_report.report_type,
        created_at=db_report.created_at,
        updated_at=db_report.updated_at
    )