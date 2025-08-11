import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  FileText, 
  Download, 
  Share, 
  Copy,
  Eye,
  ArrowLeft,
  Filter,
  SortAsc,
  CheckCircle,
  Trash2
} from "lucide-react";
import { Link } from "wouter";
import type { SpeechAnalysis, Report } from "../../../shared/schema";

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [reportForm, setReportForm] = useState({
    analysisId: '',
    patientId: user?.id || '',
    title: '',
    reportType: 'comprehensive',
    includeSections: ['analysis', 'recommendations'],
  });

  // Fetch analyses for report generation
  const { data: analyses = [] } = useQuery<SpeechAnalysis[]>({
    queryKey: ["/api/analysis"],
    enabled: !!user,
  });

  // Fetch existing reports
  const { data: reports = [], isLoading: reportsLoading, error: reportsError } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
    enabled: !!user,
    refetchInterval: 5000, // Poll every 5 seconds to see new reports
  });
  


  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      return await apiRequest("POST", "/api/reports", reportData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Report generated",
        description: "Your clinical report has been successfully generated.",
      });
      // Reset form
      setReportForm({
        analysisId: '',
        patientId: user?.id || '',
        title: '',
        reportType: 'comprehensive',
        includeSections: ['analysis', 'recommendations'],
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
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return await apiRequest("DELETE", `/api/reports/${reportId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Report deleted",
        description: "The report has been successfully deleted.",
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
        description: "Failed to delete report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteReport = (reportId: string, reportTitle: string) => {
    if (confirm(`Are you sure you want to delete "${reportTitle}"? This action cannot be undone.`)) {
      deleteReportMutation.mutate(reportId);
    }
  };

  const handleGenerateReport = () => {
    if (!reportForm.analysisId || !reportForm.title) {
      toast({
        title: "Validation Error",
        description: "Please select an analysis and provide a report title.",
        variant: "destructive",
      });
      return;
    }

    const selectedAnalysis = analyses.find((a) => a.id === reportForm.analysisId);
    
    const reportData = {
      analysisId: reportForm.analysisId,
      patientId: reportForm.patientId,
      title: reportForm.title,
      reportType: reportForm.reportType,
      includeSections: reportForm.includeSections,
      content: {
        analysisResults: selectedAnalysis,
        generatedAt: new Date().toISOString(),
        therapistName: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email,
      },
    };

    generateReportMutation.mutate(reportData);
  };

  const completedAnalyses = analyses.filter((a) => a.status === 'completed');

  return (
    <div className="min-h-screen bg-clinical-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg border-r border-gray-200 min-h-screen">
          <div className="p-6 border-b border-gray-200">
            <Link href="/" className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-medical-teal rounded-lg flex items-center justify-center">
                <FileText className="text-white" size={20} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-professional-grey">SpeechPath</h3>
                <p className="text-sm text-gray-500">Clinical Reports</p>
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
            <h1 className="text-3xl font-heading font-bold text-professional-grey mb-2">Clinical Reports</h1>
            <p className="text-gray-600">Generate, view, and share professional diagnostic reports</p>
          </div>

          {/* Report Generation */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-heading font-semibold text-professional-grey mb-4">Generate New Report</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="analysis">Analysis Session</Label>
                  <Select value={reportForm.analysisId} onValueChange={(value) => setReportForm({...reportForm, analysisId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an analysis session" />
                    </SelectTrigger>
                    <SelectContent>
                      {completedAnalyses.map((analysis: any) => (
                        <SelectItem key={analysis.id} value={analysis.id}>
                          Analysis {analysis.id.slice(0, 8)}... - Score: {analysis.fluencyScore?.toFixed(1) || 'N/A'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select value={reportForm.reportType} onValueChange={(value) => setReportForm({...reportForm, reportType: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comprehensive">Comprehensive Diagnostic Report</SelectItem>
                      <SelectItem value="progress">Progress Summary</SelectItem>
                      <SelectItem value="treatment">Treatment Recommendation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="title">Report Title</Label>
                  <Input
                    id="title"
                    value={reportForm.title}
                    onChange={(e) => setReportForm({...reportForm, title: e.target.value})}
                    placeholder="Enter report title (e.g., Comprehensive Assessment - Patient Name)"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label>Include Sections</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="analysis"
                        checked={reportForm.includeSections.includes('analysis')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setReportForm({...reportForm, includeSections: [...reportForm.includeSections, 'analysis']});
                          } else {
                            setReportForm({...reportForm, includeSections: reportForm.includeSections.filter(s => s !== 'analysis')});
                          }
                        }}
                      />
                      <Label htmlFor="analysis">Analysis Results</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="recommendations"
                        checked={reportForm.includeSections.includes('recommendations')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setReportForm({...reportForm, includeSections: [...reportForm.includeSections, 'recommendations']});
                          } else {
                            setReportForm({...reportForm, includeSections: reportForm.includeSections.filter(s => s !== 'recommendations')});
                          }
                        }}
                      />
                      <Label htmlFor="recommendations">Recommendations</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="transcription"
                        checked={reportForm.includeSections.includes('transcription')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setReportForm({...reportForm, includeSections: [...reportForm.includeSections, 'transcription']});
                          } else {
                            setReportForm({...reportForm, includeSections: reportForm.includeSections.filter(s => s !== 'transcription')});
                          }
                        }}
                      />
                      <Label htmlFor="transcription">Audio Transcription</Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Button 
                  onClick={handleGenerateReport}
                  disabled={generateReportMutation.isPending || completedAnalyses.length === 0}
                  className="bg-medical-teal hover:bg-medical-teal/90"
                >
                  <FileText className="mr-2" size={16} />
                  {generateReportMutation.isPending ? "Generating..." : "Generate Report"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Generated Reports */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-heading font-semibold text-professional-grey">Generated Reports</h3>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <Filter className="mr-2" size={14} />
                    Filter
                  </Button>
                  <Button size="sm" variant="outline">
                    <SortAsc className="mr-2" size={14} />
                    Sort
                  </Button>
                </div>
              </div>

              {reportsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : reports.length > 0 ? (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-medical-teal bg-opacity-10 rounded-lg flex items-center justify-center">
                            <FileText className="text-medical-teal" size={20} />
                          </div>
                          <div>
                            <h4 className="font-medium text-professional-grey">{report.title}</h4>
                            <p className="text-sm text-gray-500">
                              Generated {new Date(report.createdAt).toLocaleDateString()} • {report.reportType} Report
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex px-3 py-1 text-sm font-medium bg-health-green bg-opacity-10 text-health-green rounded-full">
                          <CheckCircle className="mr-1" size={14} />
                          Completed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Report Type</p>
                          <p className="text-lg font-bold text-medical-teal capitalize">{report.reportType}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Sections</p>
                          <p className="text-lg font-bold text-trustworthy-blue">{report.includeSections?.length || 0}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Status</p>
                          <p className="text-lg font-bold text-health-green">Ready</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Button size="sm" className="bg-medical-teal hover:bg-medical-teal/90 text-white">
                          <Eye className="mr-2" size={14} />
                          View
                        </Button>
                        <Button size="sm" className="bg-trustworthy-blue hover:bg-trustworthy-blue/90 text-white">
                          <Download className="mr-2" size={14} />
                          Download PDF
                        </Button>
                        <Button size="sm" className="bg-health-green hover:bg-health-green/90 text-white">
                          <Share className="mr-2" size={14} />
                          Share
                        </Button>
                        <Button size="sm" variant="outline">
                          <Copy className="mr-2" size={14} />
                          Duplicate
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteReport(report.id, report.title)}
                          disabled={deleteReportMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="mr-2" size={14} />
                          {deleteReportMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-professional-grey mb-2">No Reports Generated</h4>
                  <p className="text-gray-500 mb-4">Create your first clinical report from a completed analysis</p>
                  {completedAnalyses.length === 0 ? (
                    <Link href="/analysis">
                      <Button className="bg-medical-teal hover:bg-medical-teal/90">
                        Complete an Analysis First
                      </Button>
                    </Link>
                  ) : (
                    <p className="text-sm text-gray-400">Use the form above to generate your first report</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
