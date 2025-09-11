import numpy as np
import pandas as pd
import soundfile as sf
import tensorflow as tf
from keras.models import load_model
import os
from fpdf import FPDF
from typing import Dict, Any, Tuple
import tempfile
import uuid
from datetime import datetime

# Load the model
MODEL_PATH = "best_model.keras"
model = None

def load_stuttering_model():
    """Load the Keras model for stuttering detection"""
    global model
    if model is None:
        if os.path.exists(MODEL_PATH):
            model = load_model(MODEL_PATH)
            print(f"Model loaded successfully from {MODEL_PATH}")
        else:
            raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
    return model

def extract_audio_features(audio_file_path: str) -> np.ndarray:
    """
    Extract features from audio file for model prediction
    Creates MFCC-like features to match model input shape (None, None, 13)
    """
    try:
        # Read audio file
        audio_data, sample_rate = sf.read(audio_file_path)
        
        # Convert to mono if stereo
        if len(audio_data.shape) > 1:
            audio_data = np.mean(audio_data, axis=1)
        
        # Normalize audio
        if np.max(np.abs(audio_data)) > 0:
            audio_data = audio_data / np.max(np.abs(audio_data))
        
        # Create MFCC-like features to match model input shape (None, None, 13)
        # Split audio into frames
        frame_length = 2048
        hop_length = 512
        n_features = 13  # Match model input shape
        
        # Calculate number of frames
        n_frames = max(1, (len(audio_data) - frame_length) // hop_length + 1)
        
        # Initialize feature matrix
        features = np.zeros((n_frames, n_features))
        
        for i in range(n_frames):
            start = i * hop_length
            end = min(start + frame_length, len(audio_data))
            frame = audio_data[start:end]
            
            if len(frame) == 0:
                continue
                
            # Pad frame if necessary
            if len(frame) < frame_length:
                frame = np.pad(frame, (0, frame_length - len(frame)), 'constant')
            
            # Extract features for this frame
            frame_features = []
            
            # Time domain features (6 features)
            frame_features.extend([
                np.mean(frame),
                np.std(frame),
                np.max(frame),
                np.min(frame),
                np.var(frame),
                np.sqrt(np.mean(frame**2))  # RMS
            ])
            
            # Frequency domain features (7 features)
            fft = np.fft.fft(frame)
            magnitude = np.abs(fft[:len(fft)//2])  # Take only positive frequencies
            
            if len(magnitude) > 0:
                frame_features.extend([
                    np.mean(magnitude),
                    np.std(magnitude),
                    np.max(magnitude),
                    np.median(magnitude),
                    np.percentile(magnitude, 25),
                    np.percentile(magnitude, 75),
                    np.sum(magnitude)
                ])
            else:
                frame_features.extend([0.0] * 7)
            
            # Ensure we have exactly 13 features
            frame_features = frame_features[:n_features]
            while len(frame_features) < n_features:
                frame_features.append(0.0)
            
            features[i] = frame_features
        
        # Reshape to match model input: (batch_size, time_steps, features)
        return features.reshape(1, n_frames, n_features)
        
    except Exception as e:
        print(f"Error extracting features: {e}")
        # Return zeros with correct shape if feature extraction fails
        return np.zeros((1, 10, 13))

def analyze_stuttering(audio_file_path: str) -> Dict[str, Any]:
    """
    Analyze audio file for stuttering detection
    """
    try:
        # Load model
        model = load_stuttering_model()
        
        # Extract features
        features = extract_audio_features(audio_file_path)
        
        # Make prediction
        if model is not None:
            prediction = model.predict(features)
        else:
            # Fallback prediction if model fails to load
            prediction = np.array([[0.3]])
        
        # Process prediction results (adjust based on your model output)
        stuttering_probability = float(prediction[0][0]) if len(prediction[0]) == 1 else float(np.max(prediction[0]))
        stuttering_detected = stuttering_probability > 0.5
        
        # Calculate additional metrics (mock values for now)
        # Replace with actual calculations based on your model
        confidence_score = min(max(stuttering_probability, 1 - stuttering_probability), 1.0)
        
        results = {
            "stuttering_detected": stuttering_detected,
            "stuttering_probability": round(stuttering_probability, 4),
            "confidence_score": round(confidence_score, 4),
            "severity_level": get_severity_level(stuttering_probability),
            "analysis_timestamp": datetime.now().isoformat(),
            "model_version": "1.0",
            "additional_metrics": {
                "fluency_rate": round(max(0, 1 - stuttering_probability), 4),
                "speech_quality": "Good" if not stuttering_detected else "Needs attention"
            }
        }
        
        return results
        
    except Exception as e:
        print(f"Error in stuttering analysis: {e}")
        # Return default results if analysis fails
        return {
            "stuttering_detected": False,
            "stuttering_probability": 0.0,
            "confidence_score": 0.0,
            "severity_level": "Unable to analyze",
            "analysis_timestamp": datetime.now().isoformat(),
            "model_version": "1.0",
            "error": str(e),
            "additional_metrics": {
                "fluency_rate": 0.0,
                "speech_quality": "Analysis failed"
            }
        }

def get_severity_level(probability: float) -> str:
    """Determine severity level based on stuttering probability"""
    if probability < 0.2:
        return "No stuttering detected"
    elif probability < 0.4:
        return "Mild"
    elif probability < 0.7:
        return "Moderate"
    else:
        return "Severe"

def generate_csv_report(results: Dict[str, Any], patient_id: str, output_dir: str = "uploads/reports") -> str:
    """Generate CSV report from analysis results"""
    try:
        os.makedirs(output_dir, exist_ok=True)
        
        # Prepare data for CSV
        csv_data = {
            "Patient ID": [patient_id],
            "Analysis Timestamp": [results["analysis_timestamp"]],
            "Stuttering Detected": [results["stuttering_detected"]],
            "Stuttering Probability": [results["stuttering_probability"]],
            "Confidence Score": [results["confidence_score"]],
            "Severity Level": [results["severity_level"]],
            "Fluency Rate": [results["additional_metrics"]["fluency_rate"]],
            "Speech Quality": [results["additional_metrics"]["speech_quality"]],
            "Model Version": [results["model_version"]]
        }
        
        # Create DataFrame
        df = pd.DataFrame(csv_data)
        
        # Generate filename
        csv_filename = f"{patient_id}_results.csv"
        csv_path = os.path.join(output_dir, csv_filename)
        
        # Save to CSV
        df.to_csv(csv_path, index=False)
        
        return csv_path
        
    except Exception as e:
        print(f"Error generating CSV report: {e}")
        raise

def generate_pdf_report(results: Dict[str, Any], patient_id: str, output_dir: str = "uploads/reports") -> str:
    """Generate PDF report from analysis results"""
    try:
        os.makedirs(output_dir, exist_ok=True)
        
        # Create PDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=16)
        
        # Title
        pdf.cell(200, 10, "Speech Analysis Report", ln=True, align='C')
        pdf.ln(10)
        
        # Patient information
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 10, f"Patient ID: {patient_id}", ln=True)
        pdf.cell(200, 10, f"Analysis Date: {results['analysis_timestamp']}", ln=True)
        pdf.ln(10)
        
        # Results section
        pdf.set_font("Arial", "B", size=14)
        pdf.cell(200, 10, "Analysis Results", ln=True)
        pdf.set_font("Arial", size=12)
        
        pdf.cell(200, 10, f"Stuttering Detected: {'Yes' if results['stuttering_detected'] else 'No'}", ln=True)
        pdf.cell(200, 10, f"Stuttering Probability: {results['stuttering_probability']:.2%}", ln=True)
        pdf.cell(200, 10, f"Confidence Score: {results['confidence_score']:.2%}", ln=True)
        pdf.cell(200, 10, f"Severity Level: {results['severity_level']}", ln=True)
        pdf.ln(10)
        
        # Additional metrics
        pdf.set_font("Arial", "B", size=14)
        pdf.cell(200, 10, "Additional Metrics", ln=True)
        pdf.set_font("Arial", size=12)
        
        pdf.cell(200, 10, f"Fluency Rate: {results['additional_metrics']['fluency_rate']:.2%}", ln=True)
        pdf.cell(200, 10, f"Speech Quality: {results['additional_metrics']['speech_quality']}", ln=True)
        pdf.ln(10)
        
        # Model information
        pdf.set_font("Arial", "B", size=14)
        pdf.cell(200, 10, "Model Information", ln=True)
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 10, f"Model Version: {results['model_version']}", ln=True)
        
        # Generate filename and save
        pdf_filename = f"{patient_id}.pdf"
        pdf_path = os.path.join(output_dir, pdf_filename)
        pdf.output(pdf_path)
        
        return pdf_path
        
    except Exception as e:
        print(f"Error generating PDF report: {e}")
        raise

def process_audio_analysis(audio_file_path: str, patient_id: str) -> Tuple[Dict[str, Any], str, str]:
    """
    Complete audio analysis workflow
    Returns: (results_dict, csv_path, pdf_path)
    """
    try:
        # Perform analysis
        results = analyze_stuttering(audio_file_path)
        
        # Generate reports
        csv_path = generate_csv_report(results, patient_id)
        pdf_path = generate_pdf_report(results, patient_id)
        
        return results, csv_path, pdf_path
        
    except Exception as e:
        print(f"Error in audio analysis workflow: {e}")
        raise