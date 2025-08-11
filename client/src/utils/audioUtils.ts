// Shared audio utility functions for consistent behavior across components

// Utility function to get audio duration
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

// Utility function to load audio durations for multiple files
export const loadAudioDurations = async (
  files: any[], 
  existingDurations: Record<string, number>,
  accessToken: string
): Promise<Record<string, number>> => {
  const newDurations: Record<string, number> = {};
  
  for (const file of files) {
    if (!existingDurations[file.id]) {
      try {
        const response = await fetch(`/api/audio/${file.id}/stream`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const duration = await getAudioDuration(url);
          newDurations[file.id] = duration;
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.log(`Failed to load duration for ${file.originalName}:`, error);
      }
    }
  }
  
  return newDurations;
};