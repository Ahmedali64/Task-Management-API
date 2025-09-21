import { Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { successResponse } from '../utils/response.util';
import {
  changeUserPassword,
  deactivateUserAccount,
  resetUserPassword,
  sendEmailVerificationToken,
  sendPasswordResetToken,
  updateUserProfile,
  verifyUserEmail,
} from '../services/user.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

type UpdateProfileInputBody = {
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string;
};

type UpdatePasswordInputBody = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

type VerifyemailTokenBody = {
  token: string;
};

type SendPasswordResetEmail = {
  email: string;
};

type ResetPasswordBody = {
  token: string;
  password: string;
  confirmPassword: string;
};

// Update user profile
export const updateProfile = expressAsyncHandler(
  async (
    req: AuthenticatedRequest<object, object, UpdateProfileInputBody>,
    res: Response
  ) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return; // Stop excution
    }
    const updatedUser = await updateUserProfile(req.user.id, req.body);

    successResponse(res, updatedUser, 'Profile updated successfully');
  }
);

// Change password
export const changePassword = expressAsyncHandler(
  async (
    req: AuthenticatedRequest<object, object, UpdatePasswordInputBody>,
    res: Response
  ) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }

    await changeUserPassword(req.user.id, req.body);

    successResponse(
      res,
      null,
      'Password changed successfully. Please login again.'
    );
  }
);

// Send email verification
export const sendVerification = expressAsyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }
    await sendEmailVerificationToken(req.user.id);

    successResponse(res, null, 'Verification email sent successfully');
  }
);

// Verify email
export const verifyEmail = expressAsyncHandler(
  async (
    req: AuthenticatedRequest<object, object, VerifyemailTokenBody>,
    res: Response
  ) => {
    await verifyUserEmail(req.body.token);
    successResponse(res, null, 'Email verified successfully');
  }
);

// Send password reset email
export const forgotPassword = expressAsyncHandler(
  async (
    req: AuthenticatedRequest<object, object, SendPasswordResetEmail>,
    res: Response
  ) => {
    await sendPasswordResetToken(req.body);

    successResponse(
      res,
      null,
      'If an account with this email exists, a password reset link has been sent'
    );
  }
);

// Reset password
export const resetPassword = expressAsyncHandler(
  async (
    req: AuthenticatedRequest<object, object, ResetPasswordBody>,
    res: Response
  ) => {
    await resetUserPassword(req.body);

    successResponse(
      res,
      null,
      'Password reset successfully. You can now login with your new password.'
    );
  }
);

// Deactivate account
export const deactivateAccount = expressAsyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }

    await deactivateUserAccount(req.user.id);
    successResponse(res, null, 'Account deactivated successfully');
  }
);
