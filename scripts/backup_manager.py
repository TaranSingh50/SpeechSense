
#!/usr/bin/env python3
"""
Comprehensive backup management for SpeechPath project
Handles both database dumps and file backups
"""

import os
import shutil
import subprocess
import datetime
import argparse
from dotenv import load_dotenv

load_dotenv()

class BackupManager:
    def __init__(self):
        self.backup_dir = "backups"
        self.export_dir = "exports"
        self.uploads_dir = "uploads"
        
        # Create directories
        os.makedirs(self.backup_dir, exist_ok=True)
        os.makedirs(self.export_dir, exist_ok=True)
    
    def create_database_backup(self):
        """Create PostgreSQL database backup"""
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL not found")
            return False
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"{self.backup_dir}/db_backup_{timestamp}.sql"
        
        try:
            print("🗄️  Creating database backup...")
            result = subprocess.run([
                "pg_dump", database_url,
                "--no-password", "--verbose", "--clean",
                "--no-acl", "--no-owner", "-f", backup_file
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"✅ Database backup created: {backup_file}")
                return backup_file
            else:
                print(f"❌ Database backup failed: {result.stderr}")
                return False
                
        except FileNotFoundError:
            print("❌ pg_dump not found. Using alternative data export method...")
            return self.create_data_export_backup()
    
    def create_data_export_backup(self):
        """Create data export backup when pg_dump is unavailable"""
        try:
            import asyncio
            import sys
            sys.path.append('.')
            
            # Import and run the export script
            result = subprocess.run([
                "python", "scripts/export_data.py"
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ Data export backup completed successfully")
                return True
            else:
                print(f"❌ Data export failed: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Backup error: {e}")
            return False
    
    def backup_files(self):
        """Backup uploaded files"""
        if not os.path.exists(self.uploads_dir):
            print("📁 No uploads directory found")
            return False
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"{self.backup_dir}/files_backup_{timestamp}.tar.gz"
        
        try:
            print("📁 Creating files backup...")
            result = subprocess.run([
                "tar", "-czf", backup_file, self.uploads_dir
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"✅ Files backup created: {backup_file}")
                return backup_file
            else:
                print(f"❌ Files backup failed: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Files backup error: {e}")
            return False
    
    def full_backup(self):
        """Create complete backup (database + files)"""
        print("🚀 Starting full backup...")
        
        db_backup = self.create_database_backup()
        files_backup = self.backup_files()
        
        if db_backup or files_backup:
            print("✅ Full backup completed!")
            return True
        else:
            print("❌ Full backup failed!")
            return False
    
    def list_backups(self):
        """List all available backups"""
        print("\n📋 Available Backups:")
        print("=" * 50)
        
        if not os.path.exists(self.backup_dir):
            print("No backups found")
            return
        
        backups = os.listdir(self.backup_dir)
        if not backups:
            print("No backups found")
            return
        
        for backup in sorted(backups, reverse=True):
            filepath = os.path.join(self.backup_dir, backup)
            size = os.path.getsize(filepath)
            modified = datetime.datetime.fromtimestamp(os.path.getmtime(filepath))
            
            backup_type = "🗄️  Database" if backup.startswith("db_") else "📁 Files"
            print(f"{backup_type}: {backup}")
            print(f"   Size: {size/1024:.2f} KB")
            print(f"   Date: {modified.strftime('%Y-%m-%d %H:%M:%S')}")
            print()
    
    def cleanup_old_backups(self, keep_days=7):
        """Remove backups older than specified days"""
        if not os.path.exists(self.backup_dir):
            return
        
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=keep_days)
        removed_count = 0
        
        for backup in os.listdir(self.backup_dir):
            filepath = os.path.join(self.backup_dir, backup)
            modified = datetime.datetime.fromtimestamp(os.path.getmtime(filepath))
            
            if modified < cutoff_date:
                os.remove(filepath)
                removed_count += 1
                print(f"🗑️  Removed old backup: {backup}")
        
        if removed_count == 0:
            print("🧹 No old backups to remove")
        else:
            print(f"🧹 Removed {removed_count} old backups")

def main():
    parser = argparse.ArgumentParser(description="SpeechPath Backup Manager")
    parser.add_argument("action", choices=["database", "files", "full", "list", "cleanup"],
                       help="Backup action to perform")
    parser.add_argument("--keep-days", type=int, default=7,
                       help="Days to keep backups (for cleanup)")
    
    args = parser.parse_args()
    
    manager = BackupManager()
    
    print("🔧 SpeechPath Backup Manager")
    print("=" * 40)
    
    if args.action == "database":
        manager.create_database_backup()
    elif args.action == "files":
        manager.backup_files()
    elif args.action == "full":
        manager.full_backup()
    elif args.action == "list":
        manager.list_backups()
    elif args.action == "cleanup":
        manager.cleanup_old_backups(args.keep_days)

if __name__ == "__main__":
    main()
