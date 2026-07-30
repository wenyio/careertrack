import { describe, expect, it } from 'vitest'
import {
  paginatedData,
  paginationMeta,
  paginationOffset,
} from '@/lib/pagination'

describe('pagination helpers', () => {
  it('calculates offset and metadata for a populated page', () => {
    const params = { page: 3, pageSize: 20 }

    expect(paginationOffset(params)).toBe(40)
    expect(paginationMeta(params, 45)).toEqual({
      page: 3,
      page_size: 20,
      total: 45,
      total_pages: 3,
    })
  })

  it('uses zero total pages for an empty collection', () => {
    expect(paginatedData([], { page: 1, pageSize: 20 }, 0)).toEqual({
      items: [],
      pagination: {
        page: 1,
        page_size: 20,
        total: 0,
        total_pages: 0,
      },
    })
  })
})
