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
/**
 * @swagger
 * /api/users/verify-email:
 *   post:
 *     summary: Verify user email by token
 *     description: User sends a token to verify their email.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: "a-random-generated-token"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid, expired, or already verified email token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Email verification failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/verify-email', validateBody(verifyEmailSchema), verifyEmail);
/**
 * @swagger
 * /api/users/forgot-password:
 *   post:
 *     summary: Send password reset email to the user
 *     description: If an account with this email exists, a password reset link has been sent
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *       500:
 *         description: Failed to send password reset email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/forgot-password',
  validateBody(forgotPasswordSchema),
  forgotPassword
);
/**
 * @swagger
 * /api/users/reset-password:
 *   post:
 *     summary:  Reset user password
 *     description: User provides a reset token and new password to reset their account password.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *               - confirmPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: 'A randome token'
 *               password:
 *                 type: string
 *                 format: password
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password reset successfully. You can now login with your new password
 *       400:
 *         description: Invalid or expired reset token or user account is not active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Password reset failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  resetPassword
);

// Protected routes (authentication required)
/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     description: User send a data to update his profile.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Cena"
 *               bio:
 *                 type: string
 *                 example: "This is a user bio updated"
 *               avatar:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *       500:
 *         description: Failed to update profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/profile',
  authMiddleware,
  validateBody(updateProfileSchema),
  updateProfile
);
/**
 * @swagger
 * /api/users/password:
 *   put:
 *     summary: Change password
 *     description: User will call this if he wanna change his password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password is incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *       500:
 *         description: Failed to change password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/password',
  authMiddleware,
  validateBody(changePasswordSchema),
  changePassword
);
/**
 * @swagger
 * /api/users/send-verification:
 *   post:
 *     summary: Send a verification email to the user
 *     description: Send a verification email to the user with a token to verify his email.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email verification token sent successfully to your email
 *       400:
 *         description: Email is already verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *       500:
 *         description: Failed to send verification email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/send-verification', authMiddleware, sendVerification);
/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     summary: Deactivate user account
 *     description: User sends a request to deactivate their account.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deactivated successfully
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *       500:
 *         description: Failed to deactivate account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/account', authMiddleware, deactivateAccount);

export default router;
