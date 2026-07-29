import { NextResponse } from 'next/server'
import { clearAuthSessionCookie } from '@/lib/security/session'

export async function POST(request: Request) {
  const response = new NextResponse(null, { status: 204 })
  clearAuthSessionCookie(response, request)
  return response
}
