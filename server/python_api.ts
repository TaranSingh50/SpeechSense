import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface AnalysisResult {
  success: boolean;
  results?: any;
  csv_path?: string;
  pdf_path?: string;
  error?: string;
}

export function run_python_analysis(audioFilePath: string, patientId: string): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    try {
      // Create a temporary Python script to run the analysis
      const tempScript = `
# Suppress TensorFlow logging before any imports
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import sys
import warnings
warnings.filterwarnings('ignore')

# Suppress TensorFlow warnings
try:
    import tensorflow as tf
    tf.get_logger().setLevel('ERROR')
except:
    pass

sys.path.append('${process.cwd()}')

from app.speech.model_inference import process_audio_analysis
import json

try:
    results, csv_path, pdf_path = process_audio_analysis('${audioFilePath}', '${patientId}')
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
`;

      // Write temporary script
      const tempScriptPath = path.join(os.tmpdir(), `analysis_${Date.now()}.py`);
      fs.writeFileSync(tempScriptPath, tempScript);

      let stdout = '';
      let stderr = '';

      // Try to run with UV Python environment first, fallback to system python
      const pythonPaths = ['.pythonlibs/bin/python', 'python3', 'python'];
      let pythonPath = pythonPaths[0];

      // Check if UV python exists
      if (!fs.existsSync(pythonPath)) {
        pythonPath = 'python3';
      }

      const pythonProcess = spawn(pythonPath, [tempScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 60000 // 60 second timeout
      });

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        try {
          // Clean up temporary script
          if (fs.existsSync(tempScriptPath)) {
            fs.unlinkSync(tempScriptPath);
          }

          if (code === 0 && stdout.trim()) {
            try {
              // Extract only JSON from stdout (filter out any debug messages)
              const lines = stdout.trim().split('\n');
              let jsonLine = '';
              
              // Find the JSON line (should start with { or [)
              for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('{') || trimmedLine.startsWith('[')) {
                  jsonLine = trimmedLine;
                  break;
                }
              }
              
              if (jsonLine) {
                const output = JSON.parse(jsonLine);
                resolve(output);
              } else {
                resolve({
                  success: false,
                  error: `No valid JSON found in Python output. Output: ${stdout}. Stderr: ${stderr}`
                });
              }
            } catch (parseError) {
              resolve({
                success: false,
                error: `Failed to parse Python output: ${parseError}. Output: ${stdout}. Stderr: ${stderr}`
              });
            }
          } else {
            resolve({
              success: false,
              error: `Python script failed with code ${code}. Stdout: ${stdout}. Stderr: ${stderr}`
            });
          }
        } catch (error) {
          resolve({
            success: false,
            error: `Process error: ${error}`
          });
        }
      });

      pythonProcess.on('error', (error) => {
        // Clean up temporary script
        if (fs.existsSync(tempScriptPath)) {
          fs.unlinkSync(tempScriptPath);
        }
        
        resolve({
          success: false,
          error: `Failed to start Python process: ${error.message}`
        });
      });

    } catch (error) {
      resolve({
        success: false,
        error: `Failed to run Python analysis: ${error}`
      });
    }
  });
}