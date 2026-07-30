/**
 * 验证并启用 OTP
 *
 * POST /api/auth/verify-otp
 *
 * 仅账号密码用户可启用 OTP。
 */

import { withAuth, error, success } from '@/lib/api'
import { query, transaction } from '@/lib/db'
import { verifyTotp } from '@/lib/auth'
import { AUTH_PROVIDER } from '@/constants/auth'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { parseJsonBody } from '@/lib/api-validation'
import { verifyOtpBodySchema } from '@/lib/validation/auth'
import {
  decryptTotpSecret,
  generateRecoveryCodes,
  hashRecoveryCodes,
} from '@/lib/security/totp-credentials'
import {
  issueAuthSession,
  revokeAllAuthSessions,
} from '@/lib/security/auth-session'
import { setAuthSessionCookie } from '@/lib/security/session'

export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const limited = enforceRateLimit(request, {
      namespace: 'auth-otp-verify',
      limit: 10,
      windowMs: 10 * 60 * 1000,
    }, user.id)
    if (limited) return limited

    const parsedBody = await parseJsonBody(request, verifyOtpBodySchema)
    if (!parsedBody.success) return parsedBody.response
    const { code } = parsedBody.data

    // 获取用户的 OTP 密钥和 auth_provider
    const result = await query(
      `SELECT auth_provider, otp_secret, otp_enabled
       FROM users WHERE id = $1`,
      [user.id]
    )

    const userData = result.rows[0]
    if (!userData) return error('用户不存在', 404)

    // 检查是否为账号密码用户
    if ((userData.auth_provider & AUTH_PROVIDER.PASSWORD) === 0) {
      return error('当前账号通过 GitHub 登录，需先设置账号密码后才能启用 OTP', 400)
    }
    if (userData.otp_enabled) {
      return error('OTP 已启用')
    }

    const otpSecret = userData.otp_secret
    if (!otpSecret) {
      return error('OTP 未配置')
    }

    // 验证 OTP
    const plaintextSecret = decryptTotpSecret(otpSecret, user.id)
    const isValid = verifyTotp(code, plaintextSecret)
    if (!isValid) {
      return error('OTP 验证码错误')
    }

    const recoveryCodes = generateRecoveryCodes()
    const recoveryHashes = hashRecoveryCodes(recoveryCodes, user.id)
    const newToken = await transaction(async (transactionQuery) => {
      const updateResult = await transactionQuery(
        `UPDATE users
         SET otp_enabled = true, otp_recovery_codes = $1, updated_at = NOW()
         WHERE id = $2 AND otp_enabled = false AND otp_secret = $3
         RETURNING id`,
        [JSON.stringify(recoveryHashes), user.id, otpSecret],
      )
      if (updateResult.rows.length === 0) {
        throw new Error('OTP_SETUP_CHANGED')
      }

      // 启用二次验证后撤销其他设备，当前设备获得一条新会话。
      await revokeAllAuthSessions(user.id, transactionQuery)
      return issueAuthSession({
        id: user.id,
        username: user.username,
        auth_provider: userData.auth_provider,
      }, transactionQuery)
    }).catch((cause) => {
      if (cause instanceof Error && cause.message === 'OTP_SETUP_CHANGED') {
        return null
      }
      throw cause
    })
    if (!newToken) return error('OTP 配置已变化，请重新开始')

    const response = success({
      success: true,
      recovery_codes: recoveryCodes,
    })
    setAuthSessionCookie(response, newToken, request)
    return response
  })
}
