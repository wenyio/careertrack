import type {
  PaginatedData,
  PaginationMeta,
  PaginationParams,
} from '@/types/pagination'

export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
export const MAX_PAGE = 100_000

/** Convert a validated page request into a SQL OFFSET. */
export function paginationOffset({ page, pageSize }: PaginationParams): number {
  return (page - 1) * pageSize
}

/** Build stable metadata even when the requested page is currently empty. */
export function paginationMeta(
  { page, pageSize }: PaginationParams,
  total: number,
): PaginationMeta {
  return {
    page,
    page_size: pageSize,
    total,
    total_pages: total === 0 ? 0 : Math.ceil(total / pageSize),
  }
}

export function paginatedData<T>(
  items: T[],
  params: PaginationParams,
  total: number,
): PaginatedData<T> {
  return {
    items,
    pagination: paginationMeta(params, total),
  }
}
