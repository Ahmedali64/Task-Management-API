import bcrypt from 'bcryptjs';
import { ApiError } from '../middleware/errorHandler.middleware';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  try {
    if (!password || typeof password !== 'string') {
      throw new ApiError('Password is required and must be a string', 400);
    }

    if (password.length < 8) {
      throw new ApiError('Password must be at least 8 characters long', 400);
    }

    if (password.length > 128) {
      throw new ApiError('Password must not exceed 128 characters', 400);
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);

    return hashedPassword;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to hash password', 500);
  }
};

// Compare Password
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  try {
    if (!password || typeof password !== 'string') {
      throw new ApiError('Password is required and must be a string', 400);
    }

    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw new ApiError(
        'Hashed password is required and must be a string',
        400
      );
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to compare passwords', 500);
  }
};
