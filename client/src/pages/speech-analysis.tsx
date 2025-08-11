import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDuration } from "@/utils/audioUtils";
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
import { Link } from "wouter";

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
  const [selectedAudioFile, setSelectedAudioFile] = useState<string>('');
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [emailAddress, setEmailAddress] = useState('');
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  // Fetch audio files
  const { data: audioFiles = [] } = useQuery<AudioFile[]>({
    queryKey: ["/api/audio"],
    enabled: !!user,
  });

  // Fetch analyses with polling for processing status
  const { data: analyses = [] } = useQuery<Analysis[]>({
    queryKey: ["/api/analysis"],
    enabled: !!user,
    refetchInterval: (query) => {
      const queryData = query.state.data;
      const analysesArray = Array.isArray(queryData) ? queryData : [];
      const hasProcessingAnalyses = analysesArray.some((analysis: Analysis) => 
        analysis.status === 'processing' || analysis.status === 'pending'
      );
      return hasProcessingAnalyses ? 3000 : false;
    },
  });

  // Start analysis mutation
  const startAnalysisMutation = useMutation({
    mutationFn: async (audioFileId: string) => {
      return await apiRequest("POST", "/api/analysis", { audioFileId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis"] });
      toast({
        title: "Analysis started",
        description: "Speech analysis is now processing. This may take a few minutes.",
      });
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
        description: "Failed to start analysis. Please try again.",
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

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: { analysisId: string; email: string }) => {
      return await apiRequest("POST", "/api/analysis/send-report", data);
    },
    onSuccess: () => {
      setShowEmailDialog(false);
      setEmailAddress('');
      toast({
        title: "Email Sent",
        description: `PDF report has been sent to ${emailAddress}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
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
    startAnalysisMutation.mutate(selectedAudioFile);
  };

  const handleDownloadPDF = (analysisId: string) => {
    // Create download link for the actual PDF
    const link = document.createElement('a');
    link.href = `/api/analysis/${analysisId}/pdf`;
    link.download = `speech-analysis-${analysisId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download Started",
      description: "Your PDF report is being downloaded.",
    });
  };

  const handleSendEmail = (analysisId: string) => {
    if (!emailAddress) {
      toast({
        title: "No email address",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate({ analysisId, email: emailAddress });
  };

  // Find processing analysis or most recent completed one
  const processingAnalysis = analyses.find(a => a.status === 'processing' || a.status === 'pending');
  const completedAnalysis = analyses.find(a => a.status === 'completed');

  // Get selected audio file details
  const selectedAudio = audioFiles.find(file => file.id === selectedAudioFile);

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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Audio File
                  </label>
                  <select 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-teal focus:border-transparent"
                    value={selectedAudioFile}
                    onChange={(e) => setSelectedAudioFile(e.target.value)}
                    data-testid="select-audio-file"
                  >
                    <option value="">Choose an audio file to analyze</option>
                    {audioFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.originalName} ({(file.fileSize / 1024 / 1024).toFixed(1)} MB)
                        {file.duration && ` - ${formatDuration(file.duration)}`}
                      </option>
                    ))}
                  </select>
                </div>
                
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
                  ) : (
                    "Start Analysis"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Progress Animation - Only show during processing */}
          {processingAnalysis && (
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
                          {processingAnalysis.status === 'processing' ? '75%' : '25%'}
                        </span>
                      </div>
                      <Progress 
                        value={processingAnalysis.status === 'processing' ? 75 : 25} 
                        className="h-3"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-medical-teal" />
                    <span className="text-sm text-gray-600">
                      {processingAnalysis.status === 'processing' 
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
          {completedAnalysis && (
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
                            {selectedAudio?.duration 
                              ? formatDuration(selectedAudio.duration)
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
                            {completedAnalysis.speechRate && isFinite(completedAnalysis.speechRate)
                              ? `${Math.round(completedAnalysis.speechRate)} WPM`
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
                        {completedAnalysis.analysisResults?.transcription ? (
                          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {completedAnalysis.analysisResults.transcription}
                          </p>
                        ) : (
                          <div className="text-center py-8">
                            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">
                              Transcription could not be completed for this audio.
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                              The audio file may be too short, have poor quality, or contain no speech.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex items-center space-x-2">
                        <Badge variant="outline">
                          <MessageSquare className="mr-1 h-3 w-3" />
                          Confidence: {completedAnalysis.confidenceLevel && isFinite(completedAnalysis.confidenceLevel) 
                            ? `${Math.round(completedAnalysis.confidenceLevel * 100)}%` 
                            : 'N/A'
                          }
                        </Badge>
                        <Badge variant="outline">
                          Events Detected: {completedAnalysis.stutteringEvents || 0}
                        </Badge>
                        <Badge variant="outline">
                          Fluency Score: {completedAnalysis.fluencyScore && isFinite(completedAnalysis.fluencyScore)
                            ? `${completedAnalysis.fluencyScore.toFixed(1)}/10`
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
                        onClick={() => generatePDFMutation.mutate(completedAnalysis.id)}
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
                        onClick={() => handleDownloadPDF(completedAnalysis.id)}
                        variant="outline"
                        disabled={!showPDFPreview}
                        data-testid="button-download-pdf"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                      
                      <Button
                        onClick={() => setShowEmailDialog(true)}
                        variant="outline"
                        disabled={!showPDFPreview}
                        data-testid="button-share-email"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Share via Email
                      </Button>
                    </div>

                    {/* PDF Preview */}
                    {showPDFPreview && (
                      <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold">PDF Preview</h4>
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => setPdfZoom(Math.max(50, pdfZoom - 25))}
                              size="sm"
                              variant="outline"
                              disabled={pdfZoom <= 50}
                              data-testid="button-zoom-out"
                            >
                              <ZoomOut className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-gray-600 min-w-[60px] text-center">
                              {pdfZoom}%
                            </span>
                            <Button
                              onClick={() => setPdfZoom(Math.min(200, pdfZoom + 25))}
                              size="sm"
                              variant="outline"
                              disabled={pdfZoom >= 200}
                              data-testid="button-zoom-in"
                            >
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div 
                          className="border border-gray-300 rounded-lg bg-white p-8 min-h-[600px] overflow-auto"
                          style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: 'top left' }}
                          data-testid="pdf-preview-pane"
                        >
                          <div className="max-w-2xl mx-auto">
                            <div className="text-center mb-8">
                              <h2 className="text-2xl font-bold text-gray-800">Speech Analysis Report</h2>
                              <p className="text-gray-600 mt-2">Generated on {new Date().toLocaleDateString()}</p>
                              <p className="text-gray-600">Analysis ID: {completedAnalysis.id}</p>
                            </div>
                            
                            <div className="space-y-6">
                              <div>
                                <h3 className="text-lg font-semibold mb-2">File Information</h3>
                                <div className="bg-gray-50 p-4 rounded">
                                  <p><strong>File:</strong> {selectedAudio?.originalName || 'N/A'}</p>
                                  <p><strong>Size:</strong> {selectedAudio ? `${(selectedAudio.fileSize / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</p>
                                  <p><strong>Duration:</strong> {selectedAudio?.duration ? formatDuration(selectedAudio.duration) : 'N/A'}</p>
                                </div>
                              </div>
                              
                              <div>
                                <h3 className="text-lg font-semibold mb-2">Analysis Results</h3>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-sm text-gray-600">Fluency Score</p>
                                    <p className="font-semibold">
                                      {completedAnalysis.fluencyScore && isFinite(completedAnalysis.fluencyScore) 
                                        ? `${completedAnalysis.fluencyScore.toFixed(1)}/10` 
                                        : 'N/A'
                                      }
                                    </p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-sm text-gray-600">Speech Rate</p>
                                    <p className="font-semibold">
                                      {completedAnalysis.speechRate && isFinite(completedAnalysis.speechRate) 
                                        ? `${Math.round(completedAnalysis.speechRate)} WPM` 
                                        : 'N/A'
                                      }
                                    </p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-sm text-gray-600">Stuttering Events</p>
                                    <p className="font-semibold">{completedAnalysis.stutteringEvents || 0}</p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-sm text-gray-600">Confidence</p>
                                    <p className="font-semibold">
                                      {completedAnalysis.confidenceLevel && isFinite(completedAnalysis.confidenceLevel)
                                        ? `${Math.round(completedAnalysis.confidenceLevel * 100)}%`
                                        : 'N/A'
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {completedAnalysis.analysisResults?.transcription && (
                                <div>
                                  <h3 className="text-lg font-semibold mb-2">Transcription</h3>
                                  <div className="bg-gray-50 p-4 rounded">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                      {completedAnalysis.analysisResults.transcription}
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

          {/* Email Dialog */}
          {showEmailDialog && completedAnalysis && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-96 max-w-sm">
                <CardHeader>
                  <CardTitle>Share Report via Email</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-teal focus:border-transparent"
                        placeholder="Enter email address"
                        data-testid="input-email-address"
                      />
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => handleSendEmail(completedAnalysis.id)}
                        disabled={sendEmailMutation.isPending}
                        className="bg-medical-teal hover:bg-medical-teal/90 flex-1"
                        data-testid="button-send-email"
                      >
                        {sendEmailMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Send Email"
                        )}
                      </Button>
                      <Button
                        onClick={() => setShowEmailDialog(false)}
                        variant="outline"
                        data-testid="button-cancel-email"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* No Analysis State */}
          {!processingAnalysis && !completedAnalysis && analyses.length === 0 && (
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