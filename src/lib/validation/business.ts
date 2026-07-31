import { z } from 'zod'
import { MAX_RESUME_NAME_LENGTH } from '@/constants'
import type {
  DescriptionField,
  ModulesConfig,
  ResumeContent,
  ResumeModuleType,
  ResumeTemplateId,
  RichTextNode,
} from '@/types/resume'
import {
  isSafeWebUrl,
  MAX_RICH_TEXT_URL_LENGTH,
  validateRichTextDoc,
} from '@/utils/rich-text'
import {
  isResumePreviewFontSize,
  RESUME_PREVIEW_FONT_SIZES,
  RESUME_PREVIEW_LINE_HEIGHT_MAX,
  RESUME_PREVIEW_LINE_HEIGHT_MIN,
} from '@/config/resume-preview'

const jsonObjectSchema = z.record(z.string(), z.unknown())

export const safeWebUrlSchema = z.string()
  .max(
    MAX_RICH_TEXT_URL_LENGTH,
    `URL 不能超过 ${MAX_RICH_TEXT_URL_LENGTH} 个字符`,
  )
  .refine(
    (value) => !value.trim() || isSafeWebUrl(value),
    'URL 仅支持 http、https 或相对路径',
  )

export const richTextDocSchema = jsonObjectSchema.superRefine((doc, context) => {
  const result = validateRichTextDoc(doc)
  if (!result.valid) {
    context.addIssue({
      code: 'custom',
      message: `富文本格式不合法：${result.error}`,
    })
  }
}).transform((doc) => doc as unknown as RichTextNode)

const legacyRichTextStringSchema = z.string().superRefine((value, context) => {
  // The editor and renderer intentionally recognize legacy stringified docs.
  // Validate those strings too so serialization cannot bypass tree budgets.
  if (!value.startsWith('{')) return

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return
  }
  if (
    !parsed
    || typeof parsed !== 'object'
    || Array.isArray(parsed)
    || (parsed as Record<string, unknown>).type !== 'doc'
  ) {
    return
  }

  const result = validateRichTextDoc(parsed)
  if (!result.valid) {
    context.addIssue({
      code: 'custom',
      message: `富文本格式不合法：${result.error}`,
    })
  }
})

export const descriptionFieldSchema = z.union([
  legacyRichTextStringSchema,
  richTextDocSchema,
]).transform((description) => description as DescriptionField)

export const profileEntrySchema = z.object({
  description: descriptionFieldSchema.optional(),
}).loose()

export const projectEntrySchema = profileEntrySchema.extend({
  link: safeWebUrlSchema.optional(),
})

export const portfolioEntrySchema = profileEntrySchema.extend({
  link: safeWebUrlSchema.optional(),
  image: safeWebUrlSchema.optional(),
})

export const basicInfoSchema = z.object({
  avatar: safeWebUrlSchema.optional(),
  other: z.object({
    website: safeWebUrlSchema.optional(),
    github: safeWebUrlSchema.optional(),
  }).loose().optional(),
}).loose()

export const resumePreviewConfigSchema = z.object({
  fontSize: z.number()
    .refine(
      isResumePreviewFontSize,
      `字号必须是 ${RESUME_PREVIEW_FONT_SIZES.join(', ')} 之一`,
    )
    .optional(),
  lineHeight: z.number()
    .min(
      RESUME_PREVIEW_LINE_HEIGHT_MIN,
      `行距不能小于 ${RESUME_PREVIEW_LINE_HEIGHT_MIN}`,
    )
    .max(
      RESUME_PREVIEW_LINE_HEIGHT_MAX,
      `行距不能大于 ${RESUME_PREVIEW_LINE_HEIGHT_MAX}`,
    )
    .optional(),
}).loose()

export const resumeContentSchema = z.object({
  basic_info: basicInfoSchema.optional(),
  education: z.array(profileEntrySchema).max(200, '教育经历数量过多').optional(),
  skills: z.array(profileEntrySchema).max(200, '专业技能数量过多').optional(),
  work_experience: z.array(profileEntrySchema).max(200, '工作经历数量过多').optional(),
  projects: z.array(projectEntrySchema).max(200, '项目经历数量过多').optional(),
  portfolio: z.array(portfolioEntrySchema).max(200, '个人作品数量过多').optional(),
  awards: z.array(profileEntrySchema).max(200, '荣誉奖项数量过多').optional(),
  other_experience: z.array(profileEntrySchema).max(200, '其他经历数量过多').optional(),
  research: z.array(profileEntrySchema).max(200, '研究经历数量过多').optional(),
  summary: descriptionFieldSchema.optional(),
  preview_config: resumePreviewConfigSchema.optional(),
  basic_info_display: jsonObjectSchema.optional(),
  module_titles: z.record(z.string(), z.string()).optional(),
}).loose()

export const profileArrayEntrySchemas = {
  education: profileEntrySchema,
  skills: profileEntrySchema,
  work_experience: profileEntrySchema,
  projects: projectEntrySchema,
  portfolio: portfolioEntrySchema,
  awards: profileEntrySchema,
  other_experience: profileEntrySchema,
  research: profileEntrySchema,
} as const

const resumeModuleSchema = z.enum([
  'basic_info',
  'education',
  'skills',
  'work_experience',
  'projects',
  'portfolio',
  'awards',
  'other_experience',
  'research',
  'summary',
])

const resumeTemplateSchema = z.enum([
  'classic',
  'modern',
  'minimal',
  'black-white',
])

const modulesConfigSchema = z.object({
  basic_info: z.boolean(),
  education: z.boolean(),
  skills: z.boolean(),
  work_experience: z.boolean(),
  projects: z.boolean(),
  portfolio: z.boolean(),
  awards: z.boolean(),
  other_experience: z.boolean(),
  research: z.boolean(),
  summary: z.boolean(),
}).partial()

const modulesOrderSchema = z.array(resumeModuleSchema)
  .length(10, '模块排序必须包含全部 10 个模块')
  .refine(
    (modules) => new Set(modules).size === modules.length,
    '模块排序不能包含重复模块',
  )

const resumeNameSchema = z.string({ error: '简历名称不能为空' })
  .trim()
  .min(1, '简历名称不能为空')
  .max(
    MAX_RESUME_NAME_LENGTH,
    `简历名称不能超过 ${MAX_RESUME_NAME_LENGTH} 个字符`,
  )

export const profileUpdateBodySchema = z.object({
  basic_info: basicInfoSchema.optional(),
  education: z.array(profileEntrySchema).max(200, '教育经历数量过多').optional(),
  skills: z.array(profileEntrySchema).max(200, '专业技能数量过多').optional(),
  work_experience: z.array(profileEntrySchema).max(200, '工作经历数量过多').optional(),
  projects: z.array(projectEntrySchema).max(200, '项目经历数量过多').optional(),
  portfolio: z.array(portfolioEntrySchema).max(200, '个人作品数量过多').optional(),
  awards: z.array(profileEntrySchema).max(200, '荣誉奖项数量过多').optional(),
  other_experience: z.array(profileEntrySchema).max(200, '其他经历数量过多').optional(),
  research: z.array(profileEntrySchema).max(200, '研究经历数量过多').optional(),
  summary: descriptionFieldSchema.optional(),
})

export const createResumeBodySchema = z.object({
  name: resumeNameSchema,
  initialize_from_profile: z.boolean({
    error: 'initialize_from_profile 必须是布尔值',
  }).optional(),
})

export const updateResumeBodySchema = z.object({
  name: resumeNameSchema.optional(),
  template: resumeTemplateSchema.optional(),
  modules_config: modulesConfigSchema.optional(),
  modules_order: modulesOrderSchema.optional(),
  content: resumeContentSchema.optional(),
  revision: z.number({ error: 'revision 必须是整数' })
    .int('revision 必须是整数')
    .positive('revision 必须大于 0')
    .optional(),
}).refine(
  (body) => Object.keys(body).length > 0,
  '没有需要更新的字段',
).transform((body) => body as {
  name?: string
  template?: ResumeTemplateId
  modules_config?: ModulesConfig
  modules_order?: ResumeModuleType[]
  content?: ResumeContent
  revision?: number
})

export const createResumeVersionBodySchema = z.object({
  expected_revision: z.number({ error: 'expected_revision 必须是整数' })
    .int('expected_revision 必须是整数')
    .positive('expected_revision 必须大于 0'),
  label: z.string({ error: '版本标签必须是字符串' })
    .trim()
    .min(1, '版本标签不能为空')
    .max(100, '版本标签不能超过 100 个字符')
    .optional(),
})

export const restoreResumeVersionBodySchema = z.object({
  expected_revision: z.number({ error: 'expected_revision 必须是整数' })
    .int('expected_revision 必须是整数')
    .positive('expected_revision 必须大于 0'),
})

export const publishResumeBodySchema = z.object({
  slug: z.string({ error: '公开链接不能为空' })
    .trim()
    .min(1, '公开链接不能为空')
    .max(50, '公开链接不能超过 50 个字符')
    .regex(
      /^[a-zA-Z0-9一-龥_-]+$/,
      '公开链接只能包含中英文、数字、下划线和连字符',
    ),
})

export const jobApplicationStatusSchema = z.enum([
  'wishlist', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn',
])

const optionalApplicationText = (max: number, label: string) => z.string({ error: `${label}必须是字符串` })
  .trim()
  .max(max, `${label}不能超过 ${max} 个字符`)
  .nullable()
  .optional()

const applicationDateSchema = z.string({ error: '日期必须是 YYYY-MM-DD 格式' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期必须是 YYYY-MM-DD 格式')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const parsed = new Date(Date.UTC(year, month - 1, day))
    return parsed.getUTCFullYear() === year
      && parsed.getUTCMonth() === month - 1
      && parsed.getUTCDate() === day
  }, '日期无效')
  .nullable()
  .optional()

const applicationUrlSchema = z.string({ error: '职位链接必须是字符串' })
  .trim()
  .max(2048, '职位链接不能超过 2048 个字符')
  .refine((value) => !value || /^https?:\/\//i.test(value), '职位链接仅支持 http 或 https')
  .refine((value) => {
    if (!value) return true
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol)
    } catch {
      return false
    }
  }, '职位链接格式无效')
  .nullable()
  .optional()

const applicationFieldsSchema = z.object({
  company: z.string({ error: '公司名称不能为空' }).trim().min(1, '公司名称不能为空').max(120, '公司名称不能超过 120 个字符'),
  position: z.string({ error: '职位名称不能为空' }).trim().min(1, '职位名称不能为空').max(120, '职位名称不能超过 120 个字符'),
  status: jobApplicationStatusSchema.optional(),
  job_url: applicationUrlSchema,
  location: optionalApplicationText(120, '地点'),
  channel: optionalApplicationText(80, '投递渠道'),
  salary: optionalApplicationText(80, '薪资'),
  notes: optionalApplicationText(5000, '备注'),
  applied_at: applicationDateSchema,
  next_action_at: applicationDateSchema,
  resume_id: z.string().uuid('简历 ID 格式错误').nullable().optional(),
  resume_version_id: z.string().uuid('简历版本 ID 格式错误').nullable().optional(),
})

export const createJobApplicationBodySchema = applicationFieldsSchema.extend({
  status: jobApplicationStatusSchema.default('wishlist'),
}).superRefine((body, context) => {
  if (!body.resume_id && body.resume_version_id) {
    context.addIssue({ code: 'custom', path: ['resume_version_id'], message: '选择简历版本时必须同时选择简历' })
  }
})

export const updateJobApplicationBodySchema = applicationFieldsSchema.partial().extend({
  expected_revision: z.number({ error: 'expected_revision 必须是整数' }).int('expected_revision 必须是整数').positive('expected_revision 必须大于 0'),
}).superRefine((body, context) => {
  if (body.resume_id === null && body.resume_version_id && body.resume_version_id !== null) {
    context.addIssue({ code: 'custom', path: ['resume_version_id'], message: '未关联简历时不能关联简历版本' })
  }
  if (body.resume_id === undefined && body.resume_version_id && body.resume_version_id !== null) {
    context.addIssue({ code: 'custom', path: ['resume_id'], message: '更新简历版本时必须同时提供简历' })
  }
  if (Object.keys(body).length === 1) {
    context.addIssue({ code: 'custom', message: '没有需要更新的字段' })
  }
})

export const createJobApplicationEventBodySchema = z.object({
  event_type: z.enum(['follow_up', 'interview', 'note', 'offer']),
  content: optionalApplicationText(5000, '活动内容'),
  metadata: z.record(z.string(), z.unknown()).optional(),
  occurred_at: z.string().datetime({ offset: true, error: '发生时间必须是 ISO 8601 时间' }).optional(),
  next_action_at: applicationDateSchema,
  expected_revision: z.number().int().positive().optional(),
}).superRefine((body, context) => {
  if (body.event_type === 'interview' && !body.metadata?.round) {
    context.addIssue({ code: 'custom', path: ['metadata'], message: '面试记录需要轮次信息' })
  }
})

export const createMcpKeyBodySchema = z.object({
  scope: z.enum(['read_write', 'read_only'], {
    error: 'scope 必须是 read_write 或 read_only',
  }).default('read_write'),
})
