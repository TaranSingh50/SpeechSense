import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { AudioRecorder } from "@/components/audio-recorder";
import { FileUpload } from "@/components/file-upload";
import { 
  Mic, 
  Upload, 
  Play, 
  Pause,
  TrendingUp, 
  Trash2, 
  FileAudio,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

export default function AudioManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch audio files with more aggressive refresh settings
  const { data: audioFiles = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/audio"],
    enabled: !!user,
    staleTime: 0, // Always consider data stale
    cacheTime: 0, // Don't cache results
  });

  // Delete audio file mutation
  const deleteAudioMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest("DELETE", `/api/audio/${fileId}`);
    },
    onSuccess: () => {
      // Force immediate refresh of the audio library
      queryClient.invalidateQueries({ queryKey: ["/api/audio"] });
      refetch(); // Force immediate refetch
      toast({
        title: "File deleted",
        description: "Audio file has been successfully deleted.",
      });
      // Stop playing if this file was playing
      if (playingAudioId) {
        setPlayingAudioId(null);
        if (audioRef.current) {
          audioRef.current.pause();
        }
      }
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
        title: "Error",
        description: "Failed to delete audio file. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto refresh function (called after any library changes)
  const autoRefreshLibrary = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/audio"] });
  };

  // Audio playback functions
  const playAudio = async (fileId: string, fileName: string) => {
    try {
      // If same audio is playing, pause it
      if (playingAudioId === fileId) {
        if (audioRef.current) {
          audioRef.current.pause();
          setPlayingAudioId(null);
        }
        return;
      }

      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Get access token for audio streaming
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        toast({
          title: "Authentication required",
          description: "Please log in to play audio files.",
          variant: "destructive",
        });
        return;
      }

      // Fetch audio stream with proper authentication
      const response = await fetch(`/api/audio/${fileId}/stream`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load audio');
      }

      // Create blob URL from response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create audio element and play
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingAudioId(null);
        URL.revokeObjectURL(audioUrl); // Clean up blob URL
      };
      
      audio.onerror = () => {
        toast({
          title: "Playback error",
          description: "Unable to play this audio file.",
          variant: "destructive",
        });
        setPlayingAudioId(null);
        URL.revokeObjectURL(audioUrl); // Clean up blob URL
      };

      setPlayingAudioId(fileId);
      await audio.play();
      
    } catch (error) {
      toast({
        title: "Playback error", 
        description: "Unable to play this audio file.",
        variant: "destructive",
      });
      setPlayingAudioId(null);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingAudioId(null);
  };

  return (
    <div className="min-h-screen bg-clinical-white">
      <div className="flex">
        {/* Sidebar - Simplified for page */}
        <div className="w-64 bg-white shadow-lg border-r border-gray-200 min-h-screen">
          <div className="p-6 border-b border-gray-200">
            <Link href="/" className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-medical-teal rounded-lg flex items-center justify-center">
                <Mic className="text-white" size={20} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-professional-grey">SpeechPath</h3>
                <p className="text-sm text-gray-500">Audio Management</p>
              </div>
            </Link>
          </div>

          <nav className="mt-6">
            <ul className="space-y-2 px-4">
              <li>
                <Link 
                  href="/"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>Back to Dashboard</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-professional-grey mb-2">Audio Management</h1>
            <p className="text-gray-600">Record, upload, and manage audio files for speech analysis</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Recording Interface */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-heading font-semibold text-professional-grey mb-4">Live Recording</h3>
                <AudioRecorder />
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-heading font-semibold text-professional-grey mb-4">Upload Audio File</h3>
                <FileUpload />
              </CardContent>
            </Card>
          </div>

          {/* Audio File Library */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-heading font-semibold text-professional-grey mb-4">Audio File Library</h3>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (audioFiles as any[]).length > 0 ? (
                <div className="space-y-4">
                  {(audioFiles as any[]).map((file: any) => (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-medical-teal bg-opacity-10 rounded-lg flex items-center justify-center">
                          <FileAudio className="text-medical-teal" size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-professional-grey">{file.originalName}</p>
                          <p className="text-sm text-gray-500">
                            {(file.fileSize / 1024 / 1024).toFixed(1)} MB • {file.duration ? `${Math.floor(file.duration / 60)}:${(file.duration % 60).toString().padStart(2, '0')}` : 'Duration unknown'} • Uploaded {new Date(file.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-600 hover:text-medical-teal"
                          title={playingAudioId === file.id ? "Pause Audio" : "Play Audio"}
                          onClick={() => playingAudioId === file.id ? stopAudio() : playAudio(file.id, file.originalName)}
                        >
                          {playingAudioId === file.id ? <Pause size={16} /> : <Play size={16} />}
                        </Button>
                        <Link href="/analysis">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-600 hover:text-trustworthy-blue"
                            title="Analyze Audio"
                          >
                            <TrendingUp size={16} />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-600 hover:text-red-500"
                          title="Delete Audio"
                          onClick={() => deleteAudioMutation.mutate(file.id)}
                          disabled={deleteAudioMutation.isPending}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileAudio className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No audio files uploaded yet</p>
                  <p className="text-sm text-gray-400">Start by recording audio or uploading a file above</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
