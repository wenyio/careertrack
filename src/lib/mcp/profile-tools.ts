import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  addProfileEntry,
  deleteProfileEntry,
  getProfile,
  patchProfileFields,
  updateProfileEntry,
} from '@/lib/services/profile'
import type { ProfileArrayField } from '@/lib/services/profile'
import {
  profileArrayEntrySchemas,
  safeWebUrlSchema,
} from '@/lib/validation/business'
import { textToDoc, validateRichTextDoc } from '@/utils/rich-text'
import type { RichTextNode } from '@/types/resume'

const PROFILE_ARRAY_FIELDS = [
  'education',
  'skills',
  'work_experience',
  'projects',
  'portfolio',
  'awards',
  'other_experience',
  'research',
] as const

/** 注册 Profile 领域工具；只读 Key 只会看到 profile_get。 */
export function registerProfileTools(
  server: McpServer,
  userId: string,
  canWrite: boolean,
): void {
  server.tool(
    'profile_get',
    '获取当前用户的个人信息',
    {},
    async () => {
      const profile = await getProfile(userId)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(profile, null, 2),
        }],
      }
    },
  )

  if (!canWrite) return

  server.tool(
    'profile_update',
    '局部更新个人信息。只传需要修改的字段即可，未传的字段保持不变。',
    {
      basic_info: z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        avatar: safeWebUrlSchema.optional(),
        job_intention: z.object({
          current_status: z.string().optional(),
          position: z.string().optional(),
          expected_city: z.string().optional(),
          expected_salary: z.string().optional(),
        }).partial().optional(),
        other: z.object({
          education_level: z.string().optional(),
          website: safeWebUrlSchema.optional(),
          wechat: z.string().optional(),
          city: z.string().optional(),
          github: safeWebUrlSchema.optional(),
          age: z.number().optional(),
          work_years: z.number().optional(),
          gender: z.string().optional(),
          height: z.string().optional(),
          weight: z.string().optional(),
          native_place: z.string().optional(),
          nation: z.string().optional(),
          political_status: z.string().optional(),
          marital_status: z.string().optional(),
          birthday: z.string().optional(),
        }).partial().optional(),
      }).partial().optional(),
      summary: z.string().optional(),
    },
    async (args) => {
      const profile = await patchProfileFields(userId, args)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: profile.id,
            updated_at: profile.updated_at,
            message: '个人信息更新成功',
          }),
        }],
      }
    },
  )

  server.tool(
    'profile_add_entry',
    '向个人信息的数组字段添加新条目（如添加一条教育经历、工作经历等）。新条目会自动生成 id。',
    {
      field: z.enum(PROFILE_ARRAY_FIELDS).describe('数组字段名'),
      entry: z.record(z.string(), z.unknown())
        .describe('条目数据（不需要传 id，会自动生成）'),
    },
    async (args) => {
      try {
        const parsedEntry = profileArrayEntrySchemas[args.field].safeParse(args.entry)
        if (!parsedEntry.success) {
          return {
            content: [{
              type: 'text' as const,
              text: `错误：${parsedEntry.error.issues[0]?.message || '条目格式无效'}`,
            }],
            isError: true,
          }
        }

        const updated = await addProfileEntry(
          userId,
          args.field as ProfileArrayField,
          parsedEntry.data,
        )
        const entries = (
          updated as unknown as Record<string, unknown>
        )[args.field] as unknown[]
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              field: args.field,
              total: entries.length,
              updated_at: updated.updated_at,
              message: `${args.field} 添加成功`,
            }),
          }],
        }
      } catch (error) {
        return toolError(error)
      }
    },
  )

  server.tool(
    'profile_update_entry',
    '更新个人信息数组字段中的某个条目（按 id 匹配）。只传需要修改的字段，未传的保持不变。',
    {
      field: z.enum(PROFILE_ARRAY_FIELDS).describe('数组字段名'),
      entryId: z.string().describe('条目 ID'),
      updates: z.record(z.string(), z.unknown()).describe('要更新的字段'),
    },
    async (args) => {
      try {
        const parsedUpdates = profileArrayEntrySchemas[args.field]
          .safeParse(args.updates)
        if (!parsedUpdates.success) {
          return {
            content: [{
              type: 'text' as const,
              text: `错误：${parsedUpdates.error.issues[0]?.message || '条目格式无效'}`,
            }],
            isError: true,
          }
        }

        const updated = await updateProfileEntry(
          userId,
          args.field as ProfileArrayField,
          args.entryId,
          parsedUpdates.data,
        )
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              field: args.field,
              entryId: args.entryId,
              updated_at: updated.updated_at,
              message: `${args.field}[${args.entryId}] 更新成功`,
            }),
          }],
        }
      } catch (error) {
        return toolError(error)
      }
    },
  )

  server.tool(
    'profile_delete_entry',
    '删除个人信息数组字段中的某个条目（按 id 匹配）。',
    {
      field: z.enum(PROFILE_ARRAY_FIELDS).describe('数组字段名'),
      entryId: z.string().describe('条目 ID'),
    },
    async (args) => {
      try {
        const updated = await deleteProfileEntry(
          userId,
          args.field as ProfileArrayField,
          args.entryId,
        )
        const entries = (
          updated as unknown as Record<string, unknown>
        )[args.field] as unknown[]
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              field: args.field,
              remaining: entries.length,
              updated_at: updated.updated_at,
              message: `${args.field}[${args.entryId}] 已删除`,
            }),
          }],
        }
      } catch (error) {
        return toolError(error)
      }
    },
  )

  server.tool(
    'profile_update_rich_text',
    '更新个人信息数组字段中某个条目的富文本字段（如 description）。支持 plainText 和 doc 两种模式。',
    {
      field: z.enum(PROFILE_ARRAY_FIELDS).describe('数组字段名'),
      entryId: z.string().describe('条目 ID'),
      textField: z.string().default('description')
        .describe('富文本字段名，默认 description'),
      mode: z.enum(['plainText', 'doc']).default('plainText').describe('输入模式'),
      content: z.union([z.string(), z.record(z.string(), z.unknown())])
        .describe('纯文本或 TipTap doc JSON'),
    },
    async (args) => {
      try {
        let docValue: RichTextNode | string
        if (args.mode === 'plainText') {
          docValue = textToDoc(
            typeof args.content === 'string'
              ? args.content
              : JSON.stringify(args.content),
          )
        } else {
          const raw = typeof args.content === 'string'
            ? JSON.parse(args.content)
            : args.content
          const validation = validateRichTextDoc(raw as RichTextNode)
          if (!validation.valid) {
            return {
              content: [{
                type: 'text' as const,
                text: `错误：富文本格式不合法 - ${validation.error}`,
              }],
              isError: true,
            }
          }
          docValue = raw as RichTextNode
        }

        const updated = await updateProfileEntry(
          userId,
          args.field as ProfileArrayField,
          args.entryId,
          { [args.textField]: docValue },
        )
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              field: args.field,
              entryId: args.entryId,
              textField: args.textField,
              updated_at: updated.updated_at,
              message: `${args.field}[${args.entryId}].${args.textField} 更新成功`,
            }),
          }],
        }
      } catch (error) {
        return toolError(error)
      }
    },
  )
}

function toolError(error: unknown) {
  return {
    content: [{
      type: 'text' as const,
      text: `错误：${(error as Error).message}`,
    }],
    isError: true,
  }
}
