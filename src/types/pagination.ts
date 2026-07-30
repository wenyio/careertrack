/**
 * Shared pagination types used by API routes, services, and table components.
 */

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginationMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface PaginatedData<T> {
  items: T[]
  pagination: PaginationMeta
}
