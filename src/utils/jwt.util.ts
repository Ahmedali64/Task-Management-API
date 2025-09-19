import jwt from 'jsonwebtoken';
import { ApiError } from '../middleware/errorHandler.middleware';

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    'JWT secrets are not configured. Please check your environment variables.'
  );
}

// Generate access token
export const generateAccessToken = (payload: JwtPayload): string => {
  try {
    return jwt.sign(payload, JWT_ACCESS_SECRET, {
      expiresIn: JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      issuer: 'taskflow-api',
      audience: 'taskflow-client',
      subject: payload.userId,
    });
  } catch {
    throw new ApiError('Failed to generate access token', 500);
  }
};

// Generate refresh token
export const generateRefreshToken = (payload: JwtPayload): string => {
  try {
    return jwt.sign({ userId: payload.userId }, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      issuer: 'taskflow-api',
      audience: 'taskflow-client',
      subject: payload.userId,
    });
  } catch {
    throw new ApiError('Failed to generate refresh token', 500);
  }
};

// Generate both access and refresh tokens
export const generateTokenPair = (payload: JwtPayload): TokenPair => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
  };
};

// Verify access token
export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;

    // Validate required fields
    if (!decoded.userId || !decoded.email || !decoded.username) {
      throw new ApiError('Invalid token payload', 401);
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username,
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError('Invalid token', 401);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError('Token has expired', 401);
    }
    throw error;
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): string => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;

    if (!decoded.userId) {
      throw new ApiError('Invalid refresh token payload', 401);
    }

    return decoded.userId;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError('Invalid refresh token', 401);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError('Refresh token has expired', 401);
    }
    throw error;
  }
};

//Extract token from Authorization header
export const extractTokenFromHeader = (authHeader?: string): string => {
  if (!authHeader) {
    throw new ApiError('Authorization header is missing', 401);
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new ApiError(
      'Invalid authorization header format. Use "Bearer <token>"',
      401
    );
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  if (!token) {
    throw new ApiError('Token is missing from authorization header', 401);
  }

  return token;
};

// Get token expiration time
export const getTokenExpiration = (token: string): number => {
  try {
    const decoded = jwt.decode(token) as jwt.JwtPayload;

    if (!decoded || !decoded.exp) {
      throw new ApiError('Invalid token format', 400);
    }

    return decoded.exp * 1000; // Convert to milliseconds
  } catch {
    throw new ApiError('Failed to decode token', 400);
  }
};
