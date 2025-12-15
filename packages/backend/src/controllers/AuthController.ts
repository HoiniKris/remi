import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService.js';
import { CreateUserAccountSchema } from '../models/UserAccount.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request body
      const validation = CreateUserAccountSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      // Extract device info
      const deviceInfo = {
        ipAddress: (req.ip || req.socket.remoteAddress || '').replace('::ffff:', ''),
        userAgent: req.headers['user-agent'] || '',
        deviceId: req.body.deviceId || '',
        browserFingerprint: req.body.browserFingerprint || '',
      };

      // Register user
      const result = await this.authService.register(validation.data, deviceInfo);

      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }

      // Generate tokens
      const tokens = generateTokens(result.userId!);

      res.status(201).json({
        message: 'Registration successful',
        userId: result.userId,
        ...tokens,
      });
    } catch (error) {
      console.error('Register endpoint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password required' });
        return;
      }

      // Login user
      const result = await this.authService.login(email, password);

      if (!result.success) {
        res.status(401).json({ error: result.message });
        return;
      }

      // Generate tokens
      const tokens = generateTokens(result.userId!);

      res.json({
        message: 'Login successful',
        userId: result.userId,
        ...tokens,
      });
    } catch (error) {
      console.error('Login endpoint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  logout = async (_req: Request, res: Response): Promise<void> => {
    // In a production app, you'd invalidate the refresh token here
    res.json({ message: 'Logout successful' });
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
      }

      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);
      if (!payload) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      // Generate new tokens
      const tokens = generateTokens(payload.userId);

      res.json(tokens);
    } catch (error) {
      console.error('Refresh token endpoint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, currentPassword, newPassword } = req.body;

      if (!userId || !currentPassword || !newPassword) {
        res.status(400).json({ error: 'All fields required' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ error: 'New password must be at least 8 characters' });
        return;
      }

      // Update password
      const result = await this.authService.updatePassword(userId, currentPassword, newPassword);

      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Reset password endpoint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
