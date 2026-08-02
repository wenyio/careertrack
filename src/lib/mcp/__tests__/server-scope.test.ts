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
      'applications_action_center',
      'applications_events_list',
      'applications_get',
      'applications_list',
      'applications_summary',
      'profile_get',
      'resume_get',
      'resume_list',
      'resume_preview_get',
      'schema_get',
    ])
  })

  it('keeps all tools available to read_write keys', () => {
    expect(toolNames('read_write')).toEqual([
      'applications_action_center',
      'applications_create',
      'applications_create_event',
      'applications_delete',
      'applications_events_list',
      'applications_get',
      'applications_list',
      'applications_summary',
      'applications_update',
      'profile_add_entry',
      'profile_delete_entry',
      'profile_get',
      'profile_update',
      'profile_update_entry',
      'profile_update_rich_text',
      'resume_create',
      'resume_get',
      'resume_list',
      'resume_patch_content',
      'resume_preview_get',
      'resume_publish',
      'resume_rename_module',
      'resume_reorder_modules',
      'resume_toggle_module',
      'resume_unpublish',
      'resume_update_metadata',
      'resume_update_preview_config',
      'resume_update_rich_text_field',
      'schema_get',
    ])
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
