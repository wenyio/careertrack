import { NextResponse } from 'next/server'

export const AUTH_SESSION_COOKIE = 'careertrack_session'
export const AUTH_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60

function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('cookie') || ''
  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=')
    if (rawName === name) {
      return decodeURIComponent(rawValue.join('='))
    }
  }
  return null
}

/** Bearer is a transport alternative for server-issued, registered sessions. */
export function getSessionToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  return getCookie(request, AUTH_SESSION_COOKIE)
}

function shouldUseSecureCookie(request: Request): boolean {
  if (process.env.NODE_ENV === 'production') return true
  const forwardedProto = request.headers.get('x-forwarded-proto')
  return forwardedProto === 'https' || new URL(request.url).protocol === 'https:'
}

export function setAuthSessionCookie(
  response: NextResponse,
  token: string,
  request: Request,
): void {
  response.cookies.set(AUTH_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: 'lax',
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    path: '/',
  })

  // Remove the legacy JavaScript-readable cookie during migration.
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}

export function clearAuthSessionCookie(
  response: NextResponse,
  request: Request,
): void {
  for (const name of [AUTH_SESSION_COOKIE, 'token']) {
    response.cookies.set(name, '', {
      httpOnly: true,
      secure: shouldUseSecureCookie(request),
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
  }
}
