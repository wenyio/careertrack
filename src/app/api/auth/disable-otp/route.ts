/**
 * 禁用 OTP
 *
 * DELETE /api/auth/disable-otp
 *
 * 仅账号密码用户可操作（已有 OTP 的必定是密码用户，但这里做防御性检查）。
 */

import { withAuth, error, success } from '@/lib/api'
import { query } from '@/lib/db'
import { verifyPassword, verifyTotp } from '@/lib/auth'
import { AUTH_PROVIDER } from '@/constants/auth'

export async function DELETE(request: Request) {
  return withAuth(request, async (user) => {
    const body = await request.json()
    const { password, code } = body

    // 查询用户的 auth_provider
    const userResult = await query(
      'SELECT auth_provider, password_hash, otp_secret FROM users WHERE id = $1',
      [user.id]
    )

    const userData = userResult.rows[0]

    // 检查是否为账号密码用户
    if ((userData.auth_provider & AUTH_PROVIDER.PASSWORD) === 0) {
      return error('当前账号未设置密码，无法操作 OTP', 400)
    }

    if (!password || !code) {
      return error('请输入密码和 OTP 验证码')
    }

    // 验证密码
    const isValid = await verifyPassword(password, userData.password_hash)
    if (!isValid) {
      return error('密码错误')
    }

    // 验证 OTP
    if (!userData.otp_secret) {
      return error('OTP 未配置')
    }

    const isValidOtp = verifyTotp(code, userData.otp_secret)
    if (!isValidOtp) {
      return error('OTP 验证码错误')
    }

    // 禁用 OTP
    await query(
      'UPDATE users SET otp_enabled = false, otp_secret = NULL WHERE id = $1',
      [user.id]
    )

    return success({ success: true })
  })
}
