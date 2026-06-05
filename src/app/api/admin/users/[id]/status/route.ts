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
import { query } from '@/lib/db'

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

      // 更新状态
      if (disabled) {
        await query(
          'UPDATE users SET disabled_at = NOW(), updated_at = NOW() WHERE id = $1',
          [id]
        )
      } else {
        await query(
          'UPDATE users SET disabled_at = NULL, updated_at = NOW() WHERE id = $1',
          [id]
        )
      }

      // 返回更新后的用户信息
      const updatedResult = await query(
        'SELECT id, username, role, disabled_at FROM users WHERE id = $1',
        [id]
      )

      return success(updatedResult.rows[0])
    } catch (err) {
      console.error('修改用户状态错误:', err)
      return error('服务器内部错误', 500)
    }
  })
}
