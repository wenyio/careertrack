import { z } from 'zod'
import { MAX_RESUME_NAME_LENGTH } from '@/constants'
import type {
  ModulesConfig,
  ResumeContent,
  ResumeModuleType,
  ResumeTemplateId,
} from '@/types/resume'

const jsonObjectSchema = z.record(z.string(), z.unknown())
const profileEntrySchema = jsonObjectSchema

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
  basic_info: jsonObjectSchema.optional(),
  education: z.array(profileEntrySchema).max(200, '教育经历数量过多').optional(),
  skills: z.array(profileEntrySchema).max(200, '专业技能数量过多').optional(),
  work_experience: z.array(profileEntrySchema).max(200, '工作经历数量过多').optional(),
  projects: z.array(profileEntrySchema).max(200, '项目经历数量过多').optional(),
  portfolio: z.array(profileEntrySchema).max(200, '个人作品数量过多').optional(),
  awards: z.array(profileEntrySchema).max(200, '荣誉奖项数量过多').optional(),
  other_experience: z.array(profileEntrySchema).max(200, '其他经历数量过多').optional(),
  research: z.array(profileEntrySchema).max(200, '研究经历数量过多').optional(),
  summary: z.union([z.string(), jsonObjectSchema]).optional(),
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
  content: jsonObjectSchema.optional(),
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

export const createMcpKeyBodySchema = z.object({
  scope: z.enum(['read_write', 'read_only'], {
    error: 'scope 必须是 read_write 或 read_only',
  }).default('read_write'),
})
