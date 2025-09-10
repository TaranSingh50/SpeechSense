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
import sys
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
              const output = JSON.parse(stdout.trim());
              resolve(output);
            } catch (parseError) {
              resolve({
                success: false,
                error: `Failed to parse Python output: ${parseError}`
              });
            }
          } else {
            resolve({
              success: false,
              error: `Python script failed with code ${code}: ${stderr}`
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