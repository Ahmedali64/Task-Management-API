import expressAsyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import {
  getUserProfile,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from '../services/auth.service';
import { createdResponse, successResponse } from '../utils/response.util';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

interface RegisterRequestBody extends Request {
  body: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
    confirmPassword: string;
    avatar?: string | null;
    bio?: string | null;
    createdAt: Date;
  };
}
interface LoginRequestBody extends Request {
  body: {
    emailOrUsername: string;
    password: string;
  };
}
interface RegreshTokenRequestBody extends Request {
  body: {
    refreshToken: string;
  };
}

// Register a new user
export const register = expressAsyncHandler(
  async (req: RegisterRequestBody, res: Response) => {
    const result = await registerUser(req.body);
    createdResponse(res, result, 'User registered successfully');
  }
);

// Login user
export const login = expressAsyncHandler(
  async (req: LoginRequestBody, res: Response) => {
    const result = await loginUser(req.body);
    successResponse(res, result, 'Login successful');
  }
);

// Refresh access token
export const refreshToken = expressAsyncHandler(
  async (req: RegreshTokenRequestBody, res: Response) => {
    const result = await refreshAccessToken(req.body);
    successResponse(res, result, 'Token refreshed successfully');
  }
);

// Logout user
export const logout = expressAsyncHandler(
  async (req: RegreshTokenRequestBody, res: Response) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await logoutUser(refreshToken);
    }
    successResponse(res, null, 'Logout successful');
  }
);

// Get current user profile
export const getMe = expressAsyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // req.user is attached by authMiddleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
      return;
    }
    // Here is a weard error =>
    /*
    If req.user is missing → you return early.
    If code continues → req.user must exist.
    This is logically true/safe

    But ts look at the code and see that AuthenticatedRequest has a user and this user might be undefined and throw a warn or err
    So we use ! to tell her trust me this is not undefined 
    */
    const userProfile = await getUserProfile(req.user.id);
    successResponse(res, userProfile, 'Profile retrieved successfully');
  }
);

// Verify token
export const verifyToken = expressAsyncHandler(
  (req: Request, res: Response) => {
    // If we reach here, it means authMiddleware passed (token is valid)
    successResponse(res, { valid: true }, 'Token is valid');
  }
);
