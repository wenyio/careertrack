/**
 * 启用 OTP
 *
 * POST /api/auth/setup-otp
 *
 * 仅账号密码用户（auth_provider 含 PASSWORD 位）可启用 OTP。
 * GitHub-only 用户需先设置本地密码。
 */

import { withAuth, error, success } from '@/lib/api'
import { query } from '@/lib/db'
import { verifyPassword, generateTotpSecret, generateOtpUri } from '@/lib/auth'
import { AUTH_PROVIDER } from '@/constants/auth'

export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const body = await request.json()
    const { password } = body

    // 查询用户的 auth_provider 和 password_hash
    const userResult = await query(
      'SELECT auth_provider, password_hash FROM users WHERE id = $1',
      [user.id]
    )

    const userData = userResult.rows[0]

    // 检查是否为账号密码用户
    if ((userData.auth_provider & AUTH_PROVIDER.PASSWORD) === 0) {
      return error('当前账号通过 GitHub 登录，需先设置账号密码后才能启用 OTP', 400)
    }

    if (!password) {
      return error('请输入密码')
    }

    // 验证密码
    const isValid = await verifyPassword(password, userData.password_hash)
    if (!isValid) {
      return error('密码错误')
    }

    // 生成 TOTP 密钥
    const secret = generateTotpSecret()
    const qrCodeUrl = generateOtpUri(user.username, secret)

    // 保存密钥到数据库
    await query(
      'UPDATE users SET otp_secret = $1 WHERE id = $2',
      [secret, user.id]
    )

    return success({
      secret,
      qr_code_url: qrCodeUrl,
    })
  })
}
