import { UserRepository } from '../repositories/UserRepository.js';
import { CreateUserAccount, hashPassword, verifyPassword } from '../models/UserAccount.js';
import { DeviceFingerprintService } from './DeviceFingerprintService.js';

export interface AuthResult {
  success: boolean;
  userId?: string;
  message?: string;
}

export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private fingerprintService: DeviceFingerprintService
  ) {}

  async register(
    userData: CreateUserAccount,
    deviceInfo: {
      ipAddress: string;
      userAgent: string;
      deviceId: string;
      browserFingerprint: string;
    }
  ): Promise<AuthResult> {
    try {
      // Check if email already exists
      const existingUser = await this.userRepo.findByEmail(userData.email);
      if (existingUser) {
        return { success: false, message: 'Email already registered' };
      }

      // Check for clone accounts
      const isClone = await this.fingerprintService.detectCloneAccount(deviceInfo);
      if (isClone) {
        return { success: false, message: 'Multiple accounts detected from this device' };
      }

      // Hash password
      const passwordHash = await hashPassword(userData.password);

      // Create user
      const user = await this.userRepo.create({
        ...userData,
        passwordHash,
      });

      // Store device fingerprint
      await this.fingerprintService.storeFingerprint({
        userId: user.userId,
        ...deviceInfo,
      });

      // Create player profile
      await this.createPlayerProfile(user.userId);

      return { success: true, userId: user.userId };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      // Find user
      const user = await this.userRepo.findByEmail(email);
      if (!user) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Check if suspended
      if (user.isSuspended) {
        return {
          success: false,
          message: `Account suspended: ${user.suspensionReason || 'Policy violation'}`,
        };
      }

      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Update last login
      await this.userRepo.updateLastLogin(user.userId);

      return { success: true, userId: user.userId };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<AuthResult> {
    try {
      // Get user
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Verify current password
      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return { success: false, message: 'Current password is incorrect' };
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await this.userRepo.updatePassword(userId, newPasswordHash);

      return { success: true, userId };
    } catch (error) {
      console.error('Password update error:', error);
      return { success: false, message: 'Password update failed' };
    }
  }

  private async createPlayerProfile(userId: string): Promise<void> {
    const query = `
      INSERT INTO player_profiles (user_id)
      VALUES ($1)
    `;
    const { pool } = await import('../config/database.js');
    await pool.query(query, [userId]);
  }
}
