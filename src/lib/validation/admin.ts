import { z } from 'zod'

const roleSchema = z.enum(['user', 'admin'], {
  error: '无效的角色值',
})

function batchIdsSchema(emptyMessage: string) {
  return z.array(
    z.string({ error: 'ID 必须是字符串' })
      .trim()
      .min(1, 'ID 不能为空'),
    { error: emptyMessage },
  )
    .min(1, emptyMessage)
    .max(100, '单次最多操作 100 条记录')
    .transform((ids) => [...new Set(ids)])
}

export const adminUserStatusBodySchema = z.object({
  disabled: z.boolean({
    error: '无效的参数，disabled 必须为布尔值',
  }),
})

export const registrationCodeStatusBodySchema = z.object({
  disabled: z.boolean({
    error: 'disabled 字段必须是布尔值',
  }),
})

export const adminUserRoleBodySchema = z.object({
  role: roleSchema,
})

export const adminBatchUserRoleBodySchema = z.object({
  ids: batchIdsSchema('请选择要修改的用户'),
  role: roleSchema,
})

export const adminBatchDeleteUsersBodySchema = z.object({
  ids: batchIdsSchema('请选择要删除的用户'),
})

export const adminBatchDeleteResumesBodySchema = z.object({
  ids: batchIdsSchema('请选择要删除的简历'),
})

export const createRegistrationCodeBodySchema = z.object({
  label: z.string({ error: '标签必须是字符串' })
    .trim()
    .max(100, '标签不能超过 100 个字符')
    .optional(),
  expires_at: z.string({ error: '过期时间必须是 ISO 8601 字符串' })
    .datetime({ offset: true, message: '过期时间必须是 ISO 8601 字符串' })
    .optional(),
})
