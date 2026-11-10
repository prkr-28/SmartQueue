import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { User } from '../models/User.js';
import { AppError } from '../middlewares/errorHandler.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, phone } = req.body;
      const { user, accessToken, refreshToken } = await AuthService.registerPatient({
        name,
        email,
        password,
        phone,
        ipAddress: req.ip,
      });

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
          },
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } = await AuthService.login({
        email,
        password,
        ipAddress: req.ip,
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            hospitalId: user.hospitalId,
          },
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies.refreshToken || req.body.refreshToken;
      if (!token) {
        throw new AppError('Refresh token required', 401);
      }

      const { accessToken, refreshToken, user } = await AuthService.refreshTokens(token);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            hospitalId: user.hospitalId,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      await AuthService.forgotPassword(email);
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been dispatched.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, email, newPassword } = req.body;
      await AuthService.resetPassword({ token, email, newPassword });
      res.status(200).json({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
      res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findById(req.user!.id).select('-passwordHash -passwordResetToken -passwordResetExpires');
      if (!user) throw new AppError('User not found', 404);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, phone, avatarUrl } = req.body;
      const user = await User.findByIdAndUpdate(
        req.user!.id,
        { $set: { name, phone, avatarUrl } },
        { new: true }
      ).select('-passwordHash');
      res.status(200).json({ success: true, message: 'Profile updated', data: user });
    } catch (error) {
      next(error);
    }
  }
}
