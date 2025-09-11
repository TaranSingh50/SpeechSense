
import os
import sys
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress TensorFlow logging
import tensorflow as tf
tf.get_logger().setLevel('ERROR')

sys.path.append('.')
from app.speech.model_inference import process_audio_analysis
import json

try:
    results, csv_path, pdf_path = process_audio_analysis('uploads/audio/070f9189ee19788620a976dec6c7f9c0', 'test_patient')
    output = {
        'success': True,
        'results': results,
        'csv_path': csv_path,
        'pdf_path': pdf_path
    }
    print(json.dumps(output))
except Exception as e:
    output = {
        'success': False,
        'error': str(e)
    }
    print(json.dumps(output))

