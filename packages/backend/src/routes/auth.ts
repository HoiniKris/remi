import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { AuthService } from '../services/AuthService.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { DeviceFingerprintService } from '../services/DeviceFingerprintService.js';

const router = Router();

// Initialize services
const userRepo = new UserRepository();
const fingerprintService = new DeviceFingerprintService();
const authService = new AuthService(userRepo, fingerprintService);
const authController = new AuthController(authService);

// Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.post('/reset-password', authController.resetPassword);

export default router;
