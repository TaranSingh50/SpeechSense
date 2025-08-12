import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDuration, isRecorded, loadAudioDurations } from "@/utils/audioUtils";
import { 
  TrendingUp, 
  Download, 
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  FileAudio,
  Loader2,
  Eye,
  Mail,
  ZoomIn,
  ZoomOut,
  MessageSquare,
  FileText,
  HardDrive
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface AudioFile {
  id: string;
  originalName: string;
  fileSize: number;
  duration?: number;
}

interface Analysis {
  id: string;
  audioFileId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fluencyScore?: number;
  stutteringEvents?: number;
  speechRate?: number;
  averagePauseDuration?: number;
  confidenceLevel?: number;
  detectedEvents?: Array<{
    type: string;
    timestamp: string;
    duration: number;
  }>;
  analysisResults?: {
    transcription?: string;
    [key: string]: any;
  };
  completedAt?: string;
  createdAt: string;
}

export default function SpeechAnalysis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [selectedAudioFile, setSelectedAudioFile] = useState<string>('');
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [existingAnalysis, setExistingAnalysis] = useState<Analysis | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});

  const [analysisTimeout, setAnalysisTimeout] = useState<NodeJS.Timeout | null>(null);
  const [urlSearch, setUrlSearch] = useState('');

  // Extract audioId from URL parameters using browser's native location
  // Wouter's location only gives the pathname, not query params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUrlSearch(window.location.search);
    }
  }, [location]); // Update when route changes
  
  const urlParams = new URLSearchParams(urlSearch);
  const audioIdFromUrl = urlParams.get('audioId');
  
  // Enhanced debugging for URL extraction
  console.log("=== URL EXTRACTION DEBUG ===");
  console.log("Wouter location (pathname only):", location);
  console.log("Browser search params:", urlSearch);
  console.log("URLSearchParams entries:", Array.from(urlParams.entries()));
  console.log("Extracted audioId from URL:", audioIdFromUrl);
  console.log("===========================");

  // Fetch audio files
  const { data: audioFiles = [], isLoading: audioFilesLoading, error: audioFilesError } = useQuery<AudioFile[]>({
    queryKey: ["/api/audio"],
    enabled: !!user,
    retry: 1,
  });

  // Handle authentication errors
  useEffect(() => {
    if (audioFilesError) {
      console.error("Error loading audio files:", audioFilesError);
      // Check if it's an auth error
      if (audioFilesError.message?.includes('401')) {
        console.log("Authentication error detected, redirecting to login");
        setLocation('/login');
      }
    }
  }, [audioFilesError, setLocation]);

  // Load audio durations for Speech Analysis files
  const loadAnalysisDurations = async (files: AudioFile[]) => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;
    
    const newDurations = await loadAudioDurations(files, audioDurations, accessToken);
    
    if (Object.keys(newDurations).length > 0) {
      setAudioDurations(prev => ({ ...prev, ...newDurations }));
    }
  };

  // Load durations when audio files change
  useEffect(() => {
    if (audioFiles && audioFiles.length > 0) {
      loadAnalysisDurations(audioFiles);
    }
  }, [audioFiles]);

  // Fetch analyses with aggressive polling when processing  
  const { data: analyses = [] } = useQuery<Analysis[]>({
    queryKey: ["/api/analysis"],
    enabled: !!user,
    refetchInterval: 3000, // Poll every 3 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data
  });

  // Query for existing analysis when auto-selecting from URL
  const { data: existingAnalysisFromQuery } = useQuery<Analysis | null>({
    queryKey: ["/api/analysis/audio", audioIdFromUrl],
    queryFn: async () => {
      if (!audioIdFromUrl) return null;
      try {
        const response = await fetch(`/api/analysis/audio/${audioIdFromUrl}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        if (response.ok) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error("Error fetching existing analysis:", error);
        return null;
      }
    },
    enabled: !!audioIdFromUrl && !!user,
    staleTime: 0,
  });

  // Auto-select audio file from URL and handle existing analysis
  useEffect(() => {
    console.log("=== AUTO-SELECTION EFFECT DEBUG ===");
    console.log("Effect triggered with dependencies:");
    console.log("- audioIdFromUrl:", audioIdFromUrl);
    console.log("- audioFiles.length:", audioFiles.length);
    console.log("- audioFiles IDs:", audioFiles.map(f => f.id));
    console.log("- currentSelectedAudioFile:", selectedAudioFile);
    console.log("- location:", location);
    console.log("- audioFilesLoading:", audioFilesLoading);
    
    if (audioIdFromUrl && audioFiles.length > 0 && !audioFilesLoading) {
      const audioFile = audioFiles.find(file => file.id === audioIdFromUrl);
      console.log("Searching for audio file with ID:", audioIdFromUrl);
      console.log("Found matching audio file:", audioFile);
      
      if (audioFile) {
        console.log(`✅ Auto-selecting audio file: ${audioFile.originalName} (ID: ${audioIdFromUrl})`);
        setSelectedAudioFile(audioIdFromUrl);
        
        // Handle existing analysis from dedicated query
        if (existingAnalysisFromQuery && existingAnalysisFromQuery.status === 'completed') {
          console.log(`Found existing completed analysis for audio file: ${audioIdFromUrl}`);
          setExistingAnalysis(existingAnalysisFromQuery);
          setCurrentAnalysis(existingAnalysisFromQuery);
          toast({
            title: "Existing Analysis Found",
            description: "Displaying previously completed analysis for this audio file.",
          });
        } else {
          console.log(`No existing completed analysis found for audio file: ${audioIdFromUrl}`);
          setExistingAnalysis(null);
          setCurrentAnalysis(null);
        }
      } else {
        console.warn(`❌ Audio file with ID ${audioIdFromUrl} not found in loaded files`);
        console.log("Available file IDs:", audioFiles.map(f => `${f.id} (${f.originalName})`));
      }
    } else {
      console.log("Auto-selection conditions not met:");
      console.log(`- Has audioIdFromUrl: ${!!audioIdFromUrl}`);
      console.log(`- Has audioFiles: ${audioFiles.length > 0}`);
      console.log(`- Not loading: ${!audioFilesLoading}`);
      
      if (!audioIdFromUrl && selectedAudioFile && location.split('?')[0] === '/analysis') {
        console.log("No audioId in URL, resetting selection");
        setSelectedAudioFile('');
        setCurrentAnalysis(null);
        setExistingAnalysis(null);
      }
    }
    console.log("=== END AUTO-SELECTION DEBUG ===");
  }, [audioIdFromUrl, audioFiles, existingAnalysisFromQuery, location, audioFilesLoading]);

  // Start analysis mutation
  const startAnalysisMutation = useMutation<Analysis, Error, string>({
    mutationFn: async (audioFileId: string): Promise<Analysis> => {
      const response = await apiRequest("POST", "/api/analysis", { audioFileId });
      const createdAnalysis = await response.json();
      
      // Wait for analysis to complete by polling the specific analysis
      let attempts = 0;
      const maxAttempts = 150; // 5 minutes at 2-second intervals
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        try {
          const statusResponse = await apiRequest("GET", `/api/analysis/${createdAnalysis.id}`);
          const updatedAnalysis = await statusResponse.json();
          
          if (updatedAnalysis.status === 'completed') {
            return updatedAnalysis;
          } else if (updatedAnalysis.status === 'failed') {
            throw new Error('Analysis failed');
          }
          
          attempts++;
        } catch (error) {
          console.error('Error checking analysis status:', error);
          attempts++;
        }
      }
      
      throw new Error('Analysis timed out');
    },
    onSuccess: (completedAnalysis: Analysis) => {
      // Clear timeout since analysis completed
      if (analysisTimeout) {
        clearTimeout(analysisTimeout);
        setAnalysisTimeout(null);
      }
      
      // Set the completed analysis directly
      setCurrentAnalysis(completedAnalysis);
      
      // Refresh the analyses list for the library
      queryClient.refetchQueries({ queryKey: ["/api/analysis"] });
      
      toast({
        title: "Analysis completed",
        description: "Speech analysis is ready for review.",
      });
    },
    onMutate: () => {
      // Set up timeout for analysis (5 minutes)
      const timeout = setTimeout(() => {
        toast({
          title: "Analysis Timeout",
          description: "The analysis is taking longer than expected. Please try again or contact support.",
          variant: "destructive",
        });
        setCurrentAnalysis(null); // Reset the current analysis
      }, 5 * 60 * 1000); // 5 minutes
      
      setAnalysisTimeout(timeout);
      
      toast({
        title: "Analysis started",
        description: "Speech analysis is now processing. This may take a few minutes.",
      });
    },
    onError: (error) => {
      // Clear timeout on error
      if (analysisTimeout) {
        clearTimeout(analysisTimeout);
        setAnalysisTimeout(null);
      }
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to start analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate PDF mutation
  const generatePDFMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      return await apiRequest("POST", "/api/analysis/generate-pdf", { analysisId });
    },
    onSuccess: () => {
      setShowPDFPreview(true);
      toast({
        title: "PDF Generated",
        description: "Your analysis report PDF has been generated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    },
  });



  const handleStartAnalysis = () => {
    if (!selectedAudioFile) {
      toast({
        title: "No file selected",
        description: "Please select an audio file to analyze.",
        variant: "destructive",
      });
      return;
    }

    // Check if analysis already exists for this audio file using more reliable method
    const existingAnalysisForFile = analyses.find(analysis => 
      analysis.audioFileId === selectedAudioFile && analysis.status === 'completed'
    ) || existingAnalysis;

    console.log(`Starting analysis for audio file: ${selectedAudioFile}`);
    console.log(`Existing completed analysis found:`, existingAnalysisForFile ? 'Yes' : 'No');

    if (existingAnalysisForFile) {
      // Use existing analysis - don't create new one
      console.log(`Using existing analysis: ${existingAnalysisForFile.id}`);
      setCurrentAnalysis(existingAnalysisForFile);
      setExistingAnalysis(existingAnalysisForFile);
      setShowPDFPreview(false);
      
      toast({
        title: "Analysis Retrieved",
        description: "Displaying existing analysis data for this audio file.",
      });
      return;
    }

    // No existing analysis - create new one
    console.log(`Creating new analysis for audio file: ${selectedAudioFile}`);
    setCurrentAnalysis(null);
    setExistingAnalysis(null);
    setShowPDFPreview(false);
    
    // Clear any existing timeout
    if (analysisTimeout) {
      clearTimeout(analysisTimeout);
      setAnalysisTimeout(null);
    }
    
    startAnalysisMutation.mutate(selectedAudioFile);
  };

  const handleDownloadPDF = async (analysisId: string) => {
    try {
      const response = await apiRequest("GET", `/api/analysis/${analysisId}/pdf`);
      const blob = await response.blob();
      
      // Create blob URL and download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `speech-analysis-${analysisId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Complete",
        description: "Your PDF report has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };





  // Get selected audio file details (but only show details after analysis starts)
  const selectedAudio = audioFiles.find(file => file.id === selectedAudioFile);
  
  // Only show analysis if user has started one
  const isProcessing = currentAnalysis && (currentAnalysis.status === 'processing' || currentAnalysis.status === 'pending');
  const isCompleted = currentAnalysis && currentAnalysis.status === 'completed';

  return (
    <div className="min-h-screen bg-clinical-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg border-r border-gray-200 min-h-screen">
          <div className="p-6 border-b border-gray-200">
            <Link href="/" className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-medical-teal rounded-lg flex items-center justify-center">
                <TrendingUp className="text-white" size={20} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-professional-grey">SpeechPath</h3>
                <p className="text-sm text-gray-500">Speech Analysis</p>
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
            <h1 className="text-3xl font-heading font-bold text-professional-grey mb-2">Speech Analysis</h1>
            <p className="text-gray-600">AI-powered stuttering detection and speech pattern analysis</p>
          </div>

          {/* Start New Analysis Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileAudio className="mr-2" size={20} />
                Start New Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {audioIdFromUrl && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="text-blue-600" size={16} />
                      <span className="text-sm font-medium text-blue-800">
                        Auto-selected from {audioIdFromUrl.includes('audio_') ? 'Audio Library' : 'Dashboard'}
                      </span>
                      {selectedAudioFile === audioIdFromUrl && (
                        <Badge variant="outline" className="ml-auto bg-green-50 text-green-700">
                          ✓ Applied
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Audio File
                  </label>
                  <select 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-teal focus:border-transparent bg-white"
                    value={selectedAudioFile}
                    onChange={(e) => {
                      console.log("HTML Select dropdown changed to:", e.target.value);
                      const newValue = e.target.value;
                      setSelectedAudioFile(newValue);
                      
                      // Reset analysis state when changing files
                      setCurrentAnalysis(null);
                      setExistingAnalysis(null);
                      
                      // Update URL to reflect the selection (optional, for consistency)
                      if (newValue) {
                        setLocation(`/analysis?audioId=${newValue}`);
                      } else {
                        setLocation('/analysis');
                      }
                    }}
                    data-testid="select-audio-file"
                    disabled={audioFilesLoading}
                  >
                    <option value="" disabled>
                      {audioFilesLoading ? "Loading audio files..." : "Choose an audio file to analyze"}
                    </option>
                    {audioFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.originalName} ({(file.fileSize / 1024 / 1024).toFixed(1)} MB)
                        {(audioDurations[file.id] || file.duration) && 
                          ` - ${formatDuration(audioDurations[file.id] || file.duration!)}`
                        }
                      </option>
                    ))}
                  </select>
                  {audioIdFromUrl && selectedAudioFile && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Audio file auto-selected from navigation
                    </p>
                  )}
                </div>
                
                {existingAnalysis && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="text-green-600" size={16} />
                      <span className="text-sm font-medium text-green-800">
                        Existing analysis found for this file
                      </span>
                      <Badge variant="outline" className="ml-auto">
                        Analyzed on {new Date(existingAnalysis.completedAt || existingAnalysis.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleStartAnalysis}
                  disabled={!selectedAudioFile || startAnalysisMutation.isPending}
                  className="bg-medical-teal hover:bg-medical-teal/90"
                  data-testid="button-start-analysis"
                >
                  {startAnalysisMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting Analysis...
                    </>
                  ) : existingAnalysis ? (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      View Existing Analysis
                    </>
                  ) : (
                    <>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Start New Analysis
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Progress Animation - Only show during processing */}
          {isProcessing && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5 animate-spin text-medical-teal" />
                  Analysis in Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Processing Audio</span>
                        <span className="text-sm text-gray-500">
                          {currentAnalysis?.status === 'processing' ? '75%' : '25%'}
                        </span>
                      </div>
                      <Progress 
                        value={currentAnalysis?.status === 'processing' ? 75 : 25} 
                        className="h-3"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-medical-teal" />
                    <span className="text-sm text-gray-600">
                      {currentAnalysis?.status === 'processing' 
                        ? "Analyzing speech patterns and generating transcription..."
                        : "Initializing analysis pipeline..."
                      }
                    </span>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      Analysis typically takes 2-5 minutes depending on audio length. 
                      You can leave this page and return later - we'll save your progress.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Details Section - Only show when analysis is completed */}
          {isCompleted && currentAnalysis && (
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5 text-health-green" />
                    Analysis Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Basic File Info */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4">Basic File Info</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="p-4">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                          <p className="text-sm text-gray-600">File Name</p>
                          <p className="font-semibold text-sm" data-testid="text-file-name">
                            {selectedAudio?.originalName || 'N/A'}
                          </p>
                        </div>
                      </Card>
                      
                      <Card className="p-4">
                        <div className="text-center">
                          <HardDrive className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                          <p className="text-sm text-gray-600">File Size</p>
                          <p className="font-semibold" data-testid="text-file-size">
                            {selectedAudio ? `${(selectedAudio.fileSize / 1024 / 1024).toFixed(1)} MB` : 'N/A'}
                          </p>
                        </div>
                      </Card>
                      
                      <Card className="p-4">
                        <div className="text-center">
                          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                          <p className="text-sm text-gray-600">Audio Duration</p>
                          <p className="font-semibold" data-testid="text-audio-duration">
                            {(selectedAudio?.id && audioDurations[selectedAudio.id]) || selectedAudio?.duration
                              ? formatDuration((selectedAudio.id && audioDurations[selectedAudio.id]) || selectedAudio.duration!)
                              : 'N/A (Could not be calculated)'
                            }
                          </p>
                        </div>
                      </Card>
                      
                      <Card className="p-4">
                        <div className="text-center">
                          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                          <p className="text-sm text-gray-600">Speech Rate</p>
                          <p className="font-semibold" data-testid="text-speech-rate">
                            {currentAnalysis.speechRate && isFinite(currentAnalysis.speechRate)
                              ? `${Math.round(currentAnalysis.speechRate)} WPM`
                              : 'N/A (Could not be calculated)'
                            }
                          </p>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* Audio Transcription Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4">Audio Transcription</h3>
                    <Card className="p-6">
                      <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-4" data-testid="transcription-view">
                        {currentAnalysis?.analysisResults?.transcription ? (
                          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {currentAnalysis.analysisResults.transcription}
                          </p>
                        ) : (
                          <div className="text-center py-8">
                            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">
                              Transcription is not available for this analysis.
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                              Please check the analysis results or try re-running the analysis.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex items-center space-x-2">
                        <Badge variant="outline">
                          <MessageSquare className="mr-1 h-3 w-3" />
                          Confidence: {currentAnalysis.confidenceLevel && isFinite(currentAnalysis.confidenceLevel) 
                            ? `${Math.round(currentAnalysis.confidenceLevel * 100)}%` 
                            : 'N/A'
                          }
                        </Badge>
                        <Badge variant="outline">
                          Events Detected: {currentAnalysis.stutteringEvents || 0}
                        </Badge>
                        <Badge variant="outline">
                          Fluency Score: {currentAnalysis.fluencyScore && isFinite(currentAnalysis.fluencyScore)
                            ? `${currentAnalysis.fluencyScore.toFixed(1)}/10`
                            : 'N/A'
                          }
                        </Badge>
                      </div>
                    </Card>
                  </div>

                  {/* PDF Actions */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">PDF Actions</h3>
                    <div className="flex flex-wrap gap-4 mb-6">
                      <Button
                        onClick={() => generatePDFMutation.mutate(currentAnalysis.id)}
                        disabled={generatePDFMutation.isPending}
                        className="bg-trustworthy-blue hover:bg-trustworthy-blue/90"
                        data-testid="button-generate-pdf"
                      >
                        {generatePDFMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            Generate PDF
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={() => handleDownloadPDF(currentAnalysis.id)}
                        variant="outline"
                        disabled={!showPDFPreview}
                        data-testid="button-download-pdf"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                      

                    </div>

                    {/* PDF Preview */}
                    {showPDFPreview && (
                      <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold">PDF Preview</h4>

                        </div>
                        
                        <div 
                          className="border border-gray-300 rounded-lg bg-white p-8 min-h-[600px] overflow-auto"
                          data-testid="pdf-preview-pane"
                        >
                          <div className="max-w-2xl mx-auto">
                            <div className="text-center mb-8">
                              <h2 className="text-2xl font-bold text-gray-800">Speech Analysis Report</h2>
                              <p className="text-gray-600 mt-2">Generated on {new Date().toLocaleDateString()}</p>
                              <p className="text-gray-600">Analysis ID: {currentAnalysis.id}</p>
                            </div>
                            
                            <div className="space-y-6">
                              <div>
                                <h3 className="text-lg font-semibold mb-2">File Information</h3>
                                <div className="bg-gray-50 p-4 rounded">
                                  <p><strong>File:</strong> {selectedAudio?.originalName || 'N/A'}</p>
                                  <p><strong>Size:</strong> {selectedAudio ? `${(selectedAudio.fileSize / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</p>
                                  <p><strong>Duration:</strong> {
                                    (selectedAudio?.id && audioDurations[selectedAudio.id]) || selectedAudio?.duration
                                      ? formatDuration((selectedAudio.id && audioDurations[selectedAudio.id]) || selectedAudio.duration!)
                                      : 'N/A'
                                  }</p>
                                </div>
                              </div>
                              
                              <div>
                                <h3 className="text-lg font-semibold mb-2">Analysis Results</h3>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-sm text-gray-600">Fluency Score</p>
                                    <p className="font-semibold">
                                      {currentAnalysis.fluencyScore && isFinite(currentAnalysis.fluencyScore) 
                                        ? `${currentAnalysis.fluencyScore.toFixed(1)}/10` 
                                        : 'N/A'
                                      }
                                    </p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-sm text-gray-600">Speech Rate</p>
                                    <p className="font-semibold">
                                      {currentAnalysis.speechRate && isFinite(currentAnalysis.speechRate) 
                                        ? `${Math.round(currentAnalysis.speechRate)} WPM` 
                                        : 'N/A'
                                      }
                                    </p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-sm text-gray-600">Stuttering Events</p>
                                    <p className="font-semibold">{currentAnalysis.stutteringEvents || 0}</p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-sm text-gray-600">Confidence</p>
                                    <p className="font-semibold">
                                      {currentAnalysis.confidenceLevel && isFinite(currentAnalysis.confidenceLevel)
                                        ? `${Math.round(currentAnalysis.confidenceLevel * 100)}%`
                                        : 'N/A'
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {currentAnalysis.analysisResults?.transcription && (
                                <div>
                                  <h3 className="text-lg font-semibold mb-2">Transcription</h3>
                                  <div className="bg-gray-50 p-4 rounded">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                      {currentAnalysis.analysisResults.transcription}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}




          {/* No Analysis State */}
          {!isProcessing && !isCompleted && !currentAnalysis && (
            <Card>
              <CardContent className="p-12 text-center">
                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-professional-grey mb-2">No Analyses Yet</h3>
                <p className="text-gray-500 mb-4">Upload an audio file and start your first speech analysis</p>
                <Link href="/audio-management">
                  <Button className="bg-medical-teal hover:bg-medical-teal/90">
                    Go to Audio Management
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}