/**
 * 注册 API
 *
 * POST /api/auth/register
 *
 * 账号密码注册必须提供有效注册码。
 * 注册码一次性使用，使用后立即失效。
 */

import { NextResponse } from 'next/server'
import { transaction } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { AUTH_PROVIDER } from '@/constants/auth'
import { validateRegistrationCode, markRegistrationCodeUsed } from '@/lib/registration-code'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { setAuthSessionCookie } from '@/lib/security/session'
import { issueAuthSession } from '@/lib/security/auth-session'

export async function POST(request: Request) {
  try {
    const ipLimit = enforceRateLimit(request, {
      namespace: 'auth-register-ip',
      // Account-level limits remain strict; the IP ceiling is higher to avoid
      // blocking legitimate users behind a shared office/school NAT.
      limit: 100,
      windowMs: 60 * 60 * 1000,
    })
    if (ipLimit) return ipLimit

    const body = await request.json()
    const { username, password, registration_code } = body

    const accountLimit = enforceRateLimit(request, {
      namespace: 'auth-register-account',
      limit: 5,
      windowMs: 60 * 60 * 1000,
    }, String(username || '').trim().toLowerCase())
    if (accountLimit) return accountLimit

    // 参数验证
    if (!username || !password) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '用户名和密码不能为空' },
        { status: 400 }
      )
    }

    if (!registration_code) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '注册码不能为空' },
        { status: 400 }
      )
    }

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '用户名长度需要 3-50 个字符' },
        { status: 400 }
      )
    }

    if (password.length < 10) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '密码长度至少 10 个字符' },
        { status: 400 }
      )
    }

    // 密码哈希是 CPU 密集操作，放在事务外缩短数据库锁持有时间。
    const passwordHash = await hashPassword(password)
    const { user, token } = await transaction(async (transactionQuery) => {
      const codeRecord = await validateRegistrationCode(
        registration_code,
        transactionQuery,
      )
      if (!codeRecord) {
        throw new Error('REGISTRATION_CODE_UNAVAILABLE')
      }

      const existing = await transactionQuery(
        'SELECT id FROM users WHERE username = $1',
        [username],
      )
      if (existing.rows.length > 0) {
        throw new Error('USERNAME_EXISTS')
      }

      const result = await transactionQuery(
        'INSERT INTO users (username, password_hash, auth_provider) VALUES ($1, $2, $3) RETURNING id, username, otp_enabled, role, auth_provider',
        [username, passwordHash, AUTH_PROVIDER.PASSWORD],
      )
      const createdUser = result.rows[0]

      await transactionQuery(
        'INSERT INTO profiles (user_id) VALUES ($1)',
        [createdUser.id],
      )

      const claimed = await markRegistrationCodeUsed(
        codeRecord.id as string,
        createdUser.id as string,
        transactionQuery,
      )
      if (!claimed) {
        throw new Error('REGISTRATION_CODE_UNAVAILABLE')
      }

      const token = await issueAuthSession(createdUser, transactionQuery)
      return { user: createdUser, token }
    })

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        otp_enabled: user.otp_enabled,
        role: user.role || 'user',
        auth_provider: user.auth_provider,
      },
    }, { status: 201 })
    setAuthSessionCookie(response, token, request)
    return response
  } catch (err) {
    if (err instanceof Error && err.message === 'REGISTRATION_CODE_UNAVAILABLE') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '注册码无效、已过期、已被禁用或已使用' },
        { status: 400 },
      )
    }
    if (
      err instanceof Error
      && (
        err.message === 'USERNAME_EXISTS'
        || err.message.includes('users.username')
        || err.message.includes('users_username_key')
      )
    ) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '用户名已存在' },
        { status: 400 },
      )
    }
    console.error('注册错误:', err)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
