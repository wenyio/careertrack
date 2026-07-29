/**
 * MCP Key 管理 API
 *
 * GET  /api/mcp-keys - 列出当前用户的所有 MCP Key
 * POST /api/mcp-keys - 创建新的 MCP Key
 *
 * 需要 JWT 认证（与现有 REST API 一致）
 */

import { withAuth, success } from '@/lib/api'
import { createMcpKey, listMcpKeys } from '@/lib/services/mcp-key'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { parseJsonBody } from '@/lib/api-validation'
import { createMcpKeyBodySchema } from '@/lib/validation/business'

/**
 * 列出 MCP Key（不含 secret，只有 prefix）
 */
export async function GET(request: Request) {
  return withAuth(request, async (user) => {
    const keys = await listMcpKeys(user.id)
    return success(keys)
  })
}

/**
 * 创建 MCP Key（返回明文 secret，仅此一次）
 */
export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const limited = enforceRateLimit(request, {
      namespace: 'mcp-key-create',
      limit: 10,
      windowMs: 60 * 60 * 1000,
    }, user.id)
    if (limited) return limited

    const parsedBody = await parseJsonBody(
      request,
      createMcpKeyBodySchema,
      { allowEmpty: true },
    )
    if (!parsedBody.success) return parsedBody.response
    const { scope } = parsedBody.data

    const key = await createMcpKey(user.id, scope)

    return success({
      id: key.id,
      secret: key.secret,
      prefix: key.prefix,
      scope: key.scope,
      created_at: key.created_at,
      message: '请妥善保存 Secret Key，此密钥只会显示一次',
    }, 201)
  })
}
