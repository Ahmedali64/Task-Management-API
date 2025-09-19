import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  verifyToken,
} from '../controllers/auth.controller';
import { validateBody } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../utils/validation.util';

const router = Router();

// Public routes (no authentication required)
router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/refresh', validateBody(refreshTokenSchema), refreshToken);

// Logout (can work with or without valid token)
router.delete('/logout', logout);

// Protected routes (authentication required)
router.get('/me', authMiddleware, getMe);
router.get('/verify', authMiddleware, verifyToken);

export default router;
