import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, RegisterUser, LoginUser, ForgotPasswordUser, ResetPasswordUser } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<LoginResponse, Error, LoginUser>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<RegisterResponse, Error, RegisterUser>;
  forgotPasswordMutation: UseMutationResult<ForgotPasswordResponse, Error, ForgotPasswordUser>;
  resetPasswordMutation: UseMutationResult<ResetPasswordResponse, Error, ResetPasswordUser>;
};

type LoginResponse = {
  message: string;
  user: Omit<User, 'password'>;
  accessToken: string;
};

type RegisterResponse = {
  message: string;
  user: Omit<User, 'password'>;
  accessToken: string;
};

type ForgotPasswordResponse = {
  message: string;
  resetToken?: string; // Only in development
};

type ResetPasswordResponse = {
  message: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Get current user
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<Omit<User, 'password'> | null, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) return null;

      try {
        const response = await fetch("/api/auth/user", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.status === 401) {
          // Try to refresh token
          const refreshResponse = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            localStorage.setItem("accessToken", refreshData.accessToken);
            
            // Retry getting user with new token
            const retryResponse = await fetch("/api/auth/user", {
              headers: {
                Authorization: `Bearer ${refreshData.accessToken}`,
              },
            });

            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }

          // Refresh failed, clear token and return null
          localStorage.removeItem("accessToken");
          return null;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }

        return await response.json();
      } catch (error) {
        localStorage.removeItem("accessToken");
        return null;
      }
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser): Promise<LoginResponse> => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return await res.json();
    },
    onSuccess: (data: LoginResponse) => {
      localStorage.setItem("accessToken", data.accessToken);
      queryClient.setQueryData(["/api/auth/user"], data.user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.firstName || data.user.email}!`,
      });
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
    mutationFn: async (userData: RegisterUser): Promise<RegisterResponse> => {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      return await res.json();
    },
    onSuccess: (data: RegisterResponse) => {
      localStorage.setItem("accessToken", data.accessToken);
      queryClient.setQueryData(["/api/auth/user"], data.user);
      toast({
        title: "Registration successful",
        description: `Welcome to SpeechPath, ${data.user.firstName || data.user.email}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      localStorage.removeItem("accessToken");
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear(); // Clear all cached data
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      // Navigate to login page
      window.location.href = "/auth";
    },
    onError: (error: Error) => {
      // Still clear local data even if server logout fails
      localStorage.removeItem("accessToken");
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
      toast({
        title: "Logout completed",
        description: "You have been logged out.",
      });
      // Navigate to login page even on error
      window.location.href = "/auth";
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordUser): Promise<ForgotPasswordResponse> => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", data);
      return await res.json();
    },
    onSuccess: (data: ForgotPasswordResponse) => {
      toast({
        title: "Password reset requested",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordUser): Promise<ResetPasswordResponse> => {
      const res = await apiRequest("POST", "/api/auth/reset-password", data);
      return await res.json();
    },
    onSuccess: (data: ResetPasswordResponse) => {
      toast({
        title: "Password reset successful",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set up authorization header for API requests
  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken && user) {
      // This will be used by the queryClient's default fetch function
      queryClient.setDefaultOptions({
        queries: {
          retry: (failureCount, error: any) => {
            // Don't retry on 401/403 errors
            if (error?.status === 401 || error?.status === 403) {
              return false;
            }
            return failureCount < 3;
          },
        },
      });
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user: user as User | null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        forgotPasswordMutation,
        resetPasswordMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}