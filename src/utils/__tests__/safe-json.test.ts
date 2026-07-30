import { describe, expect, it } from 'vitest'
import { parseJsonValue, serializeJsonForHtml } from '@/utils/safe-json'

describe('parseJsonValue', () => {
  const fallback = { status: 'fallback' }

  it('accepts SQLite JSON strings and PostgreSQL decoded values', () => {
    expect(parseJsonValue('{"name":"CareerTrack"}', fallback)).toEqual({
      name: 'CareerTrack',
    })

    const decoded = { name: 'CareerTrack' }
    expect(parseJsonValue(decoded, fallback)).toBe(decoded)
  })

  it('returns the fallback for missing or malformed JSON', () => {
    expect(parseJsonValue(null, fallback)).toBe(fallback)
    expect(parseJsonValue('', fallback)).toBe(fallback)
    expect(parseJsonValue('{invalid', fallback)).toBe(fallback)
  })
})

describe('serializeJsonForHtml', () => {
  it('preserves the JSON value after parsing', () => {
    const value = {
      name: '研发 <工程师> & maintainer',
      separator: '\u2028\u2029',
    }

    expect(JSON.parse(serializeJsonForHtml(value))).toEqual(value)
  })

  it('prevents closing a script element with user-controlled content', () => {
    const value = {
      name: '</script><script>window.__xss = true</script>',
    }

    const serialized = serializeJsonForHtml(value)

    expect(serialized).not.toContain('<')
    expect(serialized.toLowerCase()).not.toContain('</script')
    expect(JSON.parse(serialized)).toEqual(value)
  })
})
