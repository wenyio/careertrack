import { z } from 'zod'
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE,
  MAX_PAGE_SIZE,
} from '@/lib/pagination'

const uuidSchema = z.string({ error: '资源 ID 格式错误' })
  .uuid('资源 ID 格式错误')

const searchTextSchema = z.string({ error: '搜索条件必须是字符串' })
  .trim()
  .max(100, '搜索条件不能超过 100 个字符')
  .default('')

function positiveIntegerQuerySchema(
  name: string,
  defaultValue: number,
  maxValue: number,
) {
  return z.preprocess(
    (value) => value === undefined ? String(defaultValue) : value,
    z.string({ error: `${name} 必须是正整数` })
      .regex(/^[1-9]\d*$/, `${name} 必须是正整数`)
      .transform(Number)
      .refine((value) => value <= maxValue, `${name} 不能超过 ${maxValue}`),
  )
}

const paginationQueryShape = {
  page: positiveIntegerQuerySchema('page', DEFAULT_PAGE, MAX_PAGE),
  page_size: positiveIntegerQuerySchema(
    'page_size',
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  ),
}

export const idPathParamsSchema = z.object({
  id: uuidSchema,
})

export const resumeVersionPathParamsSchema = z.object({
  id: uuidSchema,
  versionId: uuidSchema,
})

export const userOAuthAccountPathParamsSchema = z.object({
  id: uuidSchema,
  oauthAccountId: uuidSchema,
})

export const publicSlugPathParamsSchema = z.object({
  slug: z.string({ error: '公开链接格式错误' })
    .trim()
    .min(1, '公开链接不能为空')
    .max(50, '公开链接不能超过 50 个字符')
    .regex(
      /^[a-zA-Z0-9一-龥_-]+$/,
      '公开链接只能包含中英文、数字、下划线和连字符',
    ),
})

export const adminUsersQuerySchema = z.object({
  q: searchTextSchema,
  ...paginationQueryShape,
})

export const adminResumesQuerySchema = z.object({
  q: searchTextSchema,
  public: z.enum(['all', 'true', 'false'], {
    error: 'public 必须是 all、true 或 false',
  }).default('all'),
  ...paginationQueryShape,
})

export const registrationCodesQuerySchema = z.object({
  status: z.enum(['all', 'unused', 'used', 'disabled', 'expired'], {
    error: '无效的注册码状态',
  }).default('all'),
  ...paginationQueryShape,
})

export const resumesQuerySchema = z.object({ q: searchTextSchema, ...paginationQueryShape })

export const jobApplicationsQuerySchema = z.object({
  q: searchTextSchema,
  status: z.enum(['all', 'wishlist', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'], {
    error: '无效的申请状态',
  }).default('all'),
  page: paginationQueryShape.page,
  page_size: paginationQueryShape.page_size.optional(),
  pageSize: paginationQueryShape.page_size.optional(),
}).superRefine((value, context) => {
  if (value.page_size !== undefined && value.pageSize !== undefined) {
    context.addIssue({ code: 'custom', path: ['pageSize'], message: 'page_size 与 pageSize 不能同时提供' })
  }
}).transform((value) => ({
  page: value.page,
  page_size: value.page_size ?? value.pageSize ?? DEFAULT_PAGE_SIZE,
  q: value.q,
  status: value.status,
}))

export const paginationQuerySchema = z.object(paginationQueryShape)

export const mcpKeyActionQuerySchema = z.object({
  action: z.enum(['delete'], {
    error: 'action 必须是 delete',
  }).optional(),
})

export const githubOAuthStartQuerySchema = z.object({
  mode: z.enum(['login', 'register', 'bind'], {
    error: '无效的 OAuth 模式',
  }).default('login'),
})

export const githubOAuthCallbackQuerySchema = z.object({
  code: z.string({ error: 'GitHub OAuth code 无效' })
    .min(1, 'GitHub OAuth code 无效')
    .max(1024, 'GitHub OAuth code 无效'),
  state: z.string({ error: 'GitHub OAuth state 无效' })
    .regex(
      /^[a-f0-9]{32}(?::[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/i,
      'GitHub OAuth state 无效',
    ),
})
