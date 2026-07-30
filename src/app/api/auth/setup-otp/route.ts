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
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { parseJsonBody } from '@/lib/api-validation'
import { setupOtpBodySchema } from '@/lib/validation/auth'
import { encryptTotpSecret } from '@/lib/security/totp-credentials'

export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const limited = enforceRateLimit(request, {
      namespace: 'auth-otp-setup',
      limit: 10,
      windowMs: 10 * 60 * 1000,
    }, user.id)
    if (limited) return limited

    const parsedBody = await parseJsonBody(request, setupOtpBodySchema)
    if (!parsedBody.success) return parsedBody.response
    const { password } = parsedBody.data

    // 查询用户的 auth_provider 和 password_hash
    const userResult = await query(
      'SELECT auth_provider, password_hash, otp_enabled FROM users WHERE id = $1',
      [user.id]
    )

    const userData = userResult.rows[0]
    if (!userData) return error('用户不存在', 404)

    // 检查是否为账号密码用户
    if (
      (userData.auth_provider & AUTH_PROVIDER.PASSWORD) === 0
      || !userData.password_hash
    ) {
      return error('当前账号通过 GitHub 登录，需先设置账号密码后才能启用 OTP', 400)
    }
    if (userData.otp_enabled) {
      return error('OTP 已启用，如需更换身份验证器请先禁用')
    }

    // 验证密码
    const isValid = await verifyPassword(password, userData.password_hash)
    if (!isValid) {
      return error('密码错误')
    }

    // 生成 TOTP 密钥
    const secret = generateTotpSecret()
    const qrCodeUrl = generateOtpUri(user.username, secret)

    // 数据库只保存与用户 ID 绑定的 AES-GCM 密文。
    const updateResult = await query(
      `UPDATE users
       SET otp_secret = $1, otp_recovery_codes = $2, updated_at = NOW()
       WHERE id = $3 AND otp_enabled = false
       RETURNING id`,
      [encryptTotpSecret(secret, user.id), JSON.stringify([]), user.id]
    )
    if (updateResult.rows.length === 0) {
      return error('OTP 配置已变化，请重试')
    }

    return success({
      secret,
      qr_code_url: qrCodeUrl,
    })
  })
}
