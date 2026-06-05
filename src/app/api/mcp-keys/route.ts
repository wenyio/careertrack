/**
 * MCP Key 管理 API
 *
 * GET  /api/mcp-keys - 列出当前用户的所有 MCP Key
 * POST /api/mcp-keys - 创建新的 MCP Key
 *
 * 需要 JWT 认证（与现有 REST API 一致）
 */

import { withAuth, error, success } from '@/lib/api'
import { createMcpKey, listMcpKeys } from '@/lib/services/mcp-key'

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
    const body = await request.json().catch(() => ({}))
    const scope = body.scope || 'read_write'

    if (!['read_write', 'read_only'].includes(scope)) {
      return error('scope 必须是 read_write 或 read_only')
    }

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
