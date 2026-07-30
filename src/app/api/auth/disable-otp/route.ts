/**
 * 禁用 OTP
 *
 * DELETE /api/auth/disable-otp
 *
 * 仅账号密码用户可操作（已有 OTP 的必定是密码用户，但这里做防御性检查）。
 */

import { withAuth, error, success } from '@/lib/api'
import { query, transaction } from '@/lib/db'
import { verifyPassword, verifyTotp } from '@/lib/auth'
import { AUTH_PROVIDER } from '@/constants/auth'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { parseJsonBody } from '@/lib/api-validation'
import { disableOtpBodySchema } from '@/lib/validation/auth'
import {
  decryptTotpSecret,
  matchingRecoveryCodeHash,
} from '@/lib/security/totp-credentials'
import { recoveryCodeHashes } from '@/lib/services/otp'
import {
  issueAuthSession,
  revokeAllAuthSessions,
} from '@/lib/security/auth-session'
import { setAuthSessionCookie } from '@/lib/security/session'

export async function DELETE(request: Request) {
  return withAuth(request, async (user) => {
    const limited = enforceRateLimit(request, {
      namespace: 'auth-otp-disable',
      limit: 10,
      windowMs: 10 * 60 * 1000,
    }, user.id)
    if (limited) return limited

    const parsedBody = await parseJsonBody(request, disableOtpBodySchema)
    if (!parsedBody.success) return parsedBody.response
    const { password, code } = parsedBody.data

    // 查询用户的 auth_provider
    const userResult = await query(
      `SELECT auth_provider, password_hash, otp_secret, otp_enabled,
        otp_recovery_codes
       FROM users WHERE id = $1`,
      [user.id]
    )

    const userData = userResult.rows[0]
    if (!userData) return error('用户不存在', 404)

    // 检查是否为账号密码用户
    if (
      (userData.auth_provider & AUTH_PROVIDER.PASSWORD) === 0
      || !userData.password_hash
    ) {
      return error('当前账号未设置密码，无法操作 OTP', 400)
    }
    if (!userData.otp_enabled) {
      return error('OTP 未启用')
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

    const storedRecoveryHashes = recoveryCodeHashes(userData.otp_recovery_codes)
    const usesTotp = /^\d{6}$/.test(code)
    const secondFactorValid = usesTotp
      ? verifyTotp(
        code,
        decryptTotpSecret(userData.otp_secret, user.id),
      )
      : !!matchingRecoveryCodeHash(code, storedRecoveryHashes, user.id)
    if (!secondFactorValid) {
      return error('OTP 验证码或恢复码错误')
    }

    const newToken = await transaction(async (transactionQuery) => {
      const updateResult = await transactionQuery(
        `UPDATE users
         SET otp_enabled = false, otp_secret = NULL,
           otp_recovery_codes = $1, updated_at = NOW()
         WHERE id = $2 AND otp_enabled = true
           AND otp_secret = $3 AND otp_recovery_codes = $4
         RETURNING id`,
        [
          JSON.stringify([]),
          user.id,
          userData.otp_secret,
          JSON.stringify(storedRecoveryHashes),
        ],
      )
      if (updateResult.rows.length === 0) {
        throw new Error('OTP_CONFIGURATION_CHANGED')
      }

      await revokeAllAuthSessions(user.id, transactionQuery)
      return issueAuthSession({
        id: user.id,
        username: user.username,
        auth_provider: userData.auth_provider,
      }, transactionQuery)
    }).catch((cause) => {
      if (
        cause instanceof Error
        && cause.message === 'OTP_CONFIGURATION_CHANGED'
      ) {
        return null
      }
      throw cause
    })
    if (!newToken) return error('OTP 配置已变化，请重试')

    const response = success({ success: true })
    setAuthSessionCookie(response, newToken, request)
    return response
  })
}
