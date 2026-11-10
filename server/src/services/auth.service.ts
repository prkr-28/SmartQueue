import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from '../models/User.js';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';
import { emailService } from './email.service.js';
import { AuditService } from './audit.service.js';
import { UserRole } from '@smartqueue/shared';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export class AuthService {
  /**
   * Hashes a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Generates JWT access and refresh tokens
   */
  static generateTokens(user: IUser): { accessToken: string; refreshToken: string } {
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId?.toString(),
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES as any,
    });

    const refreshToken = jwt.sign(
      { id: user._id.toString(), tokenVersion: user.updatedAt?.getTime() || 0 },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES as any }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Self-registration for Patients
   */
  static async registerPatient(params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    ipAddress?: string;
  }): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const existing = await User.findOne({ email: params.email.toLowerCase() });
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await this.hashPassword(params.password);
    const user = await User.create({
      name: params.name,
      email: params.email.toLowerCase(),
      passwordHash,
      role: 'patient',
      phone: params.phone,
      isEmailVerified: true, // Auto-verified for seamless testing/demo
      isActive: true,
    });

    const tokens = this.generateTokens(user);

    await AuditService.log({
      actorId: user._id,
      action: 'USER_REGISTERED',
      entity: 'User',
      entityId: user._id.toString(),
      ipAddress: params.ipAddress,
    });

    return { user, ...tokens };
  }

  /**
   * Login with account lockout protection
   */
  static async login(params: {
    email: string;
    password: string;
    ipAddress?: string;
  }): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const user = await User.findOne({ email: params.email.toLowerCase() });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check account lockout
    if (user.lockoutUntil && user.lockoutUntil.getTime() > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / (60 * 1000));
      throw new AppError(
        `Account temporarily locked due to repeated failed login attempts. Try again in ${remainingMinutes} minute(s).`,
        423
      );
    }

    const isMatch = await bcrypt.compare(params.password, user.passwordHash);
    if (!isMatch) {
      // Increment failed attempts
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }
      await user.save();

      await AuditService.log({
        actorId: user._id,
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user._id.toString(),
        details: { attempts: user.failedLoginAttempts },
        ipAddress: params.ipAddress,
      });

      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('This account has been deactivated. Please contact administration.', 403);
    }

    // Reset failed attempts upon successful login
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;
    await user.save();

    const tokens = this.generateTokens(user);

    await AuditService.log({
      actorId: user._id,
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      entityId: user._id.toString(),
      ipAddress: params.ipAddress,
    });

    return { user, ...tokens };
  }

  /**
   * Refresh token rotation
   */
  static async refreshTokens(token: string): Promise<{ accessToken: string; refreshToken: string; user: IUser }> {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        throw new AppError('User not found or inactive', 401);
      }

      const newTokens = this.generateTokens(user);
      return { ...newTokens, user };
    } catch (err: any) {
      throw new AppError('Invalid or expired refresh token', 401);
    }
  }

  /**
   * Forgot password token dispatch
   */
  static async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return cleanly to prevent email enumeration
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
    await emailService.sendPasswordResetToken(user.email, resetUrl);
  }

  /**
   * Reset password with token
   */
  static async resetPassword(params: { token: string; email: string; newPassword: string }): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(params.token).digest('hex');
    const user = await User.findOne({
      email: params.email.toLowerCase(),
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError('Invalid or expired password reset token', 400);
    }

    user.passwordHash = await this.hashPassword(params.newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;
    await user.save();
  }

  /**
   * Change password for logged in user
   */
  static async changePassword(userId: string, currentPass: string, newPass: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) throw new AppError('Current password is incorrect', 400);

    user.passwordHash = await this.hashPassword(newPass);
    await user.save();
  }
}
