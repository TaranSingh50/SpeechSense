import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mic, Shield, TrendingUp, Eye, EyeOff } from "lucide-react";
import { loginUserSchema, registerUserSchema, type LoginUser, type RegisterUser } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  const loginForm = useForm<LoginUser>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterUser>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const forgotPasswordForm = useForm<{ email: string }>({
    resolver: zodResolver(loginUserSchema.pick({ email: true })),
    defaultValues: {
      email: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome back!",
        description: "You have been logged in successfully.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Account created!",
        description: "Welcome to SpeechPath. Your account has been created successfully.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest("POST", "/api/forgot-password", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Password reset sent",
        description: data.message,
      });
      setShowForgotPassword(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-clinical-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-medical-teal bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic className="text-medical-teal animate-pulse" size={24} />
          </div>
          <p className="text-professional-grey">Loading...</p>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-clinical-white to-blue-50 flex">
        {/* Left Side - Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="h-12 w-12 bg-medical-teal rounded-lg flex items-center justify-center">
                  <Mic className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-heading font-bold text-professional-grey">SpeechPath</h1>
                  <p className="text-sm text-gray-500">Password Recovery</p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-center text-professional-grey">Reset Your Password</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...forgotPasswordForm}>
                  <form onSubmit={forgotPasswordForm.handleSubmit((data) => forgotPasswordMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={forgotPasswordForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-medical-teal hover:bg-medical-teal/90"
                      disabled={forgotPasswordMutation.isPending}
                    >
                      {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
                    </Button>

                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => setShowForgotPassword(false)}
                    >
                      Back to Login
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side - Hero */}
        <div className="hidden lg:flex flex-1 bg-medical-teal p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-medical-teal to-trustworthy-blue opacity-90"></div>
          <div className="relative z-10 flex flex-col justify-center">
            <h2 className="text-4xl font-heading font-bold mb-6">
              Secure Account Recovery
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Professional-grade security with quick and easy password recovery.
            </p>
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Shield className="text-blue-200" size={24} />
                <div>
                  <h3 className="font-semibold">Enterprise Security</h3>
                  <p className="text-blue-200 text-sm">HIPAA-compliant password management</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-clinical-white to-blue-50 flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="h-12 w-12 bg-medical-teal rounded-lg flex items-center justify-center">
                <Mic className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold text-professional-grey">SpeechPath</h1>
                <p className="text-sm text-gray-500">Professional Speech Diagnosis Platform</p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center text-professional-grey">
                {isLogin ? "Sign In to Your Account" : "Create Your Account"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLogin ? (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-medical-teal hover:bg-medical-teal/90"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing In..." : "Sign In"}
                    </Button>

                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="w-full text-sm"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot your password?
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="First name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a password (minimum 6 characters)" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-medical-teal hover:bg-medical-teal/90"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              )}

              <div className="mt-6">
                <Separator className="my-4" />
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? "Need an account? Sign up here" : "Already have an account? Sign in here"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Hero */}
      <div className="hidden lg:flex flex-1 bg-medical-teal p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-medical-teal to-trustworthy-blue opacity-90"></div>
        <div className="relative z-10 flex flex-col justify-center">
          <h2 className="text-4xl font-heading font-bold mb-6">
            {isLogin ? "Welcome Back to SpeechPath" : "Join SpeechPath Today"}
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            {isLogin 
              ? "Continue your professional speech therapy practice with advanced AI-powered analysis."
              : "Start your journey with the most trusted speech analysis platform for healthcare professionals."
            }
          </p>
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <TrendingUp className="text-blue-200" size={24} />
              <div>
                <h3 className="font-semibold">AI-Powered Analysis</h3>
                <p className="text-blue-200 text-sm">Advanced stuttering detection and speech pattern analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Shield className="text-blue-200" size={24} />
              <div>
                <h3 className="font-semibold">HIPAA Compliant</h3>
                <p className="text-blue-200 text-sm">Enterprise-grade security for patient data protection</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}