import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { WaveformVisualizer } from "@/components/waveform-visualizer";
import { 
  Mic, 
  TrendingUp, 
  FileText, 
  Download, 
  RotateCcw,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  FileAudio
} from "lucide-react";
import { Link } from "wouter";

export default function SpeechAnalysis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAudioFile, setSelectedAudioFile] = useState<string | null>(null);

  // Fetch audio files
  const { data: audioFiles = [] } = useQuery({
    queryKey: ["/api/audio"],
    enabled: !!user,
  });

  // Fetch analyses with polling for processing status
  const { data: analyses = [], isLoading: analysesLoading } = useQuery({
    queryKey: ["/api/analysis"],
    enabled: !!user,
    refetchInterval: (data) => {
      // Poll every 2 seconds if any analyses are still processing
      const hasProcessingAnalyses = Array.isArray(data) && data.some((analysis: any) => 
        analysis.status === 'processing' || analysis.status === 'pending'
      );
      console.log('Polling check:', { 
        dataLength: Array.isArray(data) ? data.length : 'not array',
        hasProcessing: hasProcessingAnalyses,
        statuses: Array.isArray(data) ? data.map((a: any) => a.status) : 'no data'
      });
      return hasProcessingAnalyses ? 2000 : false;
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-health-green" size={20} />;
      case 'processing':
        return <Clock className="text-trustworthy-blue animate-spin" size={20} />;
      case 'failed':
        return <AlertCircle className="text-red-500" size={20} />;
      default:
        return <Clock className="text-gray-400" size={20} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex px-3 py-1 text-sm font-medium rounded-full";
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-health-green bg-opacity-10 text-health-green`;
      case 'processing':
        return `${baseClasses} bg-trustworthy-blue bg-opacity-10 text-trustworthy-blue`;
      case 'failed':
        return `${baseClasses} bg-red-500 bg-opacity-10 text-red-500`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-600`;
    }
  };

  const currentAnalysis = (analyses as any[]).find((a: any) => a.status === 'processing') || (analyses as any[])[0];

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

          {/* Start New Analysis */}
          {(audioFiles as any[]).length > 0 && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="text-lg font-heading font-semibold text-professional-grey mb-4">Start New Analysis</h3>
                <div className="flex items-center space-x-4">
                  <select 
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={selectedAudioFile || ''}
                    onChange={(e) => setSelectedAudioFile(e.target.value)}
                  >
                    <option value="">Select an audio file to analyze</option>
                    {(audioFiles as any[]).map((file: any) => (
                      <option key={file.id} value={file.id}>
                        {file.originalName} ({(file.fileSize / 1024 / 1024).toFixed(1)} MB)
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => selectedAudioFile && startAnalysisMutation.mutate(selectedAudioFile)}
                    disabled={!selectedAudioFile || startAnalysisMutation.isPending}
                    className="bg-medical-teal hover:bg-medical-teal/90"
                  >
                    {startAnalysisMutation.isPending ? "Starting..." : "Start Analysis"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Analysis Status */}
          {currentAnalysis && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-heading font-semibold text-professional-grey">Current Analysis</h3>
                  <span className={getStatusBadge(currentAnalysis.status)}>
                    {currentAnalysis.status}
                  </span>
                </div>

                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-medical-teal bg-opacity-10 rounded-lg flex items-center justify-center">
                    <FileAudio className="text-medical-teal" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-professional-grey">Analysis in progress</p>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(currentAnalysis.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {currentAnalysis.status === 'processing' && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Analysis Progress</span>
                      <span className="text-sm text-gray-600">Processing...</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-medical-teal h-3 rounded-full animate-pulse" style={{width: "60%"}}></div>
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-600">
                  {currentAnalysis.status === 'processing' 
                    ? "Currently processing: Stuttering pattern detection..."
                    : currentAnalysis.status === 'completed'
                    ? "Analysis completed successfully"
                    : "Analysis failed - please try again"
                  }
                </p>
              </CardContent>
            </Card>
          )}

          {/* Analysis Results */}
          {(analyses as any[]).length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Main Results */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-heading font-semibold text-professional-grey mb-4">Detection Results</h3>
                  
                  {(analyses as any[]).filter((a: any) => a.status === 'completed').map((analysis: any) => (
                    <div key={analysis.id} className="space-y-6">
                      {/* Overall Score */}
                      <div className="text-center">
                        <div className="w-24 h-24 bg-medical-teal bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl font-bold text-medical-teal">
                            {analysis.fluencyScore ? analysis.fluencyScore.toFixed(1) : '---'}
                          </span>
                        </div>
                        <p className="font-medium text-professional-grey">Fluency Score</p>
                        <p className="text-sm text-gray-500">Out of 10 (Higher is better)</p>
                      </div>

                      {/* Detection Metrics */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-professional-grey">Stuttering Events</span>
                          <span className="text-sm font-bold text-warm-orange">
                            {analysis.stutteringEvents || 0}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-professional-grey">Speech Rate</span>
                          <span className="text-sm font-bold text-trustworthy-blue">
                            {analysis.speechRate ? `${Math.round(analysis.speechRate)} WPM` : 'N/A'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-professional-grey">Pause Duration</span>
                          <span className="text-sm font-bold text-health-green">
                            {analysis.averagePauseDuration ? `${analysis.averagePauseDuration.toFixed(1)}s avg` : 'N/A'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-professional-grey">Confidence Level</span>
                          <span className="text-sm font-bold text-medical-teal">
                            {analysis.confidenceLevel ? `${Math.round(analysis.confidenceLevel * 100)}%` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {analyses.filter((a: any) => a.status === 'completed').length === 0 && (
                    <div className="text-center py-8">
                      <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No completed analyses yet</p>
                      <p className="text-sm text-gray-400">Upload an audio file and start analysis to see results</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Detailed Analysis */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-heading font-semibold text-professional-grey mb-4">Pattern Analysis</h3>
                  
                  {/* Waveform Visualization */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-2">Audio Waveform with Stuttering Events</p>
                    <WaveformVisualizer />
                  </div>

                  {/* Event Timeline */}
                  <div>
                    <p className="text-sm text-gray-600 mb-3">Detected Events Timeline</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {analyses
                        .filter((a: any) => a.status === 'completed')
                        .flatMap((analysis: any) => analysis.detectedEvents || [])
                        .map((event: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                            <span className="text-professional-grey">{event.timestamp}</span>
                            <span className="text-warm-orange font-medium">{event.type}</span>
                            <span className="text-gray-500">{event.duration}s</span>
                          </div>
                        ))}
                      
                      {analyses.filter((a: any) => a.status === 'completed').length === 0 && (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm">No events detected yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="mb-8">
              <CardContent className="p-12 text-center">
                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-professional-grey mb-2">No Analyses Yet</h3>
                <p className="text-gray-500 mb-4">Upload an audio file and start your first speech analysis</p>
                <Link href="/audio">
                  <Button className="bg-medical-teal hover:bg-medical-teal/90">
                    Go to Audio Management
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {analyses.some((a: any) => a.status === 'completed') && (
            <div className="flex space-x-4">
              <Link href="/reports">
                <Button className="bg-medical-teal hover:bg-medical-teal/90 text-white">
                  <FileText className="mr-2" size={16} />
                  Generate Report
                </Button>
              </Link>
              
              <Button variant="outline" className="border-trustworthy-blue text-trustworthy-blue hover:bg-trustworthy-blue hover:text-white">
                <Download className="mr-2" size={16} />
                Export Analysis
              </Button>
              
              <Button variant="outline">
                <RotateCcw className="mr-2" size={16} />
                Re-run Analysis
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
