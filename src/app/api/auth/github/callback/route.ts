/**
 * GitHub OAuth 回调
 *
 * GET /api/auth/github/callback
 *
 * 校验 state → 用 code 换 token → 获取 GitHub 用户信息 →
 * 根据 mode 分流：
 * - login/register：已有绑定则登录，无绑定则创建新用户
 * - bind：将 GitHub 账号绑定到当前登录用户
 *
 * 成功后重定向：
 * - login/register → 写入 HttpOnly session 后跳转 /auth/oauth/callback
 * - bind → /settings/security?bind=success
 */

import { NextResponse } from 'next/server'
import { query, transaction } from '@/lib/db'
import { AUTH_PROVIDER } from '@/constants/auth'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { setAuthSessionCookie } from '@/lib/security/session'
import {
  issueAuthSession,
  resolveRequestAuthSession,
} from '@/lib/security/auth-session'
import { parseSearchParams } from '@/lib/api-validation'
import { githubOAuthCallbackQuerySchema } from '@/lib/validation/params'

interface GitHubUser {
  id: number
  login: string
  avatar_url: string
  email?: string
}

interface GitHubEmail {
  email: string
  primary: boolean
  verified: boolean
  visibility: string | null
}

/**
 * 向 GitHub API 发请求
 */
async function githubFetch(url: string, accessToken: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CareerTrack',
    },
  })
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

/**
 * 从 cookie 字符串中提取指定 cookie 的值
 */
function getCookie(cookieHeader: string, name: string): string | undefined {
  return cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${name}=`))
    ?.split('=').slice(1).join('=') // 值中可能包含 =
}

/**
 * 获取用户实际访问的 base URL
 *
 * 容器环境中 request.url 可能是内部地址（如 0.0.0.0），
 * 需要从 Host / X-Forwarded-Host header 获取真实域名。
 */
function getBaseUrl(request: Request): string {
  const host = request.headers.get('x-forwarded-host')
    || request.headers.get('host')
    || new URL(request.url).host
  const proto = request.headers.get('x-forwarded-proto')
    || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  return `${proto}://${host}`
}

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, {
    namespace: 'auth-github-callback',
    limit: 60,
    windowMs: 10 * 60 * 1000,
  })
  if (limited) return limited

  const url = new URL(request.url)
  const requestProto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '')
  const isSecure = requestProto === 'https'

  // 从 cookie 读取 state 和 mode
  // state 含 `:` 会被 GitHub URL 编码为 `%3A`，cookie 保留原始编码，
  // 而 searchParams.get 会自动解码，因此 cookie 值需要 decodeURIComponent
  const cookieHeader = request.headers.get('cookie') || ''
  const stateCookieRaw = getCookie(cookieHeader, 'github_oauth_state')
  let stateCookie: string | undefined
  try {
    stateCookie = stateCookieRaw
      ? decodeURIComponent(stateCookieRaw)
      : undefined
  } catch {
    stateCookie = undefined
  }
  const rawMode = getCookie(cookieHeader, 'github_oauth_mode')
  const mode = rawMode === 'bind' || rawMode === 'register'
    ? rawMode
    : 'login'

  // 根据 mode 决定错误跳转地址
  const errorRedirect = (reason: string) => {
    if (mode === 'bind') {
      return NextResponse.redirect(new URL(`/settings/security?bind=error&reason=${reason}&tab=github`, getBaseUrl(request)).toString())
    }
    return NextResponse.redirect(new URL(`/auth/login?error=${reason}`, getBaseUrl(request)).toString())
  }

  // 校验 code 和 state
  const parsedQuery = parseSearchParams(
    request,
    githubOAuthCallbackQuerySchema,
  )
  if (
    !parsedQuery.success
    || !stateCookie
    || parsedQuery.data.state !== stateCookie
  ) {
    console.error('[github-oauth] state 校验失败')
    return errorRedirect('github_state')
  }
  const { code, state } = parsedQuery.data

  let bindingUserId: string | undefined
  if (mode === 'bind') {
    const session = await resolveRequestAuthSession(request)
    if (!session) return errorRedirect('unauthorized')
    if (session.user.disabled_at) return errorRedirect('account_disabled')

    const stateUserId = state.split(':')[1]
    if (!stateUserId || stateUserId !== session.user.id) {
      return errorRedirect('invalid_state')
    }
    bindingUserId = session.user.id
  }

  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  const clientId = process.env.GITHUB_CLIENT_ID

  if (!clientSecret || !clientId) {
    console.error('[github-oauth] GitHub OAuth 环境变量未配置')
    return NextResponse.redirect(new URL('/auth/login?error=github_config', getBaseUrl(request)).toString())
  }

  try {
    // 用 code 换 access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: process.env.GITHUB_OAUTH_REDIRECT_URI,
      }),
    })

    const tokenData = await tokenRes.json() as { access_token?: string; error?: string }

    if (!tokenData.access_token) {
      console.error('[github-oauth] 获取 access_token 失败:', tokenData.error)
      return errorRedirect('github_token')
    }

    const accessToken = tokenData.access_token

    // 获取 GitHub 用户信息
    const githubUser = await githubFetch('https://api.github.com/user', accessToken) as GitHubUser
    const githubEmails = await githubFetch('https://api.github.com/user/emails', accessToken) as GitHubEmail[]

    // 优先取 verified primary email
    const primaryEmail = githubEmails.find(e => e.primary && e.verified)?.email
      || githubEmails.find(e => e.verified)?.email
      || null

    // ========== bind 模式 ==========
    if (mode === 'bind') {
      // 绑定目标来自当前服务端会话，不能只信任客户端可伪造的 state Cookie。
      if (!bindingUserId) return errorRedirect('invalid_state')
      const userId = bindingUserId

      try {
        await transaction(async (transactionQuery) => {
          const userCheck = await transactionQuery(
            'SELECT id, auth_provider, disabled_at FROM users WHERE id = $1',
            [userId],
          )
          if (userCheck.rows.length === 0) throw new Error('OAUTH_USER_NOT_FOUND')
          if (userCheck.rows[0].disabled_at) throw new Error('OAUTH_USER_DISABLED')

          const existingBinding = await transactionQuery(
            'SELECT user_id FROM user_oauth_accounts WHERE provider = $1 AND provider_account_id = $2',
            ['github', String(githubUser.id)],
          )
          if (
            existingBinding.rows.length > 0
            && existingBinding.rows[0].user_id !== userId
          ) {
            throw new Error('OAUTH_ALREADY_BOUND')
          }
          if (existingBinding.rows.length > 0) return

          await transactionQuery(
            `INSERT INTO user_oauth_accounts (user_id, provider, provider_account_id, provider_username, email, avatar_url)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, 'github', String(githubUser.id), githubUser.login, primaryEmail, githubUser.avatar_url],
          )

          const currentProvider = userCheck.rows[0].auth_provider as number
          await transactionQuery(
            'UPDATE users SET auth_provider = $1, updated_at = NOW() WHERE id = $2',
            [currentProvider | AUTH_PROVIDER.GITHUB, userId],
          )
        })
      } catch (error) {
        const reason = error instanceof Error ? error.message : ''
        if (reason === 'OAUTH_USER_NOT_FOUND') {
          return NextResponse.redirect(new URL('/settings/security?bind=error&reason=user_not_found&tab=github', getBaseUrl(request)).toString())
        }
        if (reason === 'OAUTH_USER_DISABLED') {
          return NextResponse.redirect(new URL('/settings/security?bind=error&reason=account_disabled&tab=github', getBaseUrl(request)).toString())
        }
        if (reason === 'OAUTH_ALREADY_BOUND') {
          return NextResponse.redirect(new URL('/settings/security?bind=error&reason=already_bound&tab=github', getBaseUrl(request)).toString())
        }
        throw error
      }

      // 清除 cookies，重定向到设置页的 GitHub 绑定 tab
      const response = NextResponse.redirect(new URL('/settings/security?bind=success&tab=github', getBaseUrl(request)).toString())
      response.cookies.set('github_oauth_state', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: 0, path: '/' })
      response.cookies.set('github_oauth_mode', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: 0, path: '/' })
      return response
    }

    // ========== login/register 模式 ==========

    // 查找已有 OAuth 绑定
    const existingBinding = await query(
      'SELECT user_id FROM user_oauth_accounts WHERE provider = $1 AND provider_account_id = $2',
      ['github', String(githubUser.id)]
    )

    let userId: string

    if (existingBinding.rows.length > 0) {
      // 已有绑定 → 登录
      userId = existingBinding.rows[0].user_id

      // 检查用户是否被禁用
      const userCheck = await query(
        'SELECT disabled_at FROM users WHERE id = $1',
        [userId]
      )
      if (userCheck.rows[0]?.disabled_at) {
        return NextResponse.redirect(new URL('/auth/login?error=account_disabled', getBaseUrl(request)).toString())
      }

      // 更新 provider_username 和 avatar_url
      await query(
        'UPDATE user_oauth_accounts SET provider_username = $1, avatar_url = $2, email = $3, updated_at = NOW() WHERE provider = $4 AND provider_account_id = $5',
        [githubUser.login, githubUser.avatar_url, primaryEmail, 'github', String(githubUser.id)]
      )
    } else {
      // 无绑定 → 创建新用户
      let username = `github_${githubUser.login}`
      const existingUser = await query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      )
      if (existingUser.rows.length > 0) {
        const suffix = Math.random().toString(36).slice(2, 6)
        username = `github_${githubUser.login}_${suffix}`
      }

      userId = await transaction(async (transactionQuery) => {
        const userResult = await transactionQuery(
          'INSERT INTO users (username, auth_provider) VALUES ($1, $2) RETURNING id',
          [username, AUTH_PROVIDER.GITHUB],
        )
        const createdUserId = userResult.rows[0].id as string

        await transactionQuery(
          'INSERT INTO profiles (user_id) VALUES ($1)',
          [createdUserId],
        )

        await transactionQuery(
          `INSERT INTO user_oauth_accounts (user_id, provider, provider_account_id, provider_username, email, avatar_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [createdUserId, 'github', String(githubUser.id), githubUser.login, primaryEmail, githubUser.avatar_url],
        )

        return createdUserId
      })
    }

    // 读取完整用户信息生成 token
    const userResult = await query(
      'SELECT id, username, otp_enabled, role, auth_provider FROM users WHERE id = $1',
      [userId]
    )
    const user = userResult.rows[0]
    const token = await issueAuthSession(user)

    // 写入 HttpOnly session，清除 state cookie，重定向到 OAuth 中转页。
    const redirectUrl = new URL('/auth/oauth/callback', getBaseUrl(request))

    const response = NextResponse.redirect(redirectUrl.toString())
    setAuthSessionCookie(response, token, request)
    response.cookies.set('github_oauth_state', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: 0, path: '/' })
    response.cookies.set('github_oauth_mode', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: 0, path: '/' })

    return response
  } catch (err) {
    console.error('[github-oauth] 回调处理错误:', err)
    return errorRedirect('github_callback')
  }
}
