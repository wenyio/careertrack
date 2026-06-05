/**
 * MCP Server
 *
 * 为 Agent 提供 MCP 工具，覆盖个人信息和简历的查询/编辑能力。
 * 每个请求创建独立的 McpServer 实例，通过闭包注入 userId。
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getProfile, updateProfile, addProfileEntry, updateProfileEntry, deleteProfileEntry } from '@/lib/services/profile'
import type { ProfileArrayField } from '@/lib/services/profile'
import {
  listResumes,
  getResume,
  createResume,
  buildInitialContentFromProfile,
  updateResumeMetadata,
  patchResumeContent,
  updatePreviewConfig,
  toggleModule,
  reorderModules,
  renameModule,
  publishResume,
  unpublishResume,
  generatePreviewToken,
} from '@/lib/services/resume'
// DEFAULT_MODULES_ORDER is used indirectly via resume services
import { textToDoc, validateRichTextDoc } from '@/utils/rich-text'
import type { ResumeModuleType, ResumeTemplateId, RichTextNode } from '@/types/resume'

/** 合法的简历模块类型 */
const VALID_MODULES: ResumeModuleType[] = [
  'basic_info', 'education', 'skills', 'work_experience',
  'projects', 'portfolio', 'awards', 'other_experience',
  'research', 'summary',
]

/** 合法的模板 ID */
const VALID_TEMPLATES: ResumeTemplateId[] = ['classic', 'modern', 'minimal', 'black-white']

/** 合法的预览字号 */
const VALID_FONT_SIZES = [12, 14, 16, 18, 20]

/** 创建 MCP Server 实例（每个请求独立） */
export function createMcpServerForUser(userId: string): McpServer {
  const server = new McpServer({
    name: 'CareerTrack',
    version: '1.0.0',
  })

  // ========== schema_get ==========
  server.tool(
    'schema_get',
    '获取简历数据结构定义，包括模块类型、字段配置、模板列表等元数据',
    {},
    async () => {
      const modules = VALID_MODULES.map((key) => ({
        key,
        label: getModuleLabelFromKey(key),
      }))

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              modules,
              templates: VALID_TEMPLATES,
              font_sizes: VALID_FONT_SIZES,
              line_height_range: [1, 3],
              module_types: VALID_MODULES,
              note: 'basic_info 模块不能被禁用。modules_order 必须包含所有合法模块且不能重复。',
            }, null, 2),
          },
        ],
      }
    }
  )

  // ========== profile_get ==========
  server.tool(
    'profile_get',
    '获取当前用户的个人信息',
    {},
    async () => {
      const profile = await getProfile(userId)
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(profile, null, 2) },
        ],
      }
    }
  )

  // ========== profile_update ==========
  server.tool(
    'profile_update',
    '局部更新个人信息。只传需要修改的字段即可，未传的字段保持不变。',
    {
      basic_info: z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        avatar: z.string().optional(),
        job_intention: z.object({
          current_status: z.string().optional(),
          position: z.string().optional(),
          expected_city: z.string().optional(),
          expected_salary: z.string().optional(),
        }).partial().optional(),
        other: z.object({
          education_level: z.string().optional(),
          website: z.string().optional(),
          wechat: z.string().optional(),
          city: z.string().optional(),
          github: z.string().optional(),
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
      const updates: Record<string, unknown> = {}
      if (args.basic_info) {
        const current = await getProfile(userId)
        updates.basic_info = deepMerge(current.basic_info, args.basic_info)
      }
      if (args.summary !== undefined) {
        updates.summary = args.summary
      }
      const profile = await updateProfile(userId, updates)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              id: profile.id,
              updated_at: profile.updated_at,
              message: '个人信息更新成功',
            }),
          },
        ],
      }
    }
  )

  // ========== profile_add_entry ==========
  const PROFILE_ARRAY_FIELDS = ['education', 'skills', 'work_experience', 'projects', 'portfolio', 'awards', 'other_experience', 'research'] as const

  server.tool(
    'profile_add_entry',
    '向个人信息的数组字段添加新条目（如添加一条教育经历、工作经历等）。新条目会自动生成 id。',
    {
      field: z.enum(PROFILE_ARRAY_FIELDS).describe('数组字段名'),
      entry: z.record(z.string(), z.unknown()).describe('条目数据（不需要传 id，会自动生成）'),
    },
    async (args) => {
      try {
        const updated = await addProfileEntry(userId, args.field as ProfileArrayField, args.entry)
        const entries = (updated as unknown as Record<string, unknown>)[args.field] as unknown[]
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
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `错误：${(e as Error).message}` }], isError: true }
      }
    }
  )

  // ========== profile_update_entry ==========
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
        const updated = await updateProfileEntry(userId, args.field as ProfileArrayField, args.entryId, args.updates)
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
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `错误：${(e as Error).message}` }], isError: true }
      }
    }
  )

  // ========== profile_delete_entry ==========
  server.tool(
    'profile_delete_entry',
    '删除个人信息数组字段中的某个条目（按 id 匹配）。',
    {
      field: z.enum(PROFILE_ARRAY_FIELDS).describe('数组字段名'),
      entryId: z.string().describe('条目 ID'),
    },
    async (args) => {
      try {
        const updated = await deleteProfileEntry(userId, args.field as ProfileArrayField, args.entryId)
        const entries = (updated as unknown as Record<string, unknown>)[args.field] as unknown[]
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
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `错误：${(e as Error).message}` }], isError: true }
      }
    }
  )

  // ========== profile_update_rich_text ==========
  server.tool(
    'profile_update_rich_text',
    '更新个人信息数组字段中某个条目的富文本字段（如 description）。支持 plainText 和 doc 两种模式。',
    {
      field: z.enum(PROFILE_ARRAY_FIELDS).describe('数组字段名'),
      entryId: z.string().describe('条目 ID'),
      textField: z.string().default('description').describe('富文本字段名，默认 description'),
      mode: z.enum(['plainText', 'doc']).default('plainText').describe('输入模式'),
      content: z.union([z.string(), z.record(z.string(), z.unknown())]).describe('纯文本或 TipTap doc JSON'),
    },
    async (args) => {
      try {
        let docValue: RichTextNode | string
        if (args.mode === 'plainText') {
          docValue = textToDoc(typeof args.content === 'string' ? args.content : JSON.stringify(args.content))
        } else {
          const raw = typeof args.content === 'string' ? JSON.parse(args.content) : args.content
          const validation = validateRichTextDoc(raw as RichTextNode)
          if (!validation.valid) {
            return { content: [{ type: 'text' as const, text: `错误：富文本格式不合法 - ${validation.error}` }], isError: true }
          }
          docValue = raw as RichTextNode
        }

        const updated = await updateProfileEntry(userId, args.field as ProfileArrayField, args.entryId, { [args.textField]: docValue })
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
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `错误：${(e as Error).message}` }], isError: true }
      }
    }
  )

  // ========== resume_list ==========
  server.tool(
    'resume_list',
    '获取当前用户的所有简历列表',
    {},
    async () => {
      const resumes = await listResumes(userId)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(resumes.map((r) => ({
              id: r.id,
              name: r.name,
              template: r.template,
              is_public: r.is_public,
              public_url: r.is_public && r.public_slug ? buildPublicUrl(r.public_slug) : null,
              updated_at: r.updated_at,
            })), null, 2),
          },
        ],
      }
    }
  )

  // ========== resume_get ==========
  server.tool(
    'resume_get',
    '获取指定简历的完整详情，包括内容、模块配置、模板等',
    {
      resumeId: z.string().describe('简历 ID'),
    },
    async (args) => {
      const resume = await getResume(args.resumeId, userId)
      if (!resume) {
        return { content: [{ type: 'text' as const, text: '错误：简历不存在或无权访问' }], isError: true }
      }
      const data = {
        ...resume,
        public_url: resume.is_public && resume.public_slug ? buildPublicUrl(resume.public_slug) : null,
      }
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      }
    }
  )

  // ========== resume_create ==========
  server.tool(
    'resume_create',
    '创建一份新简历',
    {
      name: z.string().min(1).describe('简历名称'),
      initialize_from_profile: z.boolean().default(true).describe('是否从个人信息初始化简历内容，默认 true'),
    },
    async (args) => {
      let initialContent: Record<string, unknown> | undefined
      if (args.initialize_from_profile) {
        const profile = await getProfile(userId)
        initialContent = buildInitialContentFromProfile(profile as unknown as Record<string, unknown>)
      }

      const resume = await createResume(userId, args.name, initialContent)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              id: resume.id,
              name: resume.name,
              template: resume.template,
              created_at: resume.created_at,
              initialized_from_profile: args.initialize_from_profile,
              message: '简历创建成功',
            }),
          },
        ],
      }
    }
  )

  // ========== resume_patch_content ==========
  server.tool(
    'resume_patch_content',
    '局部更新简历内容。只传需要修改的模块字段，支持 deep merge。数组字段（如 education、skills）会整体替换。',
    {
      resumeId: z.string().describe('简历 ID'),
      content: z.object({
        basic_info: z.record(z.string(), z.unknown()).optional(),
        education: z.array(z.record(z.string(), z.unknown())).optional(),
        skills: z.array(z.record(z.string(), z.unknown())).optional(),
        work_experience: z.array(z.record(z.string(), z.unknown())).optional(),
        projects: z.array(z.record(z.string(), z.unknown())).optional(),
        portfolio: z.array(z.record(z.string(), z.unknown())).optional(),
        awards: z.array(z.record(z.string(), z.unknown())).optional(),
        other_experience: z.array(z.record(z.string(), z.unknown())).optional(),
        research: z.array(z.record(z.string(), z.unknown())).optional(),
        summary: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
        basic_info_display: z.record(z.string(), z.unknown()).optional(),
        module_titles: z.record(z.string(), z.string()).optional(),
      }).describe('要更新的 content 字段（局部 patch）'),
    },
    async (args) => {
      const resume = await getResume(args.resumeId, userId)
      if (!resume) {
        return { content: [{ type: 'text' as const, text: '错误：简历不存在或无权访问' }], isError: true }
      }

      // 对 basic_info 做 deep merge，其他字段整体替换
      const contentPatch: Record<string, unknown> = { ...args.content }
      if (args.content.basic_info && resume.content?.basic_info) {
        contentPatch.basic_info = deepMerge(resume.content.basic_info, args.content.basic_info)
      }

      const updated = await patchResumeContent(args.resumeId, userId, contentPatch)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              id: updated.id,
              updated_at: updated.updated_at,
              message: '简历内容更新成功',
            }),
          },
        ],
      }
    }
  )

  // ========== resume_update_metadata ==========
  server.tool(
    'resume_update_metadata',
    '更新简历元数据（名称、模板）。不传的字段保持不变。',
    {
      resumeId: z.string().describe('简历 ID'),
      name: z.string().min(1).optional().describe('新名称'),
      template: z.enum(['classic', 'modern', 'minimal', 'black-white']).optional().describe('模板 ID'),
    },
    async (args) => {
      const resume = await getResume(args.resumeId, userId)
      if (!resume) {
        return { content: [{ type: 'text' as const, text: '错误：简历不存在或无权访问' }], isError: true }
      }

      const updates: { name?: string; template?: ResumeTemplateId } = {}
      if (args.name !== undefined) updates.name = args.name
      if (args.template !== undefined) updates.template = args.template as ResumeTemplateId

      const updated = await updateResumeMetadata(args.resumeId, userId, updates)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              id: updated.id,
              name: updated.name,
              template: updated.template,
              updated_at: updated.updated_at,
              message: '简历元数据更新成功',
            }),
          },
        ],
      }
    }
  )

  // ========== resume_update_rich_text_field ==========
  server.tool(
    'resume_update_rich_text_field',
    '更新简历中某个模块的富文本字段（description 或 summary）。支持 plainText 和 doc 两种输入模式。',
    {
      resumeId: z.string().describe('简历 ID'),
      module: z.enum(VALID_MODULES as [string, ...string[]]).describe('模块类型'),
      entryId: z.string().optional().describe('数组模块的条目 ID（如 education 的某一项）。summary 模块不需要此参数。'),
      field: z.string().default('description').describe('字段名，默认 description'),
      mode: z.enum(['plainText', 'doc']).default('plainText').describe('输入模式：plainText 自动转为 doc，doc 直接使用'),
      content: z.union([z.string(), z.record(z.string(), z.unknown())]).describe('纯文本字符串或 TipTap doc JSON'),
    },
    async (args) => {
      const resume = await getResume(args.resumeId, userId)
      if (!resume) {
        return { content: [{ type: 'text' as const, text: '错误：简历不存在或无权访问' }], isError: true }
      }

      let docValue: RichTextNode | string
      if (args.mode === 'plainText') {
        docValue = textToDoc(typeof args.content === 'string' ? args.content : JSON.stringify(args.content))
      } else {
        const raw = typeof args.content === 'string' ? JSON.parse(args.content) : args.content
        const validation = validateRichTextDoc(raw as RichTextNode)
        if (!validation.valid) {
          return { content: [{ type: 'text' as const, text: `错误：富文本格式不合法 - ${validation.error}` }], isError: true }
        }
        docValue = raw as RichTextNode
      }

      const moduleKey = args.module as ResumeModuleType
      const field = args.field

      if (moduleKey === 'summary') {
        // summary 是顶层字段
        const updated = await patchResumeContent(args.resumeId, userId, { summary: docValue as unknown as string })
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                id: updated.id,
                updated_at: updated.updated_at,
                message: 'summary 更新成功',
              }),
            },
          ],
        }
      }

      // 数组模块：找到对应条目并更新字段
      const currentContent = (resume.content || {}) as Record<string, unknown>
      const entries = (currentContent[moduleKey] as Record<string, unknown>[]) || []
      const entryIndex = entries.findIndex((e) => e.id === args.entryId)

      if (entryIndex === -1) {
        return {
          content: [{ type: 'text' as const, text: `错误：未找到模块 ${moduleKey} 中 id 为 ${args.entryId} 的条目` }],
          isError: true,
        }
      }

      const updatedEntries = [...entries]
      updatedEntries[entryIndex] = { ...updatedEntries[entryIndex], [field]: docValue }

      const updated = await patchResumeContent(args.resumeId, userId, { [moduleKey]: updatedEntries })
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              id: updated.id,
              updated_at: updated.updated_at,
              message: `${moduleKey}[${entryIndex}].${field} 更新成功`,
            }),
          },
        ],
      }
    }
  )

  // ========== resume_reorder_modules ==========
  server.tool(
    'resume_reorder_modules',
    '重新排列简历模块的显示顺序。必须包含所有合法模块且不能重复。',
    {
      resumeId: z.string().describe('简历 ID'),
      modules_order: z.array(z.enum(VALID_MODULES as [string, ...string[]]))
        .describe('新的模块顺序，必须包含所有 10 个模块'),
    },
    async (args) => {
      const order = args.modules_order as ResumeModuleType[]

      // 校验：必须包含所有合法模块且不重复
      const orderSet = new Set(order)
      if (orderSet.size !== VALID_MODULES.length || !VALID_MODULES.every((m) => orderSet.has(m))) {
        return {
          content: [{ type: 'text' as const, text: `错误：modules_order 必须包含所有 ${VALID_MODULES.length} 个合法模块且不能重复` }],
          isError: true,
        }
      }

      const updated = await reorderModules(args.resumeId, userId, order)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              id: updated.id,
              modules_order: updated.modules_order,
              updated_at: updated.updated_at,
              message: '模块顺序更新成功',
            }),
          },
        ],
      }
    }
  )

  // ========== resume_toggle_module ==========
  server.tool(
    'resume_toggle_module',
    '启用或禁用简历的某个模块。basic_info 不能被禁用。',
    {
      resumeId: z.string().describe('简历 ID'),
      module: z.enum(VALID_MODULES.filter((m) => m !== 'basic_info') as [string, ...string[]])
        .describe('模块类型（不能是 basic_info）'),
      enabled: z.boolean().describe('是否启用'),
    },
    async (args) => {
      const updated = await toggleModule(
        args.resumeId,
        userId,
        args.module as ResumeModuleType,
        args.enabled,
      )
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              id: updated.id,
              modules_config: updated.modules_config,
              updated_at: updated.updated_at,
              message: `模块 ${args.module} 已${args.enabled ? '启用' : '禁用'}`,
            }),
          },
        ],
      }
    }
  )

  // ========== resume_update_preview_config ==========
  server.tool(
    'resume_update_preview_config',
    '更新简历预览的字号和行距配置。不传的字段保持不变。',
    {
      resumeId: z.string().describe('简历 ID'),
      fontSize: z.number().refine((v) => VALID_FONT_SIZES.includes(v), {
        message: `fontSize 必须是 ${VALID_FONT_SIZES.join(', ')} 之一`,
      }).optional().describe('字号，可选值：12, 14, 16, 18, 20'),
      lineHeight: z.number().min(1).max(3).optional().describe('行距，范围 1-3'),
    },
    async (args) => {
      const config: Record<string, number> = {}
      if (args.fontSize !== undefined) config.fontSize = args.fontSize
      if (args.lineHeight !== undefined) config.lineHeight = args.lineHeight

      if (Object.keys(config).length === 0) {
        return { content: [{ type: 'text' as const, text: '错误：至少需要传入 fontSize 或 lineHeight 之一' }], isError: true }
      }

      const updated = await updatePreviewConfig(args.resumeId, userId, config)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              id: updated.id,
              preview_config: (updated.content as Record<string, unknown>)?.preview_config,
              updated_at: updated.updated_at,
              message: '预览配置更新成功',
            }),
          },
        ],
      }
    }
  )

  // ========== resume_rename_module ==========
  server.tool(
    'resume_rename_module',
    '为简历模块设置自定义标题。传空字符串可恢复默认标题。',
    {
      resumeId: z.string().describe('简历 ID'),
      module: z.enum(VALID_MODULES as [string, ...string[]]).describe('模块类型'),
      title: z.string().describe('自定义标题，空字符串恢复默认'),
    },
    async (args) => {
      const updated = await renameModule(
        args.resumeId,
        userId,
        args.module as ResumeModuleType,
        args.title,
      )
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              id: updated.id,
              module_titles: (updated.content as Record<string, unknown>)?.module_titles,
              updated_at: updated.updated_at,
              message: `模块 ${args.module} 标题更新成功`,
            }),
          },
        ],
      }
    }
  )

  // ========== resume_publish ==========
  server.tool(
    'resume_publish',
    '发布简历，设置公开链接。发布后可通过公开链接访问简历。',
    {
      resumeId: z.string().describe('简历 ID'),
      slug: z.string().min(1).describe('公开链接标识（URL 友好的短字符串，如 my-resume）'),
    },
    async (args) => {
      try {
        const updated = await publishResume(args.resumeId, userId, args.slug)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                id: updated.id,
                is_public: updated.is_public,
                public_slug: updated.public_slug,
                public_url: buildPublicUrl(updated.public_slug!),
                updated_at: updated.updated_at,
                message: '简历已发布',
              }),
            },
          ],
        }
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `错误：${(e as Error).message}` }], isError: true }
      }
    }
  )

  // ========== resume_unpublish ==========
  server.tool(
    'resume_unpublish',
    '取消发布简历，移除公开链接。取消后公开链接将无法访问。',
    {
      resumeId: z.string().describe('简历 ID'),
    },
    async (args) => {
      try {
        const updated = await unpublishResume(args.resumeId, userId)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                id: updated.id,
                is_public: updated.is_public,
                updated_at: updated.updated_at,
                message: '已取消发布',
              }),
            },
          ],
        }
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `错误：${(e as Error).message}` }], isError: true }
      }
    }
  )

  // ========== resume_preview_get ==========
  server.tool(
    'resume_preview_get',
    '获取简历的预览数据，包括解析后的模块内容和当前配置',
    {
      resumeId: z.string().describe('简历 ID'),
    },
    async (args) => {
      const resume = await getResume(args.resumeId, userId)
      if (!resume) {
        return { content: [{ type: 'text' as const, text: '错误：简历不存在或无权访问' }], isError: true }
      }

      const content = (resume.content || {}) as Record<string, unknown>
      const previewConfig = content.preview_config || {}

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              id: resume.id,
              name: resume.name,
              template: resume.template,
              is_public: resume.is_public,
              public_url: resume.is_public && resume.public_slug ? buildPublicUrl(resume.public_slug) : null,
              preview_url: buildPreviewUrl(resume),
              modules_config: resume.modules_config,
              modules_order: resume.modules_order,
              preview_config: previewConfig,
              module_titles: content.module_titles || {},
              content_summary: {
                basic_info: content.basic_info ? '已填写' : '未填写',
                education: Array.isArray(content.education) ? `${content.education.length} 条` : '未填写',
                skills: Array.isArray(content.skills) ? `${content.skills.length} 条` : '未填写',
                work_experience: Array.isArray(content.work_experience) ? `${content.work_experience.length} 条` : '未填写',
                projects: Array.isArray(content.projects) ? `${content.projects.length} 条` : '未填写',
                summary: content.summary ? '已填写' : '未填写',
              },
            }, null, 2),
          },
        ],
      }
    }
  )

  return server
}

// ========== 辅助函数 ==========

/** 构建简历公开链接 */
function buildPublicUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${base}/resume/${slug}`
}

/** 构建预览链接（已发布用公开链接，未发布用签名 token） */
function buildPreviewUrl(resume: { id: string; is_public: boolean; public_slug: string | null }): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  if (resume.is_public && resume.public_slug) {
    return `${base}/resume/${resume.public_slug}`
  }
  const { token, expiresAt } = generatePreviewToken(resume.id)
  return `${base}/resume/preview/${resume.id}?token=${token}&expires=${expiresAt}`
}

/** 模块 key 到中文标签的映射 */
function getModuleLabelFromKey(key: string): string {
  const labels: Record<string, string> = {
    basic_info: '基本信息',
    education: '教育经历',
    skills: '专业技能',
    work_experience: '工作经历',
    projects: '项目经历',
    portfolio: '个人作品',
    awards: '荣誉奖项',
    other_experience: '其他经历',
    research: '研究经历',
    summary: '个人简介',
  }
  return labels[key] || key
}

/** 深度合并对象（source 覆盖 target 的对应字段） */
function deepMerge(target: unknown, source: unknown): unknown {
  if (!target || typeof target !== 'object' || !source || typeof source !== 'object') {
    return source
  }
  if (Array.isArray(source)) return source

  const result = { ...(target as Record<string, unknown>) }
  for (const key of Object.keys(source as Record<string, unknown>)) {
    const sourceVal = (source as Record<string, unknown>)[key]
    const targetVal = result[key]
    if (
      sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal) &&
      targetVal && typeof targetVal === 'object' && !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal, sourceVal)
    } else {
      result[key] = sourceVal
    }
  }
  return result
}
