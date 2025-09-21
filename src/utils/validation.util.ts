import { z } from 'zod';

// Password validation - strong password requirements
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(
    /[@$!%*?&]/,
    'Password must contain at least one special character (@$!%*?&)'
  );

// User registration schema
export const registerSchema = z
  .object({
    email: z.email('Please provide a valid email address').toLowerCase().trim(),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters long')
      .max(30, 'Username must be less than 30 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores'
      )
      .toLowerCase()
      .trim(),
    firstName: z
      .string()
      .min(2, 'First name must be at least 2 characters long')
      .max(50, 'First name must be less than 50 characters')
      .trim(),
    lastName: z
      .string()
      .min(2, 'Last name must be at least 2 characters long')
      .max(50, 'Last name must be less than 50 characters')
      .trim(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// User login schema
export const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required').trim(),
  password: z.string().min(1, 'Password is required'),
});

// Profile update schema
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters long')
    .max(50, 'First name must be less than 50 characters')
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters long')
    .max(50, 'Last name must be less than 50 characters')
    .trim()
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .trim()
    .optional(),
  avatar: z.url('Avatar must be a valid URL').optional(),
});

// Change password schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Email verification schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

// Resend email verification schema
export const resendVerificationSchema = z.object({
  email: z.email('Please provide a valid email address').toLowerCase().trim(),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.email('Please provide a valid email address').toLowerCase().trim(),
});

// Reset password schema
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Types for TypeScript (Same as DTOS in Nest)
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
