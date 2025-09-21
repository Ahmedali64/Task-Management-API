import { Router } from 'express';
import {
  updateProfile,
  changePassword,
  sendVerification,
  verifyEmail,
  forgotPassword,
  resetPassword,
  deactivateAccount,
} from '../controllers/user.controller';
import { validateBody } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  updateProfileSchema,
  changePasswordSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../utils/validation.util';

const router = Router();

// Public routes (no authentication required)
router.post('/verify-email', validateBody(verifyEmailSchema), verifyEmail);
router.post(
  '/forgot-password',
  validateBody(forgotPasswordSchema),
  forgotPassword
);
router.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  resetPassword
);

// Protected routes (authentication required)
router.put(
  '/profile',
  authMiddleware,
  validateBody(updateProfileSchema),
  updateProfile
);
router.put(
  '/password',
  authMiddleware,
  validateBody(changePasswordSchema),
  changePassword
);
router.post('/send-verification', authMiddleware, sendVerification);
router.delete('/account', authMiddleware, deactivateAccount);

export default router;
