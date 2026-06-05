/**
 * GitHub OAuth 发起
 *
 * GET /api/auth/github/start
 *
 * 生成 state cookie 并重定向到 GitHub 授权页。
 *
 * mode 参数：
 * - login / register：登录或注册流程（默认）
 * - bind：已登录用户绑定 GitHub 账号
 *
 * bind 模式下，state 中编码当前用户 ID 以便回调时识别。
 */

import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { verifyToken } from '@/lib/auth'

/**
 * 获取用户实际访问的 base URL
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
  const clientId = process.env.GITHUB_CLIENT_ID
  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI

  const url = new URL(request.url)
  const mode = url.searchParams.get('mode') || 'login'

  // bind 模式的错误跳回设置页，login 模式的错误返回 JSON
  const bindError = (reason: string) =>
    NextResponse.redirect(new URL(`/settings/security?bind=error&reason=${reason}&tab=github`, getBaseUrl(request)).toString())

  if (!clientId || !redirectUri) {
    console.error('[github-oauth] GITHUB_CLIENT_ID 或 GITHUB_OAUTH_REDIRECT_URI 未配置')
    if (mode === 'bind') return bindError('github_config')
    return NextResponse.json(
      { code: 'CONFIG_ERROR', message: 'GitHub OAuth 未配置' },
      { status: 500 }
    )
  }

  // 生成 state 防止 CSRF
  const stateBase = randomBytes(16).toString('hex')

  let state = stateBase

  // bind 模式：从 cookie 获取当前用户 ID，编码到 state 中
  // 浏览器跳转无法携带 Authorization header，因此从 token cookie 读取
  if (mode === 'bind') {
    const cookieHeader = request.headers.get('cookie') || ''
    const tokenCookie = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('token='))
      ?.split('=').slice(1).join('=')

    if (!tokenCookie) {
      return bindError('unauthorized')
    }
    const claims = await verifyToken(tokenCookie)
    if (!claims) {
      return bindError('token_expired')
    }
    state = `${stateBase}:${claims.sub}`
  }

  // 构建 GitHub 授权 URL
  const githubUrl = new URL('https://github.com/login/oauth/authorize')
  githubUrl.searchParams.set('client_id', clientId)
  githubUrl.searchParams.set('redirect_uri', redirectUri)
  githubUrl.searchParams.set('scope', 'read:user user:email')
  githubUrl.searchParams.set('state', state)

  // 写入 cookies（5 分钟有效期，SameSite=Lax）
  // secure 根据实际协议判断，而非 NODE_ENV（生产环境也可能是 HTTP）
  const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '')
  const isSecure = proto === 'https'

  const response = NextResponse.redirect(githubUrl.toString())
  response.cookies.set('github_oauth_state', state, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  })
  response.cookies.set('github_oauth_mode', mode, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  })

  return response
}
