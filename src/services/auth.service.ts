import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler.middleware';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt.util';
import { comparePassword, hashPassword } from '../utils/password.util';
import {
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
} from '../utils/validation.util';

interface UserResponse {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  bio: string | null;
  createdAt: Date;
}

interface AuthResponse {
  user: UserResponse;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// Register a new user
export const registerUser = async (
  userData: RegisterInput
): Promise<AuthResponse> => {
  const { email, username, firstName, lastName, password } = userData;

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        // OR is array of objects
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new ApiError('Email is already registered', 400);
      }
      if (existingUser.username === username.toLowerCase()) {
        throw new ApiError('Username is already taken', 400);
      }
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        firstName,
        lastName,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    });

    const tokens = generateTokenPair({
      userId: newUser.id,
      email: newUser.email,
      username: newUser.username,
    });

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: newUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: newUser,
      tokens,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Registration failed', 500);
  }
};

// User login
export const loginUser = async (
  loginData: LoginInput
): Promise<AuthResponse> => {
  const { emailOrUsername, password } = loginData;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername.toLowerCase() },
        ],
        isActive: true,
      },
    });

    if (!user) {
      throw new ApiError('Invalid credentials', 401);
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new ApiError('Invalid credentials', 401);
    }

    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    await prisma.refreshToken.deleteMany({
      where: {
        userId: user.id,
        expiresAt: {
          lt: new Date(), // Less than current Date
        },
      },
    });

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      tokens,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Login failed', 500);
  }
};

// Refresh access token
export const refreshAccessToken = async (
  refreshData: RefreshTokenInput
): Promise<{ accessToken: string; refreshToken: string }> => {
  const { refreshToken } = refreshData;

  try {
    // Expect userId only
    const userId = verifyRefreshToken(refreshToken);

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId,
        expiresAt: {
          gt: new Date(), // Greater than now
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            isActive: true,
          },
        },
      },
    });

    if (!storedToken) {
      throw new ApiError('Invalid or expired refresh token', 401);
    }

    if (!storedToken.user.isActive) {
      throw new ApiError('Account has been deactivated', 401);
    }

    const newTokens = generateTokenPair({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      username: storedToken.user.username,
    });

    // Remove old refresh token and store new one
    await prisma.$transaction([
      prisma.refreshToken.delete({
        where: { id: storedToken.id },
      }),
      prisma.refreshToken.create({
        data: {
          token: newTokens.refreshToken,
          userId: storedToken.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Token refresh failed', 500);
  }
};

// Logout user
export const logoutUser = async (refreshToken: string): Promise<void> => {
  const refreshTokenExists = await prisma.refreshToken.findFirst({
    where: { token: refreshToken },
  });

  if (!refreshTokenExists) {
    throw new ApiError("Refresh token desn't exist", 404);
  }

  // Remove refresh token from database
  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  });
};

// Get user profile by ID
export const getUserProfile = async (userId: string): Promise<UserResponse> => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    return user;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to get user profile', 500);
  }
};
