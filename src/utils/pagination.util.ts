import { PaginationMeta } from './response.util';

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreatePaginationOptionsInterface {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Create pagination options with defaults
export const createPaginationOptions = (
  query: CreatePaginationOptionsInterface
): PaginationOptions => {
  const page = Math.max(1, parseInt(query.page || '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10') || 10)); // Max 100 items
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  return { page, limit, sortBy, sortOrder };
};

// Calculate skip value for database queries
export const calculateSkip = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

// Create pagination meta for existing paginatedResponse
export const createPaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => {
  return { page, limit, total };
};
