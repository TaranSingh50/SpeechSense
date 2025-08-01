import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CloudUpload, File, CheckCircle, AlertCircle } from "lucide-react";

export function FileUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Simulate upload progress
      setUploadProgress(0);
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      try {
        const response = await apiRequest("POST", "/api/audio/upload", formData);
        clearInterval(progressInterval);
        setUploadProgress(100);
        return response;
      } catch (error) {
        clearInterval(progressInterval);
        setUploadProgress(0);
        throw error;
      }
    },
    onSuccess: () => {
      // Auto refresh library after upload
      queryClient.invalidateQueries({ queryKey: ["/api/audio"] });
      toast({
        title: "Upload successful",
        description: "Your audio file has been uploaded and is ready for analysis.",
      });
      // Reset state
      setSelectedFile(null);
      setUploadProgress(0);
    },
    onError: (error) => {
      setUploadProgress(0);
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
        description: "Failed to upload audio file. Please check the file format and try again.",
        variant: "destructive",
      });
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an MP3, WAV, or M4A audio file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const uploadFile = () => {
    if (selectedFile) {
      const formData = new FormData();
      formData.append('audio', selectedFile);
      uploadMutation.mutate(formData);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-medical-teal bg-medical-teal bg-opacity-5' 
            : 'border-gray-300 hover:border-medical-teal'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CloudUpload className="text-gray-400" size={24} />
        </div>
        <p className="text-gray-600 mb-2">Drag and drop your audio file here</p>
        <p className="text-sm text-gray-500 mb-4">Supported formats: MP3, WAV, M4A (Max 50MB)</p>
        
        <Button
          variant="outline"
          className="border-trustworthy-blue text-trustworthy-blue hover:bg-trustworthy-blue hover:text-white"
          onClick={() => document.getElementById('file-input')?.click()}
          disabled={uploadMutation.isPending}
        >
          Choose File
        </Button>
        
        <input
          id="file-input"
          type="file"
          className="hidden"
          accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
          onChange={handleFileSelect}
        />
      </div>

      {/* Selected File Info */}
      {selectedFile && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-trustworthy-blue bg-opacity-10 rounded-lg flex items-center justify-center">
                <File className="text-trustworthy-blue" size={16} />
              </div>
              <div>
                <p className="font-medium text-professional-grey">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <Button
              onClick={uploadFile}
              disabled={uploadMutation.isPending}
              className="bg-trustworthy-blue hover:bg-trustworthy-blue/90"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
          
          {/* Upload Progress */}
          {uploadMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Uploading...</span>
                <span className="text-gray-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-trustworthy-blue h-2 rounded-full transition-all duration-300" 
                  style={{width: `${uploadProgress}%`}}
                ></div>
              </div>
            </div>
          )}
          
          {/* Success State */}
          {uploadProgress === 100 && !uploadMutation.isPending && (
            <div className="flex items-center space-x-2 text-health-green">
              <CheckCircle size={16} />
              <span className="text-sm">Upload completed successfully!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
