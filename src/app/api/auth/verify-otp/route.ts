/**
 * 验证并启用 OTP
 *
 * POST /api/auth/verify-otp
 *
 * 仅账号密码用户可启用 OTP。
 */

import { withAuth, error, success } from '@/lib/api'
import { query } from '@/lib/db'
import { verifyTotp } from '@/lib/auth'
import { AUTH_PROVIDER } from '@/constants/auth'

export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return error('请输入 OTP 验证码')
    }

    // 获取用户的 OTP 密钥和 auth_provider
    const result = await query(
      'SELECT auth_provider, otp_secret FROM users WHERE id = $1',
      [user.id]
    )

    const userData = result.rows[0]

    // 检查是否为账号密码用户
    if ((userData.auth_provider & AUTH_PROVIDER.PASSWORD) === 0) {
      return error('当前账号通过 GitHub 登录，需先设置账号密码后才能启用 OTP', 400)
    }

    const otpSecret = userData.otp_secret
    if (!otpSecret) {
      return error('OTP 未配置')
    }

    // 验证 OTP
    const isValid = verifyTotp(code, otpSecret)
    if (!isValid) {
      return error('OTP 验证码错误')
    }

    // 启用 OTP
    await query(
      'UPDATE users SET otp_enabled = true WHERE id = $1',
      [user.id]
    )

    return success({ success: true })
  })
}
