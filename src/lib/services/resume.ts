/**
 * 简历 Service
 *
 * 供 REST API 和 MCP 共用的业务逻辑层
 */

import { query } from '@/lib/db'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER } from '@/config/modules'
import { getSigningSecret } from '@/lib/security/secrets'
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  paginatedData,
  paginationOffset,
} from '@/lib/pagination'
import type {
  Resume,
  ResumeListItem,
  ResumeContent,
  ResumeModuleType,
  ResumeTemplateId,
  ModulesConfig,
  ResumePreviewConfig,
  PublicResume,
} from '@/types/resume'
import type { PaginatedData, PaginationParams } from '@/types/pagination'

export class ResumeConflictError extends Error {
  constructor() {
    super('简历已在其他位置更新，请刷新后重试')
    this.name = 'ResumeConflictError'
  }
}

interface ResumeListRow {
  id: string
  name: string
  is_public: boolean
  public_slug: string | null
  template: ResumeTemplateId
  modules_config: ModulesConfig
  modules_order: ResumeModuleType[]
  updated_at: string
}

type ResumeListOptions = PaginationParams & { q?: string }

function toResumeListItem(row: ResumeListRow): ResumeListItem {
  const config = row.modules_config || DEFAULT_MODULES_CONFIG
  const order = Array.isArray(row.modules_order)
    ? row.modules_order
    : DEFAULT_MODULES_ORDER
  const previewSections = order.filter((module, index) =>
    DEFAULT_MODULES_ORDER.includes(module)
    && order.indexOf(module) === index
    && config[module] !== false
  )

  return {
    id: row.id,
    name: row.name,
    is_public: row.is_public,
    public_slug: row.public_slug,
    template: row.template,
    preview_sections: previewSections,
    updated_at: row.updated_at,
  }
}

/**
 * 获取用户的简历列表。
 *
 * 列表查询不读取 content；完整正文只由详情接口返回。MCP 和 REST 共用
 * 同一分页上限，避免任一入口退化成无界查询。
 */
export async function listResumes(
  userId: string,
  pagination: ResumeListOptions = {
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
  },
): Promise<PaginatedData<ResumeListItem>> {
  const offset = paginationOffset(pagination)
  const q = pagination.q?.trim()
  const clauses = ['user_id = $1']
  const values: unknown[] = [userId]
  if (q) {
    values.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`)
    clauses.push(`name ILIKE $${values.length} ESCAPE '\\'`)
  }
  const where = clauses.join(' AND ')
  const [itemsResult, countResult] = await Promise.all([
    query(
      `SELECT id, name, is_public, public_slug, template, modules_config, modules_order, updated_at
     FROM resumes
     WHERE ${where}
     ORDER BY updated_at DESC, id DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pagination.pageSize, offset],
    ),
    query(
      `SELECT COUNT(*)::int AS total FROM resumes WHERE ${where}`,
      values,
    ),
  ])

  const items = (itemsResult.rows as unknown as ResumeListRow[])
    .map(toResumeListItem)
  const total = Number(countResult.rows[0]?.total || 0)
  return paginatedData(items, pagination, total)
}

/** 获取简历详情（校验所有权） */
export async function getResume(resumeId: string, userId: string): Promise<Resume | null> {
  const result = await query(
    'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
    [resumeId, userId]
  )
  return (result.rows[0] as unknown as Resume) || null
}

/**
 * 从 profile 快照构建简历初始内容
 *
 * 创建简历时一次性复制当前 profile 数据，之后简历内容独立于 profile。
 */
export function buildInitialContentFromProfile(profile: Record<string, unknown>): Record<string, unknown> {
  const content: Record<string, unknown> = {}
  const fields = ['basic_info', 'education', 'skills', 'work_experience', 'projects', 'portfolio', 'awards', 'other_experience', 'research', 'summary']
  for (const field of fields) {
    const value = profile[field]
    if (value !== null && value !== undefined) {
      content[field] = typeof value === 'string' ? value : (Array.isArray(value) && value.length === 0 ? undefined : value)
    }
  }
  return content
}

/** 创建简历 */
export async function createResume(
  userId: string,
  name: string,
  initialContent?: Record<string, unknown>
): Promise<Resume> {
  const result = await query(
    `INSERT INTO resumes (user_id, name, modules_config, modules_order, content, template)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      name.trim(),
      JSON.stringify(DEFAULT_MODULES_CONFIG),
      JSON.stringify(DEFAULT_MODULES_ORDER),
      JSON.stringify(initialContent || {}),
      'classic',
    ]
  )
  return result.rows[0] as unknown as Resume
}

/** 更新简历元数据（name, template, modules_config, modules_order） */
export async function updateResumeMetadata(
  resumeId: string,
  userId: string,
  updates: {
    name?: string
    template?: ResumeTemplateId
    modules_config?: ModulesConfig
    modules_order?: ResumeModuleType[]
    revision?: number
  }
): Promise<Resume> {
  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex}`)
    values.push(updates.name)
    paramIndex++
  }
  if (updates.template !== undefined) {
    setClauses.push(`template = $${paramIndex}`)
    values.push(updates.template)
    paramIndex++
  }
  if (updates.modules_config !== undefined) {
    setClauses.push(`modules_config = $${paramIndex}`)
    values.push(JSON.stringify(updates.modules_config))
    paramIndex++
  }
  if (updates.modules_order !== undefined) {
    setClauses.push(`modules_order = $${paramIndex}`)
    values.push(JSON.stringify(updates.modules_order))
    paramIndex++
  }

  if (setClauses.length === 0) {
    const resume = await getResume(resumeId, userId)
    if (!resume) throw new Error('简历不存在')
    return resume
  }

  setClauses.push('revision = revision + 1')
  setClauses.push('updated_at = NOW()')
  values.push(resumeId, userId)

  const revisionClause = updates.revision === undefined
    ? ''
    : ` AND revision = $${paramIndex + 2}`
  if (updates.revision !== undefined) values.push(updates.revision)

  const sql = `
    UPDATE resumes
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}${revisionClause}
    RETURNING *
  `

  const result = await query(sql, values)
  if (result.rows.length === 0) {
    if (updates.revision !== undefined && await getResume(resumeId, userId)) {
      throw new ResumeConflictError()
    }
    throw new Error('简历不存在')
  }
  return result.rows[0] as unknown as Resume
}

/** 更新简历 content（局部 merge，只覆盖传入的顶层字段） */
export async function patchResumeContent(
  resumeId: string,
  userId: string,
  contentPatch: Partial<ResumeContent>
): Promise<Resume> {
  const resume = await getResume(resumeId, userId)
  if (!resume) throw new Error('简历不存在')

  const currentContent = (resume.content || {}) as Record<string, unknown>
  const merged = { ...currentContent, ...contentPatch }

  const result = await query(
    `UPDATE resumes
     SET content = $1, revision = revision + 1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3 AND revision = $4
     RETURNING *`,
    [JSON.stringify(merged), resumeId, userId, resume.revision]
  )

  if (result.rows.length === 0) {
    if (await getResume(resumeId, userId)) throw new ResumeConflictError()
    throw new Error('简历不存在')
  }
  return result.rows[0] as unknown as Resume
}

/**
 * 全量更新简历（PUT 场景）
 *
 * 同时支持元数据和 content 更新。传入的字段直接覆盖，不传的字段保持不变。
 */
export async function updateResume(
  resumeId: string,
  userId: string,
  updates: {
    name?: string
    template?: ResumeTemplateId
    modules_config?: ModulesConfig
    modules_order?: ResumeModuleType[]
    content?: ResumeContent
    revision?: number
  }
): Promise<Resume> {
  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex}`)
    values.push(updates.name)
    paramIndex++
  }
  if (updates.template !== undefined) {
    setClauses.push(`template = $${paramIndex}`)
    values.push(updates.template)
    paramIndex++
  }
  if (updates.modules_config !== undefined) {
    setClauses.push(`modules_config = $${paramIndex}`)
    values.push(JSON.stringify(updates.modules_config))
    paramIndex++
  }
  if (updates.modules_order !== undefined) {
    setClauses.push(`modules_order = $${paramIndex}`)
    values.push(JSON.stringify(updates.modules_order))
    paramIndex++
  }
  if (updates.content !== undefined) {
    setClauses.push(`content = $${paramIndex}`)
    values.push(JSON.stringify(updates.content))
    paramIndex++
  }

  if (setClauses.length === 0) {
    throw new Error('没有需要更新的字段')
  }

  setClauses.push('revision = revision + 1')
  setClauses.push('updated_at = NOW()')
  values.push(resumeId, userId)

  const revisionClause = updates.revision === undefined
    ? ''
    : ` AND revision = $${paramIndex + 2}`
  if (updates.revision !== undefined) values.push(updates.revision)

  const sql = `
    UPDATE resumes
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}${revisionClause}
    RETURNING *
  `

  const result = await query(sql, values)
  if (result.rows.length === 0) {
    if (updates.revision !== undefined && await getResume(resumeId, userId)) {
      throw new ResumeConflictError()
    }
    throw new Error('简历不存在')
  }
  return result.rows[0] as unknown as Resume
}

/** 通过 public_slug 获取公开简历 */
export async function getResumeBySlug(slug: string): Promise<PublicResume | null> {
  const result = await query(
    `SELECT name, modules_config, modules_order, content, template, public_slug, is_public
     FROM resumes WHERE public_slug = $1 AND is_public = true`,
    [slug]
  )
  return (result.rows[0] as unknown as PublicResume) || null
}

/** 复制简历（含 content、modules_config 等全量复制） */
export async function duplicateResume(
  resumeId: string,
  userId: string
): Promise<Resume> {
  const original = await getResume(resumeId, userId)
  if (!original) throw new Error('简历不存在')

  const result = await query(
    `INSERT INTO resumes (user_id, name, modules_config, modules_order, content, template)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      `${original.name} (副本)`,
      JSON.stringify(original.modules_config),
      JSON.stringify(original.modules_order),
      JSON.stringify(original.content || {}),
      original.template || 'classic',
    ]
  )
  return result.rows[0] as unknown as Resume
}

/** 更新预览配置（局部 merge） */
export async function updatePreviewConfig(
  resumeId: string,
  userId: string,
  config: Partial<ResumePreviewConfig>
): Promise<Resume> {
  const resume = await getResume(resumeId, userId)
  if (!resume) throw new Error('简历不存在')

  const currentContent = (resume.content || {}) as Record<string, unknown>
  const currentConfig = (currentContent.preview_config || {}) as Record<string, unknown>
  const merged = { ...currentConfig, ...config }

  return patchResumeContent(resumeId, userId, {
    preview_config: merged as Partial<ResumePreviewConfig>,
  })
}

/** 切换单个模块的开关状态 */
export async function toggleModule(
  resumeId: string,
  userId: string,
  module: ResumeModuleType,
  enabled: boolean
): Promise<Resume> {
  if (module === 'basic_info') {
    throw new Error('basic_info 模块不能被禁用')
  }

  const resume = await getResume(resumeId, userId)
  if (!resume) throw new Error('简历不存在')

  const config = { ...(resume.modules_config || DEFAULT_MODULES_CONFIG), [module]: enabled }
  return updateResumeMetadata(resumeId, userId, {
    modules_config: config as ModulesConfig,
    revision: resume.revision,
  })
}

/** 重新排序模块 */
export async function reorderModules(
  resumeId: string,
  userId: string,
  order: ResumeModuleType[]
): Promise<Resume> {
  const resume = await getResume(resumeId, userId)
  if (!resume) throw new Error('简历不存在')
  return updateResumeMetadata(resumeId, userId, {
    modules_order: order,
    revision: resume.revision,
  })
}

/** 重命名模块自定义标题 */
export async function renameModule(
  resumeId: string,
  userId: string,
  module: ResumeModuleType,
  title: string
): Promise<Resume> {
  const resume = await getResume(resumeId, userId)
  if (!resume) throw new Error('简历不存在')

  const currentContent = (resume.content || {}) as Record<string, unknown>
  const moduleTitles = { ...((currentContent.module_titles as Record<string, string>) || {}), [module]: title }

  return patchResumeContent(resumeId, userId, { module_titles: moduleTitles })
}

/** 删除简历 */
export async function deleteResume(resumeId: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM resumes WHERE id = $1 AND user_id = $2',
    [resumeId, userId]
  )
  return (result.rowCount ?? 0) > 0
}

/** 发布简历（设置公开 slug） */
export async function publishResume(
  resumeId: string,
  userId: string,
  slug: string
): Promise<Resume> {
  // 检查 slug 是否已被其他简历使用
  const existing = await query(
    'SELECT id FROM resumes WHERE public_slug = $1 AND id != $2',
    [slug, resumeId]
  )
  if (existing.rows.length > 0) {
    throw new Error('该公开链接已被使用')
  }

  const result = await query(
    `UPDATE resumes
     SET is_public = true, public_slug = $1, revision = revision + 1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING *`,
    [slug, resumeId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error('简历不存在')
  }
  return result.rows[0] as unknown as Resume
}

/** 取消发布简历 */
export async function unpublishResume(
  resumeId: string,
  userId: string
): Promise<Resume> {
  const result = await query(
    `UPDATE resumes
     SET is_public = false, public_slug = NULL, revision = revision + 1, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [resumeId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error('简历不存在')
  }
  return result.rows[0] as unknown as Resume
}

// ============ 预览 Token ============

/** Token 有效期：24 小时 */
const PREVIEW_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

/** 获取 HMAC 密钥 */
function getPreviewSecret(): string {
  if (process.env.MCP_PREVIEW_SECRET?.trim()) {
    return getSigningSecret(
      'MCP_PREVIEW_SECRET',
      'careertrack-development-preview-secret-do-not-use-in-production',
    )
  }
  return getSigningSecret(
    'JWT_SECRET',
    'careertrack-development-jwt-secret-do-not-use-in-production',
  )
}

/**
 * 生成简历预览签名 Token
 *
 * 格式：{expiresAt}.{signature}
 * 签名内容：resumeId|expiresAt
 */
export function generatePreviewToken(resumeId: string): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + PREVIEW_TOKEN_TTL_MS
  const payload = `${resumeId}|${expiresAt}`
  const signature = createHmac('sha256', getPreviewSecret()).update(payload).digest('hex')
  return { token: `${expiresAt}.${signature}`, expiresAt }
}

/**
 * 验证简历预览 Token
 *
 * @returns 验证通过返回 resumeId，否则返回 null
 */
export function verifyPreviewToken(resumeId: string, token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const expiresAt = parseInt(parts[0], 10)
  const signature = parts[1]

  if (isNaN(expiresAt) || Date.now() > expiresAt) return null

  const payload = `${resumeId}|${expiresAt}`
  const expected = createHmac('sha256', getPreviewSecret()).update(payload).digest('hex')

  const signatureBuffer = Buffer.from(signature, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  if (
    signatureBuffer.length !== expectedBuffer.length
    || !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null
  }

  return resumeId
}

/** 通过 ID 直接获取简历（不限 user_id，用于 token 验证后的公开访问） */
export async function getResumeById(resumeId: string): Promise<Resume | null> {
  const result = await query(
    'SELECT * FROM resumes WHERE id = $1',
    [resumeId]
  )
  return (result.rows[0] as unknown as Resume) || null
}
