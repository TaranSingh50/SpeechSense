import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { updateProfileSchema, changePasswordSchema, type UpdateProfile, type ChangePassword } from "@shared/schema";
import { 
  ArrowLeft, 
  Camera, 
  User, 
  Mail, 
  Shield, 
  Edit3, 
  Upload,
  Eye,
  EyeOff
} from "lucide-react";
import { Link } from "wouter";

export default function PatientProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Profile update form
  const profileForm = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
    },
  });

  // Change password form
  const passwordForm = useForm<ChangePassword>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Profile picture upload mutation
  const uploadPictureMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);
      
      const response = await apiRequest("POST", "/api/profile/upload-picture", formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive",
      });
    },
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      const response = await apiRequest("PUT", "/api/profile", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePassword) => {
      const response = await apiRequest("POST", "/api/profile/change-password", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      setIsChangePasswordOpen(false);
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select a JPG, JPEG, or PNG file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadPicture = () => {
    if (selectedFile) {
      uploadPictureMutation.mutate(selectedFile);
    }
  };

  const onProfileSubmit = (data: UpdateProfile) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: ChangePassword) => {
    changePasswordMutation.mutate(data);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-clinical-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-medical-teal bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-medical-teal animate-pulse" size={24} />
          </div>
          <p className="text-professional-grey">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-clinical-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-professional-grey hover:text-medical-teal">
                <ArrowLeft size={20} className="mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-charcoal-grey">Patient Profile</h1>
              <p className="text-professional-grey">Manage your account information and settings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Profile Picture Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera size={20} className="text-medical-teal" />
              <span>Profile Picture</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-6">
              <Avatar className="w-24 h-24">
                <AvatarImage 
                  src={previewUrl || user.profileImageUrl || ""} 
                  alt={`${user.firstName} ${user.lastName}`} 
                />
                <AvatarFallback className="bg-medical-teal text-white text-xl">
                  {user.firstName?.[0]?.toUpperCase()}{user.lastName?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="profile-upload" className="text-sm font-medium text-charcoal-grey">
                    Upload New Picture
                  </Label>
                  <p className="text-xs text-professional-grey">
                    JPG, JPEG, or PNG. Max file size 5MB.
                  </p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Input
                    id="profile-upload"
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-medical-teal file:text-white hover:file:bg-opacity-90"
                  />
                  {selectedFile && (
                    <Button 
                      onClick={handleUploadPicture}
                      disabled={uploadPictureMutation.isPending}
                      className="bg-medical-teal hover:bg-opacity-90"
                    >
                      <Upload size={16} className="mr-2" />
                      {uploadPictureMutation.isPending ? "Uploading..." : "Upload"}
                    </Button>
                  )}
                </div>

                {previewUrl && (
                  <div className="text-xs text-medical-teal">
                    ✓ New picture selected - click Upload to save
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User size={20} className="text-medical-teal" />
              <span>Profile Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter your first name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter your last name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-charcoal-grey">Email Address</Label>
                  <div className="flex items-center space-x-2">
                    <Input value={user.email} disabled className="bg-gray-50" />
                    <Mail size={16} className="text-professional-grey" />
                  </div>
                  <p className="text-xs text-professional-grey">
                    Email address cannot be changed. Contact support if needed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-charcoal-grey">Account Type</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-medical-teal bg-opacity-10 text-medical-teal">
                      {user.accountType === "patient" ? "Patient" : "Therapist"}
                    </Badge>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    className="bg-medical-teal hover:bg-opacity-90"
                  >
                    <Edit3 size={16} className="mr-2" />
                    {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield size={20} className="text-medical-teal" />
              <span>Security</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-charcoal-grey mb-2">Password</h3>
                <p className="text-xs text-professional-grey mb-4">
                  Keep your account secure with a strong password
                </p>
                
                <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-medical-teal text-medical-teal hover:bg-medical-teal hover:text-white">
                      <Shield size={16} className="mr-2" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new one.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...passwordForm}>
                      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    type={showCurrentPassword ? "text" : "password"}
                                    placeholder="Enter current password" 
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-professional-grey hover:text-charcoal-grey"
                                  >
                                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder="Enter new password" 
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-professional-grey hover:text-charcoal-grey"
                                  >
                                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm new password" 
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-professional-grey hover:text-charcoal-grey"
                                  >
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter className="gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsChangePasswordOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={changePasswordMutation.isPending}
                            className="bg-medical-teal hover:bg-opacity-90"
                          >
                            {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}