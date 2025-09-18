import { Response } from 'express';

type metaType = {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: string;
};

type ValidationErrorItem = {
  param: string; // field name
  msg: string;
  value?: string; // invalid value
  location?: string; // body, query, params
};

type ErrorDetails =
  | { field: string[] }
  | { fields: Record<string, string> }
  | { errors: ValidationErrorItem[] }
  | undefined;

// Standard success response interface
export interface ApiSuccessResponse<T = any> {
  success: true;
  message?: string;
  data?: T;
  meta?: metaType;
}

// Pagination metadata interface
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

// Success response utility
export const successResponse = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200,
  meta?: metaType
): Response => {
  const response: ApiSuccessResponse<T> = {
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data }),
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
    },
  };

  return res.status(statusCode).json(response);
};

// Created response (201)
export const createdResponse = <T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response => {
  return successResponse(res, data, message, 201);
};

// No content response (204)
export const noContentResponse = (res: Response): Response => {
  return res.status(204).send();
};

// Paginated response utility
export const paginatedResponse = <T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message?: string
): Response => {
  const { page, limit, total } = meta;
  const totalPages = Math.ceil(total / limit);

  const paginationMeta = {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    timestamp: new Date().toString(),
  };

  return successResponse(res, data, message, 200, paginationMeta);
};

// Error response utility (for manual error responses) ------------------------------------
export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: ErrorDetails
): Response => {
  const response = {
    success: false,
    error: {
      message,
      ...(code && { code }),
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
};

// Validation error response
export const validationErrorResponse = (
  res: Response,
  errors: ValidationErrorItem[],
  message: string = 'Validation failed'
): Response => {
  return errorResponse(res, message, 400, 'VALIDATION_ERROR', { errors });
};

// Unauthorized response
export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized access'
): Response => {
  return errorResponse(res, message, 401, 'UNAUTHORIZED');
};

// Forbidden response
export const forbiddenResponse = (
  res: Response,
  message: string = 'Access forbidden'
): Response => {
  return errorResponse(res, message, 403, 'FORBIDDEN');
};

// Not found response
export const notFoundResponse = (
  res: Response,
  message: string = 'Resource not found'
): Response => {
  return errorResponse(res, message, 404, 'NOT_FOUND');
};
