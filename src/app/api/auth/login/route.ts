/**
 * 登录 API
 *
 * POST /api/auth/login
 *
 * password_hash 为空的用户（如 GitHub-only）不能账号密码登录。
 * 已禁用用户不能登录。
 */

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyPassword, verifyTotp, generateToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password, otp_code } = body

    // 参数验证
    if (!username || !password) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '用户名和密码不能为空' },
        { status: 400 }
      )
    }

    // 查询用户
    const result = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '用户名或密码错误' },
        { status: 400 }
      )
    }

    const user = result.rows[0]

    // 检查用户是否已被禁用
    if (user.disabled_at) {
      return NextResponse.json(
        { code: 'ACCOUNT_DISABLED', message: '账号已被禁用，请联系管理员' },
        { status: 403 }
      )
    }

    // 检查是否有密码（GitHub-only 用户无密码）
    if (!user.password_hash) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '该账号未设置密码，请使用 GitHub 登录' },
        { status: 400 }
      )
    }

    // 验证密码
    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '用户名或密码错误' },
        { status: 400 }
      )
    }

    // 验证 OTP（如果启用）
    if (user.otp_enabled) {
      if (!otp_code) {
        return NextResponse.json(
          { code: 'OTP_REQUIRED', message: '请输入 OTP 验证码' },
          { status: 400 }
        )
      }

      if (!user.otp_secret) {
        return NextResponse.json(
          { code: 'TOTP_ERROR', message: 'OTP 配置错误' },
          { status: 500 }
        )
      }

      const isValidOtp = verifyTotp(otp_code, user.otp_secret)
      if (!isValidOtp) {
        return NextResponse.json(
          { code: 'TOTP_ERROR', message: 'OTP 验证码错误' },
          { status: 400 }
        )
      }
    }

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
    })
  } catch (err) {
    console.error('登录错误:', err)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
