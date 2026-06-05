/**
 * MCP Key 管理 API
 *
 * DELETE /api/mcp-keys/:id           - 撤销指定的 MCP Key
 * DELETE /api/mcp-keys/:id?action=delete - 物理删除指定的 MCP Key
 *
 * 需要 JWT 认证
 */

import { withAuth, error, success } from '@/lib/api'
import { revokeMcpKey, deleteMcpKey } from '@/lib/services/mcp-key'

/**
 * 撤销或删除 MCP Key
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (user) => {
    const { id } = await params
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'delete') {
      const deleted = await deleteMcpKey(id, user.id)
      if (!deleted) {
        return error('Key 不存在', 404)
      }
      return success({ message: 'Key 已删除', id })
    }

    const revoked = await revokeMcpKey(id, user.id)
    if (!revoked) {
      return error('Key 不存在或已撤销', 404)
    }

    return success({ message: 'Key 已撤销', id })
  })
}
