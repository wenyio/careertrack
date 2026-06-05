/**
 * 注册 API
 *
 * POST /api/auth/register
 *
 * 账号密码注册必须提供有效注册码。
 * 注册码一次性使用，使用后立即失效。
 */

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hashPassword, generateToken } from '@/lib/auth'
import { AUTH_PROVIDER } from '@/constants/auth'
import { validateRegistrationCode, markRegistrationCodeUsed } from '@/lib/registration-code'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password, registration_code } = body

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

    if (password.length < 6) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '密码长度至少 6 个字符' },
        { status: 400 }
      )
    }

    // 校验注册码
    const codeRecord = await validateRegistrationCode(registration_code)
    if (!codeRecord) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '注册码无效、已过期、已被禁用或已使用' },
        { status: 400 }
      )
    }

    // 检查用户名是否已存在
    const existing = await query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    )

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '用户名已存在' },
        { status: 400 }
      )
    }

    // 创建用户
    const passwordHash = await hashPassword(password)
    const result = await query(
      'INSERT INTO users (username, password_hash, auth_provider) VALUES ($1, $2, $3) RETURNING id, username, otp_enabled, role, auth_provider',
      [username, passwordHash, AUTH_PROVIDER.PASSWORD]
    )

    const user = result.rows[0]

    // 创建空的个人信息
    await query(
      'INSERT INTO profiles (user_id) VALUES ($1)',
      [user.id]
    )

    // 标记注册码为已使用
    await markRegistrationCodeUsed(codeRecord.id as string, user.id)

    // 生成 Token
    const token = await generateToken(user.id, user.username, user.auth_provider)

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        otp_enabled: user.otp_enabled,
        role: user.role || 'user',
        auth_provider: user.auth_provider,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('注册错误:', err)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
