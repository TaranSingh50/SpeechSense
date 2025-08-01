import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";
import { 
  Mic, 
  Users, 
  TrendingUp, 
  FileText, 
  Upload, 
  Calendar,
  Play,
  BarChart3,
  Trash2
} from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Home() {
  const { user, isLoading: authLoading, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
  });

  // Fetch recent audio files
  const { data: audioFiles = [], isLoading: audioLoading } = useQuery({
    queryKey: ["/api/audio"],
    enabled: !!user,
  });

  // Fetch recent analyses
  const { data: analyses = [], isLoading: analysesLoading } = useQuery({
    queryKey: ["/api/analysis"],
    enabled: !!user,
  });

  // Mock analytics data for dashboard
  const analytics = {
    totalSessions: 12,
    activePatients: 8,
    analysisComplete: 25,
    reportsGenerated: 15
  };

  // Handle unauthorized access
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/auth");
      }, 500);
      return;
    }
  }, [user, authLoading, toast]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-clinical-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-medical-teal bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic className="text-medical-teal animate-pulse" size={24} />
          </div>
          <p className="text-professional-grey">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const recentAudioFiles = Array.isArray(audioFiles) ? audioFiles.slice(0, 3) : [];
  const recentAnalyses = Array.isArray(analyses) ? analyses.slice(0, 3) : [];

  return (
    <div className="min-h-screen bg-clinical-white">
      {/* Sidebar */}
      <div className="flex">
        <div className="w-64 bg-white shadow-lg border-r border-gray-200 min-h-screen">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-medical-teal rounded-lg flex items-center justify-center">
                <Mic className="text-white" size={20} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-professional-grey">SpeechPath</h3>
                <p className="text-sm text-gray-500">Professional Platform</p>
              </div>
            </div>
          </div>

          <nav className="mt-6">
            <div className="px-6 mb-6">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                {user.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-medical-teal rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {user.firstName?.[0] || user.email?.[0] || 'U'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-professional-grey">
                    {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.email}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">{user.accountType || 'User'}</p>
                </div>
              </div>
            </div>

            <ul className="space-y-2 px-4">
              <li>
                <Link 
                  href="/"
                  className="flex items-center space-x-3 px-3 py-2 bg-medical-teal text-white rounded-lg"
                >
                  <BarChart3 size={16} />
                  <span>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/audio"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Mic size={16} />
                  <span>Audio Management</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/analysis"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <TrendingUp size={16} />
                  <span>Speech Analysis</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/reports"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FileText size={16} />
                  <span>Reports</span>
                </Link>
              </li>
            </ul>

            <div className="absolute bottom-6 left-4 right-4">
              <button 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="w-full flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <span>🚪</span>
                <span>{logoutMutation.isPending ? "Signing out..." : "Sign Out"}</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-professional-grey mb-2">Clinical Dashboard</h1>
            <p className="text-gray-600">Monitor speech therapy progress and diagnostic insights</p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                    <p className="text-2xl font-bold text-professional-grey">
                      {statsLoading ? "..." : (stats as any)?.totalSessions || 0}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-medical-teal bg-opacity-10 rounded-lg flex items-center justify-center">
                    <Mic className="text-medical-teal" size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-health-green text-sm font-medium">New</span>
                  <span className="text-gray-500 text-sm ml-1">audio files</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Patients</p>
                    <p className="text-2xl font-bold text-professional-grey">
                      {statsLoading ? "..." : (stats as any)?.activePatients || 1}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-trustworthy-blue bg-opacity-10 rounded-lg flex items-center justify-center">
                    <Users className="text-trustworthy-blue" size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-health-green text-sm font-medium">Active</span>
                  <span className="text-gray-500 text-sm ml-1">this week</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Analysis Complete</p>
                    <p className="text-2xl font-bold text-professional-grey">
                      {statsLoading ? "..." : `${(stats as any)?.analysisComplete || 0}%`}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-health-green bg-opacity-10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-health-green" size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-health-green text-sm font-medium">Processing</span>
                  <span className="text-gray-500 text-sm ml-1">efficiency</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Reports Generated</p>
                    <p className="text-2xl font-bold text-professional-grey">
                      {statsLoading ? "..." : (stats as any)?.reportsGenerated || 0}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-warm-orange bg-opacity-10 rounded-lg flex items-center justify-center">
                    <FileText className="text-warm-orange" size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-health-green text-sm font-medium">Ready</span>
                  <span className="text-gray-500 text-sm ml-1">to download</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Sessions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-heading font-semibold text-professional-grey mb-4">Recent Audio Files</h3>
                {audioLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentAudioFiles.length > 0 ? (
                  <div className="space-y-4">
                    {recentAudioFiles.map((file: any) => (
                      <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-medical-teal bg-opacity-10 rounded-lg flex items-center justify-center">
                            <Mic className="text-medical-teal" size={16} />
                          </div>
                          <div>
                            <p className="font-medium text-professional-grey">{file.originalName}</p>
                            <p className="text-sm text-gray-500">
                              {(file.fileSize / 1024 / 1024).toFixed(1)} MB • {new Date(file.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="ghost">
                            <Play size={14} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setLocation('/analysis')}
                          >
                            <TrendingUp size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Mic className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No audio files yet</p>
                    <Button 
                      className="mt-4"
                      onClick={() => setLocation('/audio')}
                    >
                      Upload Your First File
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-heading font-semibold text-professional-grey mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-medical-teal hover:bg-medical-teal/90 text-white justify-start"
                    onClick={() => setLocation('/audio')}
                  >
                    <Mic className="mr-3" size={16} />
                    Start New Recording
                  </Button>
                  <Button 
                    className="w-full bg-trustworthy-blue hover:bg-trustworthy-blue/90 text-white justify-start"
                    onClick={() => setLocation('/audio')}
                  >
                    <Upload className="mr-3" size={16} />
                    Upload Audio File
                  </Button>
                  <Button 
                    className="w-full bg-health-green hover:bg-health-green/90 text-white justify-start"
                    onClick={() => setLocation('/reports')}
                  >
                    <FileText className="mr-3" size={16} />
                    Generate Report
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Calendar className="mr-3" size={16} />
                    Schedule Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
