import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { validationErrorResponse } from '../utils/response.util';

// We will validate req.(body, params, query)
type ValidationTarget = 'body' | 'params' | 'query';

export type TypedRequest<P = object, Q = object, B = object> = Request<
  P,
  any,
  B,
  Q
>;

export const validateRequest = (
  schema: z.ZodType,
  target: ValidationTarget = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      let dataToValidate: unknown;

      switch (target) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        default:
          dataToValidate = req.body;
      }
      // We passed dataToValidate as a [Object: null prototype]
      const validatedData = schema.parse(dataToValidate);

      switch (target) {
        case 'body':
          req.body = validatedData;
          break;
        case 'params':
          // Ts expect req.params to be ParamsDictionary which is a Record<string, string>
          Object.assign(req.params, validatedData);
          break;
        case 'query':
          // req.query = validatedData as Record<string, any>;
          // This will not work casue req.query is read-only or protected
          // The Object.assign() approach worked because it merges properties into the existing object instead of replacing it entirely.
          Object.assign(req.query, validatedData);
          break;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err) => ({
          param: err.path.join('.'),
          msg: err.message,
          value: String(err.input),
          location: target,
        }));

        return validationErrorResponse(
          res,
          formattedErrors,
          'Validation failed'
        );
      }

      return validationErrorResponse(
        res,
        [
          {
            param: 'unknown',
            msg: 'Validation error occurred',
            location: target,
          },
        ],
        'Validation failed'
      );
    }
  };
};

// Validate request body
export const validateBody = (schema: z.ZodType) => {
  return validateRequest(schema, 'body');
};

// Validate request params
export const validateParams = (schema: z.ZodType) => {
  return validateRequest(schema, 'params');
};

// Validate request query
export const validateQuery = (schema: z.ZodType) => {
  return validateRequest(schema, 'query');
};

// Common validation schemas for params
export const idParamSchema = z.object({
  id: z.uuid('Invalid ID format'),
});

// Pagination query schema
export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Search query schema
export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').trim(),
  ...paginationQuerySchema.shape,
});

// Types for TypeScript (inferred from schemas)
export type IdParamInput = z.infer<typeof idParamSchema>;
export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
