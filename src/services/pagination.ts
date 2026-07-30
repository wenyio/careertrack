import type { AxiosResponse } from 'axios'
import type { PaginatedData } from '@/types/pagination'

function positiveHeader(
  response: AxiosResponse<unknown>,
  name: string,
  fallback: number,
): number {
  const value = Number(response.headers[name])
  return Number.isInteger(value) && value >= 0 ? value : fallback
}

/**
 * Keep list response bodies backward-compatible arrays while reading the
 * server-side pagination contract from response headers.
 */
export function parsePaginatedResponse<T>(
  response: AxiosResponse<T[]>,
  fallbackPage: number,
  fallbackPageSize: number,
): PaginatedData<T> {
  const total = positiveHeader(response, 'x-total-count', response.data.length)
  return {
    items: response.data,
    pagination: {
      page: positiveHeader(response, 'x-page', fallbackPage),
      page_size: positiveHeader(response, 'x-page-size', fallbackPageSize),
      total,
      total_pages: positiveHeader(
        response,
        'x-total-pages',
        total === 0 ? 0 : Math.ceil(total / fallbackPageSize),
      ),
    },
  }
}
