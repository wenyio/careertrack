import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { MAX_PAGE_SIZE } from '@/lib/pagination'
import { getProfile } from '@/lib/services/profile'
import {
  buildInitialContentFromProfile,
  createResume,
  generatePreviewToken,
  getResume,
  listResumes,
  patchResumeContent,
  publishResume,
  renameModule,
  reorderModules,
  toggleModule,
  unpublishResume,
  updatePreviewConfig,
  updateResumeMetadata,
} from '@/lib/services/resume'
import {
  isResumePreviewFontSize,
  RESUME_PREVIEW_FONT_SIZES,
  RESUME_PREVIEW_LINE_HEIGHT_MAX,
  RESUME_PREVIEW_LINE_HEIGHT_MIN,
} from '@/config/resume-preview'
import { resumeContentSchema } from '@/lib/validation/business'
import { textToDoc, validateRichTextDoc } from '@/utils/rich-text'
import type {
  ResumeModuleType,
  ResumeTemplateId,
  RichTextNode,
} from '@/types/resume'
import { VALID_MODULES } from './tool-config'

/** 注册 Resume 领域工具；写工具只对 read_write Key 可见。 */
export function registerResumeTools(
  server: McpServer,
  userId: string,
  canWrite: boolean,
): void {
  registerResumeReadTools(server, userId)
  if (canWrite) registerResumeWriteTools(server, userId)
}

function registerResumeReadTools(server: McpServer, userId: string): void {
  server.tool(
    'resume_list',
    `获取当前用户最近更新的简历列表（最多 ${MAX_PAGE_SIZE} 份）`,
    {},
    async () => {
      const { items: resumes } = await listResumes(userId, {
        page: 1,
        pageSize: MAX_PAGE_SIZE,
      })
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(resumes.map((resume) => ({
            id: resume.id,
            name: resume.name,
            template: resume.template,
            is_public: resume.is_public,
            public_url: resume.is_public && resume.public_slug
              ? buildPublicUrl(resume.public_slug)
              : null,
            updated_at: resume.updated_at,
          })), null, 2),
        }],
      }
    },
  )

  server.tool(
    'resume_get',
    '获取指定简历的完整详情，包括内容、模块配置、模板等',
    {
      resumeId: z.string().describe('简历 ID'),
    },
    async (args) => {
      const resume = await getResume(args.resumeId, userId)
      if (!resume) return resumeNotFound()
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            ...resume,
            public_url: resume.is_public && resume.public_slug
              ? buildPublicUrl(resume.public_slug)
              : null,
          }, null, 2),
        }],
      }
    },
  )

  server.tool(
    'resume_preview_get',
    '获取简历的预览数据，包括解析后的模块内容和当前配置',
    {
      resumeId: z.string().describe('简历 ID'),
    },
    async (args) => {
      const resume = await getResume(args.resumeId, userId)
      if (!resume) return resumeNotFound()

      const content = (resume.content || {}) as Record<string, unknown>
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: resume.id,
            name: resume.name,
            template: resume.template,
            is_public: resume.is_public,
            public_url: resume.is_public && resume.public_slug
              ? buildPublicUrl(resume.public_slug)
              : null,
            preview_url: buildPreviewUrl(resume),
            modules_config: resume.modules_config,
            modules_order: resume.modules_order,
            preview_config: content.preview_config || {},
            module_titles: content.module_titles || {},
            content_summary: {
              basic_info: content.basic_info ? '已填写' : '未填写',
              education: entryCount(content.education),
              skills: entryCount(content.skills),
              work_experience: entryCount(content.work_experience),
              projects: entryCount(content.projects),
              summary: content.summary ? '已填写' : '未填写',
            },
          }, null, 2),
        }],
      }
    },
  )
}

function registerResumeWriteTools(server: McpServer, userId: string): void {
  server.tool(
    'resume_create',
    '创建一份新简历',
    {
      name: z.string().min(1).describe('简历名称'),
      initialize_from_profile: z.boolean().default(true)
        .describe('是否从个人信息初始化简历内容，默认 true'),
    },
    async (args) => {
      let initialContent: Record<string, unknown> | undefined
      if (args.initialize_from_profile) {
        const profile = await getProfile(userId)
        initialContent = buildInitialContentFromProfile(
          profile as unknown as Record<string, unknown>,
        )
      }

      const resume = await createResume(userId, args.name, initialContent)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: resume.id,
            name: resume.name,
            template: resume.template,
            created_at: resume.created_at,
            initialized_from_profile: args.initialize_from_profile,
            message: '简历创建成功',
          }),
        }],
      }
    },
  )

  server.tool(
    'resume_patch_content',
    '局部更新简历内容。只传需要修改的模块字段，支持 deep merge。数组字段（如 education、skills）会整体替换。',
    {
      resumeId: z.string().describe('简历 ID'),
      content: resumeContentSchema.describe('要更新的 content 字段（局部 patch）'),
    },
    async (args) => {
      const resume = await getResume(args.resumeId, userId)
      if (!resume) return resumeNotFound()

      const contentPatch: Record<string, unknown> = { ...args.content }
      if (args.content.basic_info && resume.content?.basic_info) {
        contentPatch.basic_info = deepMerge(
          resume.content.basic_info,
          args.content.basic_info,
        )
      }

      const updated = await patchResumeContent(
        args.resumeId,
        userId,
        contentPatch,
      )
      return updateResult(updated.id, updated.updated_at, '简历内容更新成功')
    },
  )

  server.tool(
    'resume_update_metadata',
    '更新简历元数据（名称、模板）。不传的字段保持不变。',
    {
      resumeId: z.string().describe('简历 ID'),
      name: z.string().min(1).optional().describe('新名称'),
      template: z.enum(['classic', 'modern', 'minimal', 'black-white'])
        .optional()
        .describe('模板 ID'),
    },
    async (args) => {
      const resume = await getResume(args.resumeId, userId)
      if (!resume) return resumeNotFound()

      const updates: { name?: string; template?: ResumeTemplateId } = {}
      if (args.name !== undefined) updates.name = args.name
      if (args.template !== undefined) {
        updates.template = args.template as ResumeTemplateId
      }

      const updated = await updateResumeMetadata(args.resumeId, userId, updates)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: updated.id,
            name: updated.name,
            template: updated.template,
            updated_at: updated.updated_at,
            message: '简历元数据更新成功',
          }),
        }],
      }
    },
  )

  server.tool(
    'resume_update_rich_text_field',
    '更新简历中某个模块的富文本字段（description 或 summary）。支持 plainText 和 doc 两种输入模式。',
    {
      resumeId: z.string().describe('简历 ID'),
      module: z.enum(VALID_MODULES as [string, ...string[]]).describe('模块类型'),
      entryId: z.string().optional()
        .describe('数组模块的条目 ID（如 education 的某一项）。summary 模块不需要此参数。'),
      field: z.string().default('description').describe('字段名，默认 description'),
      mode: z.enum(['plainText', 'doc']).default('plainText')
        .describe('输入模式：plainText 自动转为 doc，doc 直接使用'),
      content: z.union([z.string(), z.record(z.string(), z.unknown())])
        .describe('纯文本字符串或 TipTap doc JSON'),
    },
    async (args) => {
      const resume = await getResume(args.resumeId, userId)
      if (!resume) return resumeNotFound()

      const parsedContent = parseRichText(args.mode, args.content)
      if ('error' in parsedContent) {
        return toolError(parsedContent.error)
      }
      const docValue = parsedContent.value
      const moduleKey = args.module as ResumeModuleType

      if (moduleKey === 'summary') {
        const updated = await patchResumeContent(args.resumeId, userId, {
          summary: docValue as unknown as string,
        })
        return updateResult(updated.id, updated.updated_at, 'summary 更新成功')
      }

      const currentContent = (resume.content || {}) as Record<string, unknown>
      const entries = (
        currentContent[moduleKey] as Record<string, unknown>[] | undefined
      ) || []
      const entryIndex = entries.findIndex((entry) => entry.id === args.entryId)
      if (entryIndex === -1) {
        return toolError(
          `未找到模块 ${moduleKey} 中 id 为 ${args.entryId} 的条目`,
        )
      }

      const updatedEntries = [...entries]
      updatedEntries[entryIndex] = {
        ...updatedEntries[entryIndex],
        [args.field]: docValue,
      }
      const updated = await patchResumeContent(args.resumeId, userId, {
        [moduleKey]: updatedEntries,
      })
      return updateResult(
        updated.id,
        updated.updated_at,
        `${moduleKey}[${entryIndex}].${args.field} 更新成功`,
      )
    },
  )

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
      const orderSet = new Set(order)
      if (
        orderSet.size !== VALID_MODULES.length
        || !VALID_MODULES.every((module) => orderSet.has(module))
      ) {
        return toolError(
          `modules_order 必须包含所有 ${VALID_MODULES.length} 个合法模块且不能重复`,
        )
      }

      const updated = await reorderModules(args.resumeId, userId, order)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: updated.id,
            modules_order: updated.modules_order,
            updated_at: updated.updated_at,
            message: '模块顺序更新成功',
          }),
        }],
      }
    },
  )

  server.tool(
    'resume_toggle_module',
    '启用或禁用简历的某个模块。basic_info 不能被禁用。',
    {
      resumeId: z.string().describe('简历 ID'),
      module: z.enum(
        VALID_MODULES.filter(
          (module) => module !== 'basic_info',
        ) as [string, ...string[]],
      ).describe('模块类型（不能是 basic_info）'),
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
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: updated.id,
            modules_config: updated.modules_config,
            updated_at: updated.updated_at,
            message: `模块 ${args.module} 已${args.enabled ? '启用' : '禁用'}`,
          }),
        }],
      }
    },
  )

  server.tool(
    'resume_update_preview_config',
    '更新简历预览的字号和行距配置。不传的字段保持不变。',
    {
      resumeId: z.string().describe('简历 ID'),
      fontSize: z.number().refine(isResumePreviewFontSize, {
        message: `fontSize 必须是 ${RESUME_PREVIEW_FONT_SIZES.join(', ')} 之一`,
      }).optional().describe('字号，可选值：12, 14, 16, 18, 20'),
      lineHeight: z.number()
        .min(RESUME_PREVIEW_LINE_HEIGHT_MIN)
        .max(RESUME_PREVIEW_LINE_HEIGHT_MAX)
        .optional()
        .describe('行距，范围 1-3'),
    },
    async (args) => {
      const config: Record<string, number> = {}
      if (args.fontSize !== undefined) config.fontSize = args.fontSize
      if (args.lineHeight !== undefined) config.lineHeight = args.lineHeight
      if (Object.keys(config).length === 0) {
        return toolError('至少需要传入 fontSize 或 lineHeight 之一')
      }

      const updated = await updatePreviewConfig(args.resumeId, userId, config)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: updated.id,
            preview_config: (
              updated.content as Record<string, unknown>
            )?.preview_config,
            updated_at: updated.updated_at,
            message: '预览配置更新成功',
          }),
        }],
      }
    },
  )

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
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: updated.id,
            module_titles: (
              updated.content as Record<string, unknown>
            )?.module_titles,
            updated_at: updated.updated_at,
            message: `模块 ${args.module} 标题更新成功`,
          }),
        }],
      }
    },
  )

  server.tool(
    'resume_publish',
    '发布简历，设置公开链接。发布后可通过公开链接访问简历。',
    {
      resumeId: z.string().describe('简历 ID'),
      slug: z.string().min(1)
        .describe('公开链接标识（URL 友好的短字符串，如 my-resume）'),
    },
    async (args) => {
      try {
        const updated = await publishResume(args.resumeId, userId, args.slug)
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: updated.id,
              is_public: updated.is_public,
              public_slug: updated.public_slug,
              public_url: buildPublicUrl(updated.public_slug!),
              updated_at: updated.updated_at,
              message: '简历已发布',
            }),
          }],
        }
      } catch (error) {
        return toolError((error as Error).message)
      }
    },
  )

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
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: updated.id,
              is_public: updated.is_public,
              updated_at: updated.updated_at,
              message: '已取消发布',
            }),
          }],
        }
      } catch (error) {
        return toolError((error as Error).message)
      }
    },
  )
}

function parseRichText(
  mode: 'plainText' | 'doc',
  content: string | Record<string, unknown>,
): { value: RichTextNode | string } | { error: string } {
  if (mode === 'plainText') {
    return {
      value: textToDoc(
        typeof content === 'string' ? content : JSON.stringify(content),
      ),
    }
  }

  const raw = typeof content === 'string' ? JSON.parse(content) : content
  const validation = validateRichTextDoc(raw as RichTextNode)
  return validation.valid
    ? { value: raw as RichTextNode }
    : { error: `富文本格式不合法 - ${validation.error}` }
}

function updateResult(id: string, updatedAt: string, message: string) {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ id, updated_at: updatedAt, message }),
    }],
  }
}

function resumeNotFound() {
  return toolError('简历不存在或无权访问')
}

function toolError(message: string) {
  return {
    content: [{ type: 'text' as const, text: `错误：${message}` }],
    isError: true,
  }
}

function entryCount(value: unknown): string {
  return Array.isArray(value) ? `${value.length} 条` : '未填写'
}

function buildPublicUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${base}/resume/${slug}`
}

function buildPreviewUrl(resume: {
  id: string
  is_public: boolean
  public_slug: string | null
}): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  if (resume.is_public && resume.public_slug) {
    return `${base}/resume/${resume.public_slug}`
  }
  const { token, expiresAt } = generatePreviewToken(resume.id)
  return `${base}/resume/preview/${resume.id}?token=${token}&expires=${expiresAt}`
}

function deepMerge(target: unknown, source: unknown): unknown {
  if (
    !target || typeof target !== 'object'
    || !source || typeof source !== 'object'
  ) {
    return source
  }
  if (Array.isArray(source)) return source

  const result = { ...(target as Record<string, unknown>) }
  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = result[key]
    if (
      sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)
      && targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue)
    } else {
      result[key] = sourceValue
    }
  }
  return result
}
