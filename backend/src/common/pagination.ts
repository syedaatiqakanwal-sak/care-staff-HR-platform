export interface PaginationQuery {
  page?: number | string;
  limit?: number | string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function parsePagination(
  query: PaginationQuery,
  defaults: { limit?: number; maxLimit?: number } = {},
): { page: number; limit: number; skip: number } {
  const maxLimit = defaults.maxLimit ?? MAX_LIMIT;
  const defaultLimit = defaults.limit ?? DEFAULT_LIMIT;
  let page = Math.floor(Number(query.page) || 1);
  let limit = Math.floor(Number(query.limit) || defaultLimit);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  return { page, limit, skip: (page - 1) * limit };
}

export function paginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
