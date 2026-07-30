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

function toolInputSchema(name: string): {
  safeParse: (input: unknown) => { success: boolean }
} {
  const server = createMcpServerForUser({
    userId: 'test-user',
    keyId: 'test-key',
    scope: 'read_write',
  })
  const registered = (
    server as unknown as {
      _registeredTools: Record<
        string,
        { inputSchema: { safeParse: (input: unknown) => { success: boolean } } }
      >
    }
  )._registeredTools
  return registered[name].inputSchema
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

  it('shares URL and rich-text validation with REST write schemas', () => {
    const profileUpdate = toolInputSchema('profile_update')
    expect(profileUpdate.safeParse({
      basic_info: { avatar: '/uploads/avatar.png' },
    }).success).toBe(true)
    expect(profileUpdate.safeParse({
      basic_info: { avatar: 'javascript:alert(1)' },
    }).success).toBe(false)

    const resumePatch = toolInputSchema('resume_patch_content')
    expect(resumePatch.safeParse({
      resumeId: 'resume-1',
      content: {
        summary: {
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: '合法内容' }],
          }],
        },
      },
    }).success).toBe(true)
    expect(resumePatch.safeParse({
      resumeId: 'resume-1',
      content: {
        summary: {
          type: 'doc',
          content: [{ type: 'heading' }],
        },
      },
    }).success).toBe(false)
  })
})
