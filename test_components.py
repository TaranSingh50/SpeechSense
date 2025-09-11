
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import sys
sys.path.append('.')

try:
    from pydub import AudioSegment
    print('Pydub import: SUCCESS')
except Exception as e:
    print(f'Pydub import: FAILED - {e}')

try:
    from app.speech.model_inference import extract_audio_features
    print('Feature extraction import: SUCCESS')
except Exception as e:
    print(f'Feature extraction import: FAILED - {e}')

try:
    audio_file = 'uploads/audio/070f9189ee19788620a976dec6c7f9c0'
    if os.path.exists(audio_file):
        features = extract_audio_features(audio_file)
        print(f'Feature extraction: SUCCESS - shape: {features.shape}')
    else:
        print('Audio file not found')
except Exception as e:
    print(f'Feature extraction: FAILED - {e}')

