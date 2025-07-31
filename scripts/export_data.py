
#!/usr/bin/env python3
"""
Export application data to JSON format
Useful for data migration and application-level backups
"""

import asyncio
import json
import os
import datetime
from dotenv import load_dotenv

load_dotenv()

async def export_data():
    """Export all application data to JSON"""
    
    try:
        # Import database components
        from app.database import async_session
        from app.models import User, AuthToken, AudioFile, SpeechAnalysis, Report
        from sqlalchemy import select
        
        # Create exports directory
        os.makedirs("exports", exist_ok=True)
        
        # Generate timestamp for export filename
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        export_filename = f"exports/speechpath_data_{timestamp}.json"
        
        export_data = {
            "export_timestamp": timestamp,
            "users": [],
            "audio_files": [],
            "speech_analyses": [],
            "reports": []
        }
        
        async with async_session() as session:
            # Export users (excluding sensitive data)
            print("📊 Exporting users...")
            result = await session.execute(select(User))
            users = result.scalars().all()
            
            for user in users:
                export_data["users"].append({
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "account_type": user.account_type,
                    "is_active": user.is_active,
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                    "updated_at": user.updated_at.isoformat() if user.updated_at else None
                })
            
            # Export audio files metadata
            print("🎵 Exporting audio files...")
            result = await session.execute(select(AudioFile))
            audio_files = result.scalars().all()
            
            for audio_file in audio_files:
                export_data["audio_files"].append({
                    "id": audio_file.id,
                    "user_id": audio_file.user_id,
                    "file_name": audio_file.file_name,
                    "original_name": audio_file.original_name,
                    "file_size": audio_file.file_size,
                    "duration": audio_file.duration,
                    "mime_type": audio_file.mime_type,
                    "file_path": audio_file.file_path,
                    "created_at": audio_file.created_at.isoformat() if audio_file.created_at else None
                })
            
            # Export speech analyses
            print("🗣️  Exporting speech analyses...")
            result = await session.execute(select(SpeechAnalysis))
            analyses = result.scalars().all()
            
            for analysis in analyses:
                export_data["speech_analyses"].append({
                    "id": analysis.id,
                    "audio_file_id": analysis.audio_file_id,
                    "user_id": analysis.user_id,
                    "status": analysis.status,
                    "fluency_score": analysis.fluency_score,
                    "stuttering_events": analysis.stuttering_events,
                    "speech_rate": analysis.speech_rate,
                    "average_pause_duration": analysis.average_pause_duration,
                    "confidence_level": analysis.confidence_level,
                    "detected_events": analysis.detected_events,
                    "analysis_results": analysis.analysis_results,
                    "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
                    "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None
                })
            
            # Export reports
            print("📋 Exporting reports...")
            result = await session.execute(select(Report))
            reports = result.scalars().all()
            
            for report in reports:
                export_data["reports"].append({
                    "id": report.id,
                    "analysis_id": report.analysis_id,
                    "user_id": report.user_id,
                    "patient_id": report.patient_id,
                    "title": report.title,
                    "report_type": report.report_type,
                    "content": report.content,
                    "include_sections": report.include_sections,
                    "pdf_path": report.pdf_path,
                    "is_shared": report.is_shared,
                    "created_at": report.created_at.isoformat() if report.created_at else None
                })
        
        # Save to JSON file
        with open(export_filename, 'w') as f:
            json.dump(export_data, f, indent=2, default=str)
        
        # Statistics
        file_size = os.path.getsize(export_filename)
        print(f"\n✅ Data export completed!")
        print(f"📁 File: {export_filename}")
        print(f"📊 Size: {file_size / 1024:.2f} KB")
        print(f"👥 Users: {len(export_data['users'])}")
        print(f"🎵 Audio files: {len(export_data['audio_files'])}")
        print(f"🗣️  Analyses: {len(export_data['speech_analyses'])}")
        print(f"📋 Reports: {len(export_data['reports'])}")
        
        return True
        
    except Exception as e:
        print(f"❌ Export failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("📤 SpeechPath Data Export Tool")
    print("=" * 40)
    
    success = asyncio.run(export_data())
    
    if not success:
        exit(1)
