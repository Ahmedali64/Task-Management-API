import { NextFunction, Request, Response } from 'express';
import { Prisma } from '../generated/prisma';

export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  constructor(
    message: string,
    StatusCode: number = 500,
    IsOperational: boolean = true
  ) {
    super(message);
    this.statusCode = StatusCode;
    this.isOperational = IsOperational;
    // The second option is just to hide the constructor from the trace message
    Error.captureStackTrace(this, this.constructor);
  }
}

// This is a return value from prisma to show u where did the err come from ex ("details": { "field": ["email"] })
type ErrorDetails = { field: string[] } | undefined;

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: ErrorDetails;
    stack?: string;
  };
  timestamp: string;
}

// Global error handler (This should run after the controller if there is an error passed)
export const errorHandler = (
  error: ApiError | Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code: string | undefined;
  let details: ErrorDetails;

  // Handle different types of errors
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
    code = 'VALIDATION_ERROR';
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    code = error.code;
    // We set message and details based on the code passed by prisma
    switch (code) {
      case 'P2002':
        message = 'A record with this information already exists';
        // details = { field: error.meta?.target };
        details = error.meta?.target
          ? { field: error.meta?.target as string[] }
          : undefined;
        break;
      case 'P2003':
        message = 'Foreign key constraint failed';
        break;
      case 'P2025':
        message = 'Record not found';
        statusCode = 404;
        break;
      default:
        message = 'Database operation failed';
    }
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired';
    code = 'TOKEN_EXPIRED';
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
    code = 'VALIDATION_ERROR';
  }

  // This is just for me in the console
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Details:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      params: req.params,
      query: req.query,
    });
  }

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message,
      code,
      details,
      // just for me to see the stack if the env is dev
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'ROUTE_NOT_FOUND',
    },
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(errorResponse);
};

// For async try catch handel i will just use express-async-handler
