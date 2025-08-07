import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Mic, Square, Play, Pause } from "lucide-react";

export function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload recorded audio mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiRequest("POST", "/api/audio/upload", formData);
    },
    onSuccess: async () => {
      try {
        // Force complete cache reset for immediate update
        await queryClient.resetQueries({ queryKey: ["/api/audio"] });
        console.log("Audio recorder: Cache reset completed successfully");
      } catch (error) {
        console.error("Audio recorder: Cache reset failed:", error);
        // Fallback to invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ["/api/audio"] });
        await queryClient.refetchQueries({ queryKey: ["/api/audio"] });
      }
      toast({
        title: "Recording saved",
        description: "Your audio recording has been successfully saved.",
      });
      // Reset recorder state
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Upload failed",
        description: "Failed to save your recording. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      mediaRecorder.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record audio.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isRecording]);

  const playRecording = useCallback(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl]);

  const pauseRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const saveRecording = useCallback(() => {
    if (audioBlob) {
      const formData = new FormData();
      const fileName = `recording_${Date.now()}.wav`;
      formData.append('audio', audioBlob, fileName);
      uploadMutation.mutate(formData);
    }
  }, [audioBlob, uploadMutation]);

  const cancelRecording = useCallback(() => {
    // Clean up audio URL to free memory
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    // Reset all recording state
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="text-center py-8">
      <div className="w-32 h-32 bg-medical-teal bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
        <Mic 
          className={`text-medical-teal text-4xl ${isRecording ? 'animate-pulse text-red-500' : ''}`} 
          size={48}
        />
      </div>
      
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">Recording Duration</p>
        <p className="text-2xl font-mono font-bold text-professional-grey">
          {formatTime(recordingTime)}
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {!isRecording ? (
          <Button 
            onClick={startRecording}
            className="bg-medical-teal hover:bg-medical-teal/90 text-white"
            disabled={uploadMutation.isPending}
          >
            <Mic className="mr-2" size={16} />
            Start Recording
          </Button>
        ) : (
          <Button 
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            <Square className="mr-2" size={16} />
            Stop Recording
          </Button>
        )}
      </div>

      {/* Playback Controls */}
      {audioUrl && (
        <div className="space-y-4">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          
          <div className="flex justify-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={isPlaying ? pauseRecording : playRecording}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            
            <Button
              size="sm"
              onClick={saveRecording}
              disabled={uploadMutation.isPending}
              className="bg-health-green hover:bg-health-green/90 text-white"
            >
              {uploadMutation.isPending ? 'Saving...' : 'Save Recording'}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={cancelRecording}
              disabled={uploadMutation.isPending}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Waveform Visualization Placeholder */}
      <div className="mt-6 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
        {isRecording ? (
          <div className="flex items-end space-x-1">
            <div className="w-1 h-4 bg-medical-teal rounded animate-pulse"></div>
            <div className="w-1 h-8 bg-medical-teal rounded animate-pulse" style={{animationDelay: '0.1s'}}></div>
            <div className="w-1 h-6 bg-medical-teal rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-1 h-10 bg-medical-teal rounded animate-pulse" style={{animationDelay: '0.3s'}}></div>
            <div className="w-1 h-5 bg-medical-teal rounded animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Audio visualization will appear here during recording</p>
        )}
      </div>
    </div>
  );
}
