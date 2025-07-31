
#!/usr/bin/env python3
"""
Database backup script for SpeechPath project
Creates a SQL dump of the PostgreSQL database
"""

import os
import subprocess
import datetime
from dotenv import load_dotenv

load_dotenv()

def backup_database():
    """Create a database backup using pg_dump"""
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL environment variable not found")
        return False
    
    # Create backups directory
    os.makedirs("backups", exist_ok=True)
    
    # Generate timestamp for backup filename
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"backups/speechpath_backup_{timestamp}.sql"
    
    try:
        # Run pg_dump command
        print(f"Creating database backup: {backup_filename}")
        
        # Use pg_dump to create a complete database backup
        result = subprocess.run([
            "pg_dump",
            database_url,
            "--no-password",
            "--verbose",
            "--clean",
            "--no-acl",
            "--no-owner",
            "-f", backup_filename
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Backup created successfully: {backup_filename}")
            
            # Get file size
            file_size = os.path.getsize(backup_filename)
            print(f"📁 Backup size: {file_size / 1024:.2f} KB")
            
            return True
        else:
            print(f"❌ Backup failed: {result.stderr}")
            return False
            
    except FileNotFoundError:
        print("❌ pg_dump command not found. Please install PostgreSQL client tools.")
        return False
    except Exception as e:
        print(f"❌ Error creating backup: {e}")
        return False

def list_backups():
    """List all available backups"""
    backup_dir = "backups"
    if not os.path.exists(backup_dir):
        print("No backups directory found")
        return
    
    backups = [f for f in os.listdir(backup_dir) if f.endswith('.sql')]
    if not backups:
        print("No backups found")
        return
    
    print("\nAvailable backups:")
    for backup in sorted(backups, reverse=True):
        filepath = os.path.join(backup_dir, backup)
        size = os.path.getsize(filepath)
        modified = datetime.datetime.fromtimestamp(os.path.getmtime(filepath))
        print(f"  📄 {backup} ({size/1024:.2f} KB) - {modified.strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    print("🗄️  SpeechPath Database Backup Tool")
    print("=" * 40)
    
    success = backup_database()
    
    if success:
        list_backups()
    
    print("\nDone!")
