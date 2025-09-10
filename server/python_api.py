import subprocess
import os
import tempfile
import json
from pathlib import Path

def run_python_analysis(audio_file_path: str, patient_id: str):
    """
    Run Python model inference by calling the model_inference.py module
    """
    try:
        # Create a temporary Python script to run the analysis
        temp_script = f"""
import sys
sys.path.append('{os.getcwd()}')

from app.speech.model_inference import process_audio_analysis
import json

try:
    results, csv_path, pdf_path = process_audio_analysis('{audio_file_path}', '{patient_id}')
    output = {{
        'success': True,
        'results': results,
        'csv_path': csv_path,
        'pdf_path': pdf_path
    }}
    print(json.dumps(output))
except Exception as e:
    output = {{
        'success': False,
        'error': str(e)
    }}
    print(json.dumps(output))
"""
        
        # Write temporary script
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(temp_script)
            temp_script_path = f.name
        
        try:
            # Run the Python script using the UV environment
            result = subprocess.run(
                ['.pythonlibs/bin/python', temp_script_path],
                capture_output=True,
                text=True,
                timeout=60  # 60 second timeout
            )
            
            if result.returncode == 0:
                # Parse the JSON output
                output = json.loads(result.stdout.strip())
                return output
            else:
                return {
                    'success': False,
                    'error': f"Python script failed: {result.stderr}"
                }
                
        finally:
            # Clean up temporary script
            if os.path.exists(temp_script_path):
                os.unlink(temp_script_path)
                
    except Exception as e:
        return {
            'success': False,
            'error': f"Failed to run Python analysis: {str(e)}"
        }