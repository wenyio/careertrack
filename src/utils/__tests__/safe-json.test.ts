import { describe, expect, it } from 'vitest'
import { serializeJsonForHtml } from '@/utils/safe-json'

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
