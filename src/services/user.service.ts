import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler.middleware';
import { comparePassword, hashPassword } from '../utils/password.util';
import {
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from '../utils/validation.util';
import {
  generateSecureToken,
  sendEmailVerification,
  sendPasswordReset,
} from './email.service';

interface UserResponse {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  bio: string | null;
  emailVerified: boolean;
  createdAt: Date;
}

// Update user profile
export const updateUserProfile = async (
  userId: string,
  profileData: UpdateProfileInput
): Promise<UserResponse> => {
  try {
    await checkUserExists(userId);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...profileData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return updatedUser;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to update profile', 500);
  }
};

// Change user password
export const changeUserPassword = async (
  userId: string,
  passwordData: ChangePasswordInput
): Promise<void> => {
  const { currentPassword, newPassword } = passwordData;
  try {
    const user = await checkUserExists(userId);

    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new ApiError('Current password is incorrect', 400);
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          updatedAt: new Date(),
        },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId },
      }),
    ]);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to change password', 500);
  }
};

// Send email verification token
export const sendEmailVerificationToken = async (
  userId: string
): Promise<void> => {
  try {
    const user = await checkUserExists(userId);

    if (user.emailVerified) {
      throw new ApiError('Email is already verified', 400);
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete existing verification tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });

    await prisma.emailVerificationToken.create({
      data: {
        token,
        email: user.email,
        userId,
        expiresAt,
      },
    });

    // Send verification email
    const emailSent = await sendEmailVerification(
      user.email,
      `${user.firstName} ${user.lastName}`,
      token
    );

    if (!emailSent) {
      throw new ApiError('Failed to send verification email', 500);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to send verification email', 500);
  }
};

// Verify email with token
export const verifyUserEmail = async (token: string): Promise<void> => {
  try {
    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new ApiError('Invalid or expired verification token', 400);
    }

    if (verificationToken.user.emailVerified) {
      throw new ApiError('Email is already verified', 400);
    }

    // Update user and delete verification token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      }),
    ]);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Email verification failed', 500);
  }
};

// Send password reset token
export const sendPasswordResetToken = async (
  forgotPasswordData: ForgotPasswordInput
): Promise<void> => {
  const { email } = forgotPasswordData;

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
    });

    // I didn't reveal if user exists or not (security best practice)
    if (!user) {
      // Still return success to prevent email enumeration
      return;
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const emailSent = await sendPasswordReset(
      user.email,
      `${user.firstName} ${user.lastName}`,
      token
    );

    if (!emailSent) {
      throw new ApiError('Failed to send password reset email', 500);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to send password reset email', 500);
  }
};

// Reset password with token
export const resetUserPassword = async (
  resetData: ResetPasswordInput
): Promise<void> => {
  const { token, password } = resetData;

  try {
    // Find valid reset token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetToken) {
      throw new ApiError('Invalid or expired reset token', 400);
    }

    if (!resetToken.user.isActive) {
      throw new ApiError('User account is not active', 400);
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password, delete reset token, and invalidate all refresh tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Password reset failed', 500);
  }
};

// Deactivate user account
export const deactivateUserAccount = async (userId: string): Promise<void> => {
  try {
    await prisma.$transaction([
      // Deactivate user
      prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      }),
      // Remove all refresh tokens
      prisma.refreshToken.deleteMany({
        where: { userId },
      }),
      // Remove all verification/reset tokens
      prisma.emailVerificationToken.deleteMany({
        where: { userId },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId },
      }),
    ]);
  } catch {
    throw new ApiError('Failed to deactivate account', 500);
  }
};

// Helper function
const checkUserExists = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
  });

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  return user;
};
