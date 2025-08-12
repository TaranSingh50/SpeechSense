// Shared audio utility functions for consistent behavior across components

// Utility function to get audio duration from URL
export const getAudioDuration = (url: string): Promise<number> =>
  new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.src = url;
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      reject(new Error('Failed to load audio'));
    });
  });

// Utility function to get audio duration from File object
export const getAudioDurationFromFile = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      window.URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      window.URL.revokeObjectURL(audio.src);
      reject(new Error("Could not load audio metadata"));
    };

    audio.src = URL.createObjectURL(file);
  });
};

// Utility function to format duration with error handling
export const formatDuration = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds) || seconds <= 0) {
    return "NA";
  }
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Utility function to detect if file is recorded or uploaded
export const isRecorded = (filename: string): boolean => filename.startsWith("recording_");

// Utility function to load audio durations for multiple files with enhanced error handling
export const loadAudioDurations = async (
  files: any[], 
  existingDurations: Record<string, number>,
  accessToken: string
): Promise<Record<string, number>> => {
  const newDurations: Record<string, number> = {};
  
  for (const file of files) {
    if (!existingDurations[file.id]) {
      try {
        console.log(`Loading duration for ${file.originalName} (${file.id})`);
        
        const response = await fetch(`/api/audio/${file.id}/stream`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        console.log(`Stream response for ${file.originalName}: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const blob = await response.blob();
          console.log(`Blob size for ${file.originalName}: ${blob.size} bytes, type: ${blob.type}`);
          
          const url = URL.createObjectURL(blob);
          
          try {
            const duration = await getAudioDuration(url);
            console.log(`Duration loaded for ${file.originalName}: ${duration} seconds`);
            newDurations[file.id] = duration;
          } catch (durationError) {
            console.error(`Failed to get duration for ${file.originalName}:`, durationError);
            // Set a fallback value to prevent infinite "Loading..." state
            newDurations[file.id] = -1; // Will display as "NA" due to formatDuration logic
          } finally {
            URL.revokeObjectURL(url);
          }
        } else {
          console.error(`Failed to stream ${file.originalName}: ${response.status} ${response.statusText}`);
          // Set fallback value for failed requests
          newDurations[file.id] = -1;
        }
      } catch (error) {
        console.error(`Error loading duration for ${file.originalName}:`, error);
        // Set fallback value for any other errors
        newDurations[file.id] = -1;
      }
    }
  }
  
  return newDurations;
};