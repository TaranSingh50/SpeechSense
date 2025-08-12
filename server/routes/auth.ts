import { Router } from "express";
import { authService } from "../auth";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Register endpoint
router.post("/register", async (req, res) => {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);
    
    // Register user
    const result = await authService.register(validatedData);
    
    // Set refresh token as HTTP-only cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Return user data and access token
    res.status(201).json({
      message: "Registration successful",
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        accountType: result.user.accountType,
        isEmailVerified: result.user.isEmailVerified,
      },
      accessToken: result.accessToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
      });
    }
    
    console.error("Registration error:", error);
    res.status(400).json({
      message: error instanceof Error ? error.message : "Registration failed",
    });
  }
});

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);
    
    // Login user
    const result = await authService.login(validatedData);
    
    // Set refresh token as HTTP-only cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Return user data and access token
    res.json({
      message: "Login successful",
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        accountType: result.user.accountType,
        isEmailVerified: result.user.isEmailVerified,
      },
      accessToken: result.accessToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
      });
    }
    
    console.error("Login error:", error);
    res.status(401).json({
      message: error instanceof Error ? error.message : "Login failed",
    });
  }
});

// Refresh token endpoint
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    const result = await authService.refreshAccessToken(refreshToken);
    
    // Set new refresh token as HTTP-only cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      message: "Token refreshed successfully",
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({
      message: error instanceof Error ? error.message : "Token refresh failed",
    });
  }
});

// Logout endpoint
router.post("/logout", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    
    // Clear refresh token cookie
    res.clearCookie("refreshToken");
    
    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Logout failed",
    });
  }
});

// Get current user endpoint
router.get("/user", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    const user = await authService.getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      accountType: user.accountType,
      isEmailVerified: user.isEmailVerified,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(401).json({
      message: "Invalid or expired token",
    });
  }
});

// Forgot password endpoint
router.post("/forgot-password", async (req, res) => {
  try {
    // Validate request body
    const validatedData = forgotPasswordSchema.parse(req.body);
    
    // Generate reset token
    const resetToken = await authService.requestPasswordReset(validatedData.email);
    
    // In a real application, you would send this token via email
    // For now, we'll return it (remove this in production!)
    res.json({
      message: "If this email exists, a password reset link has been sent",
      // TODO: Remove this in production - only for development/testing
      resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
      });
    }
    
    // Always return the same message for security
    res.json({
      message: "If this email exists, a password reset link has been sent",
    });
  }
});

// Reset password endpoint
router.post("/reset-password", async (req, res) => {
  try {
    // Validate request body
    const validatedData = resetPasswordSchema.parse(req.body);
    
    // Reset password
    await authService.resetPassword(validatedData.token, validatedData.password);
    
    res.json({
      message: "Password has been reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
      });
    }
    
    res.status(400).json({
      message: error instanceof Error ? error.message : "Password reset failed",
    });
  }
});

// Verify reset token endpoint
router.get("/verify-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const isValid = await authService.verifyResetToken(token);
    
    res.json({
      valid: isValid,
      message: isValid ? "Token is valid" : "Token is invalid or expired",
    });
  } catch (error) {
    console.error("Verify reset token error:", error);
    res.status(400).json({
      valid: false,
      message: "Token verification failed",
    });
  }
});

export default router;