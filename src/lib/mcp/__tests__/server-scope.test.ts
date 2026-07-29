import { describe, expect, it } from 'vitest'
import { createMcpServerForUser } from '@/lib/mcp/server'

function toolNames(scope: 'read_only' | 'read_write'): string[] {
  const server = createMcpServerForUser({
    userId: 'test-user',
    keyId: 'test-key',
    scope,
  })
  const registered = (
    server as unknown as { _registeredTools: Record<string, unknown> }
  )._registeredTools
  return Object.keys(registered).sort()
}

describe('MCP scope registration', () => {
  it('exposes only non-mutating tools to read_only keys', () => {
    expect(toolNames('read_only')).toEqual([
      'profile_get',
      'resume_get',
      'resume_list',
      'resume_preview_get',
      'schema_get',
    ])
  })

  it('keeps all tools available to read_write keys', () => {
    const names = toolNames('read_write')
    expect(names).toHaveLength(20)
    expect(names).toContain('profile_update')
    expect(names).toContain('resume_create')
    expect(names).toContain('resume_publish')
    expect(names).toContain('resume_unpublish')
  })
})
