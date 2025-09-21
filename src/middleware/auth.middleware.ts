import { NextFunction, Request, Response } from 'express';
import {
  extractTokenFromHeader,
  JwtPayload,
  verifyAccessToken,
} from '../utils/jwt.util';
import prisma from '../config/database';
import { unauthorizedResponse } from '../utils/response.util';

// Request<Params = core.ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = qs.ParsedQs>

export interface AuthenticatedRequest<
  P = Record<string, string>, // Route params
  ResBody = any, // Response body
  ReqBody = any, // Request body
  ReqQuery = Record<string, any>, // Query params
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  };
}
// JWT Authentication Middleware
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    const payload: JwtPayload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    if (!user) {
      return unauthorizedResponse(res, 'User not found or has been deleted');
    }

    if (!user.isActive) {
      return unauthorizedResponse(res, 'Account has been deactivated');
    }

    req.user = user;

    // Go to the controller
    next();
  } catch (error) {
    return unauthorizedResponse(
      res,
      error instanceof Error ? error.message : 'Authentication failed'
    );
  }
};

// Optional Authentication Middleware
// This is incase if i have any route that doen't need auth
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      req.user = undefined;
      return next();
    }

    const token = extractTokenFromHeader(authHeader);
    const payload: JwtPayload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    if (user && user.isActive) {
      req.user = user;
    } else {
      req.user = undefined;
    }

    next();
  } catch {
    req.user = undefined;
    next();
  }
};
