/**
 * 管理员禁用/启用用户
 *
 * PATCH /api/admin/users/[id]/status
 *
 * disabled: true  → 设置 disabled_at = NOW()
 * disabled: false → 设置 disabled_at = NULL
 * 管理员不能禁用自己。
 */

import { withAdminAuth, error, success } from '@/lib/api'
import { query, transaction } from '@/lib/db'
import { revokeAllAuthSessions } from '@/lib/security/auth-session'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async (admin) => {
    try {
      const { id } = await params
      const body = await request.json()
      const { disabled } = body as { disabled: boolean }

      if (typeof disabled !== 'boolean') {
        return error('无效的参数，disabled 必须为布尔值', 400)
      }

      // 管理员不能禁用自己
      if (id === admin.id && disabled) {
        return error('不能禁用自己的账号', 400)
      }

      // 检查目标用户是否存在
      const userResult = await query(
        'SELECT id, username, disabled_at FROM users WHERE id = $1',
        [id]
      )
      if (userResult.rows.length === 0) {
        return error('用户不存在', 404)
      }

      const updatedUser = await transaction(async (transactionQuery) => {
        if (disabled) {
          await transactionQuery(
            'UPDATE users SET disabled_at = NOW(), updated_at = NOW() WHERE id = $1',
            [id],
          )
          // 防止账号重新启用后，禁用前复制的会话恢复有效。
          await revokeAllAuthSessions(id, transactionQuery)
        } else {
          await transactionQuery(
            'UPDATE users SET disabled_at = NULL, updated_at = NOW() WHERE id = $1',
            [id],
          )
        }

        const updatedResult = await transactionQuery(
          'SELECT id, username, role, disabled_at FROM users WHERE id = $1',
          [id],
        )
        return updatedResult.rows[0]
      })

      return success(updatedUser)
    } catch (err) {
      console.error('修改用户状态错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
