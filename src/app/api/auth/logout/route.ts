import { NextResponse } from 'next/server'
import {
  clearAuthSessionCookie,
  getSessionToken,
} from '@/lib/security/session'
import { revokeAuthSessionToken } from '@/lib/security/auth-session'

export async function POST(request: Request) {
  let response: NextResponse
  const token = getSessionToken(request)
  try {
    if (token) await revokeAuthSessionToken(token)
    response = new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[auth] 撤销服务端会话失败:', error)
    response = NextResponse.json(
      { code: 'SESSION_REVOKE_FAILED', message: '会话撤销失败' },
      { status: 500 },
    )
  }

  // 即使数据库暂时不可用，也先清除浏览器凭证，避免客户端继续携带它。
  clearAuthSessionCookie(response, request)
  return response
}
