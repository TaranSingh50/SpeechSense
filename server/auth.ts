import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { User, RegisterUser, LoginUser, ForgotPasswordUser, ResetPasswordUser } from "@shared/schema";

const scryptAsync = promisify(scrypt);

// JWT secret from environment or default for development
const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key";
const JWT_EXPIRES_IN = "7d";
const REFRESH_TOKEN_EXPIRES_DAYS = 30;
const PASSWORD_RESET_EXPIRES_HOURS = 1; // 1 hour to reset password

export class AuthService {
  // Hash password using scrypt
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  // Compare password with stored hash
  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  }

  // Generate random token
  generateRandomToken(): string {
    return randomBytes(32).toString("hex");
  }

  // Generate JWT access token
  generateAccessToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        accountType: user.accountType,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  // Verify JWT token
  verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Register new user
  async register(userData: RegisterUser): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await this.hashPassword(userData.password);

    // Create user
    const user = await storage.createUser({
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      accountType: userData.accountType || "patient",
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRandomToken();

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

    await storage.createAuthToken({
      userId: user.id,
      token: refreshToken,
      type: "refresh",
      expiresAt,
    });

    return { user, accessToken, refreshToken };
  }

  // Login user
  async login(credentials: LoginUser): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    // Find user by email
    const user = await storage.getUserByEmail(credentials.email);
    if (!user) {
      // In development with in-memory storage, provide more helpful error message
      if (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL) {
        throw new Error("User not found. In-memory storage was reset after server restart - please register again.");
      }
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await this.comparePasswords(credentials.password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRandomToken();

    // Clean up old refresh tokens for this user
    const oldTokens = await storage.getTokensByUserId(user.id, "refresh");
    for (const token of oldTokens) {
      await storage.deleteAuthToken(token.token);
    }

    // Store new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

    await storage.createAuthToken({
      userId: user.id,
      token: refreshToken,
      type: "refresh",
      expiresAt,
    });

    return { user, accessToken, refreshToken };
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Find refresh token
    const tokenRecord = await storage.getAuthToken(refreshToken);
    if (!tokenRecord || tokenRecord.type !== "refresh") {
      throw Error("Invalid refresh token");
    }

    // Get user
    const user = await storage.getUser(tokenRecord.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRandomToken();

    // Delete old refresh token
    await storage.deleteAuthToken(refreshToken);

    // Store new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

    await storage.createAuthToken({
      userId: user.id,
      token: newRefreshToken,
      type: "refresh",
      expiresAt,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // Logout - invalidate refresh token
  async logout(refreshToken: string): Promise<void> {
    await storage.deleteAuthToken(refreshToken);
  }

  // Get user from access token
  async getUserFromToken(accessToken: string): Promise<User | null> {
    const payload = this.verifyAccessToken(accessToken);
    if (!payload) {
      return null;
    }

    const user = await storage.getUser(payload.userId);
    return user || null;
  }

  // Request password reset - generates and stores reset token
  async requestPasswordReset(email: string): Promise<string> {
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists - but still generate token for security
      throw new Error("If this email exists, a password reset link has been sent");
    }

    // Generate secure reset token
    const resetToken = this.generateRandomToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_EXPIRES_HOURS);

    // Clean up any existing password reset tokens for this user
    const existingTokens = await storage.getTokensByUserId(user.id, "password_reset");
    for (const token of existingTokens) {
      await storage.deleteAuthToken(token.token);
    }

    // Store new reset token
    await storage.createAuthToken({
      userId: user.id,
      token: resetToken,
      type: "password_reset",
      expiresAt,
    });

    return resetToken;
  }

  // Reset password using reset token
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find and validate reset token
    const tokenRecord = await storage.getAuthToken(token);
    if (!tokenRecord || tokenRecord.type !== "password_reset") {
      throw new Error("Invalid or expired reset token");
    }

    // Get user
    const user = await storage.getUser(tokenRecord.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update user password
    await storage.updateUser(user.id, {
      password: hashedPassword,
    });

    // Delete the reset token (one-time use)
    await storage.deleteAuthToken(token);

    // Invalidate all existing refresh tokens for security
    const refreshTokens = await storage.getTokensByUserId(user.id, "refresh");
    for (const refreshToken of refreshTokens) {
      await storage.deleteAuthToken(refreshToken.token);
    }
  }

  // Verify reset token (for frontend validation)
  async verifyResetToken(token: string): Promise<boolean> {
    const tokenRecord = await storage.getAuthToken(token);
    return tokenRecord?.type === "password_reset" && tokenRecord.expiresAt > new Date();
  }

  // Clean expired tokens (should be run periodically)
  async cleanExpiredTokens(): Promise<void> {
    await storage.deleteExpiredTokens();
  }
}

export const authService = new AuthService();