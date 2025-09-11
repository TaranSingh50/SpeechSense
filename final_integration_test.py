
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import sys
sys.path.append('.')
from app.speech.model_inference import process_audio_analysis
import json

try:
    print('Starting complete audio analysis test...', file=sys.stderr)
    results, csv_path, pdf_path = process_audio_analysis('uploads/audio/070f9189ee19788620a976dec6c7f9c0', 'integration_test_patient')
    
    output = {
        'success': True,
        'results': results,
        'csv_path': csv_path,
        'pdf_path': pdf_path
    }
    print(json.dumps(output))
    
except Exception as e:
    print(f'Analysis error: {e}', file=sys.stderr)
    output = {
        'success': False,
        'error': str(e)
    }
    print(json.dumps(output))

