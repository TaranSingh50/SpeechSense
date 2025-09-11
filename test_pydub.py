
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
from pydub import AudioSegment
import numpy as np

# Test pydub directly
audio_file = 'uploads/audio/070f9189ee19788620a976dec6c7f9c0'
try:
    audio_segment = AudioSegment.from_file(audio_file)
    print(f'Pydub SUCCESS: {len(audio_segment)}ms, {audio_segment.frame_rate}Hz, {audio_segment.channels}ch')
    
    # Convert to array
    audio_data = np.array(audio_segment.get_array_of_samples()).astype(np.float32)
    print(f'Array conversion SUCCESS: shape {audio_data.shape}')
    
except Exception as e:
    print(f'Pydub FAILED: {e}')

