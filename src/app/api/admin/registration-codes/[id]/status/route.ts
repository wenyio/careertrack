/**
 * 管理员禁用/启用注册码
 *
 * PATCH /api/admin/registration-codes/[id]/status
 *
 * 请求体：{ disabled: boolean }
 *
 * - disabled: true  → 设置 disabled_at = NOW()
 * - disabled: false → 清空 disabled_at（已使用的不能启用）
 */

import { withAdminAuth, error, success } from '@/lib/api'
import {
  getRegistrationCodeById,
  disableRegistrationCode,
  enableRegistrationCode,
} from '@/lib/services/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async () => {
    const { id } = await params

    let body: { disabled?: unknown }
    try {
      body = await request.json()
    } catch {
      return error('请求体格式错误', 400)
    }

    if (typeof body.disabled !== 'boolean') {
      return error('disabled 字段必须是布尔值', 400)
    }

    const code = await getRegistrationCodeById(id)
    if (!code) {
      return error('注册码不存在', 404)
    }

    if (body.disabled) {
      // 禁用
      if (code.disabled_at) {
        return error('注册码已被禁用', 400)
      }
      const updated = await disableRegistrationCode(id)
      return success(updated)
    } else {
      // 启用
      if (!code.disabled_at) {
        return error('注册码未被禁用', 400)
      }
      if (code.used_at) {
        return error('已使用的注册码不能启用', 400)
      }
      const updated = await enableRegistrationCode(id)
      return success(updated)
    }
  })
}
