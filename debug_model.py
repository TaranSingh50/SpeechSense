#!/usr/bin/env python3
import sys
sys.path.append('.')
from app.speech.model_inference import analyze_stuttering
import glob

print("Testing improved MFCC features:")
print("="*50)

# Test with multiple files to see diversity
audio_files = ["uploads/audio/94b01d82c1b483be183630dce381d099",  # FluencyBank (should be fluent)
               "uploads/audio/ff8988614fafd9175e725b50a6f92cbe",  # WomenWhoStutter (should be stuttered)
               "uploads/audio/db4051f4e270f703937e0d0d721ddf44"]  # Another file

for audio_file in audio_files[:2]:  # Test just 2 files
    print(f"\nTesting file: {audio_file}")
    print("-" * 40)
    
    try:
        results = analyze_stuttering(audio_file)
        
        if results["frame_data"]:
            probs = [f['stutter_probability'] for f in results["frame_data"]]
            
            print(f"Overall: {results['overall_stutter_probability']:.4f} - {results['overall_prediction']}")
            print(f"Frames: {len(results['frame_data'])}")
            print(f"Prob range: {min(probs):.4f} - {max(probs):.4f}")
            print(f"Mean: {sum(probs)/len(probs):.4f}")
            print(f"Unique values: {len(set([round(p, 4) for p in probs]))}")
            print(f"First 5: {[round(p, 4) for p in probs[:5]]}")
            print(f"Last 5: {[round(p, 4) for p in probs[-5:]]}")
        else:
            print("No frame data generated")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()