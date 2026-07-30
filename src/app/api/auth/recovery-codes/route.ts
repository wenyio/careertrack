/**
 * Regenerate one-time OTP recovery codes.
 *
 * POST /api/auth/recovery-codes
 * Requires the account password plus either a current TOTP code or one
 * existing recovery code. Replacing the set invalidates every old code.
 */

import { withAuth, error, success } from '@/lib/api'
import { query } from '@/lib/db'
import { verifyPassword, verifyTotp } from '@/lib/auth'
import { AUTH_PROVIDER } from '@/constants/auth'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { parseJsonBody } from '@/lib/api-validation'
import { recoveryCodesBodySchema } from '@/lib/validation/auth'
import {
  decryptTotpSecret,
  generateRecoveryCodes,
  hashRecoveryCodes,
  matchingRecoveryCodeHash,
} from '@/lib/security/totp-credentials'
import { recoveryCodeHashes } from '@/lib/services/otp'

export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const limited = enforceRateLimit(request, {
      namespace: 'auth-otp-recovery-codes',
      limit: 10,
      windowMs: 10 * 60 * 1000,
    }, user.id)
    if (limited) return limited

    const parsedBody = await parseJsonBody(request, recoveryCodesBodySchema)
    if (!parsedBody.success) return parsedBody.response
    const { password, code } = parsedBody.data

    const result = await query(
      `SELECT auth_provider, password_hash, otp_secret, otp_enabled,
        otp_recovery_codes
       FROM users WHERE id = $1`,
      [user.id],
    )
    const userData = result.rows[0]
    if (
      !userData
      || (userData.auth_provider & AUTH_PROVIDER.PASSWORD) === 0
      || !userData.password_hash
    ) {
      return error('当前账号未设置密码，无法操作 OTP')
    }
    if (!userData.otp_enabled || !userData.otp_secret) {
      return error('OTP 未启用')
    }
    if (!await verifyPassword(password, userData.password_hash)) {
      return error('密码错误')
    }

    const storedHashes = recoveryCodeHashes(userData.otp_recovery_codes)
    const usesTotp = /^\d{6}$/.test(code)
    const secondFactorValid = usesTotp
      ? verifyTotp(code, decryptTotpSecret(userData.otp_secret, user.id))
      : !!matchingRecoveryCodeHash(code, storedHashes, user.id)
    if (!secondFactorValid) {
      return error('OTP 验证码或恢复码错误')
    }

    const recoveryCodes = generateRecoveryCodes()
    const recoveryHashes = hashRecoveryCodes(recoveryCodes, user.id)
    const updateResult = await query(
      `UPDATE users
       SET otp_recovery_codes = $1, updated_at = NOW()
       WHERE id = $2 AND otp_enabled = true
         AND otp_secret = $3 AND otp_recovery_codes = $4
       RETURNING id`,
      [
        JSON.stringify(recoveryHashes),
        user.id,
        userData.otp_secret,
        JSON.stringify(storedHashes),
      ],
    )
    if (updateResult.rows.length === 0) {
      return error('OTP 配置已变化，请重试')
    }

    return success({ recovery_codes: recoveryCodes })
  })
}
