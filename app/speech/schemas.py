"""
Pydantic schemas for speech analysis endpoints.
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class AudioFileUpload(BaseModel):
    """Audio file upload response"""
    id: int
    filename: str
    original_name: str
    file_size: int
    mime_type: str
    duration: Optional[float]
    created_at: datetime

class SpeechAnalysisResponse(BaseModel):
    """Speech analysis result response"""
    id: int
    audio_file_id: int
    stuttering_detected: bool
    stuttering_percentage: float
    total_words: int
    stuttered_words: int
    average_pause_duration: float
    speech_rate: float
    analysis_data: Optional[Dict[str, Any]]
    processing_status: str
    processed_at: Optional[datetime]
    created_at: datetime

class ReportResponse(BaseModel):
    """Report response schema"""
    id: int
    speech_analysis_id: int
    title: str
    summary: Optional[str]
    recommendations: Optional[str]
    detailed_findings: Optional[str]
    report_type: str
    created_at: datetime
    updated_at: datetime