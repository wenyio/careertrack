import { randomUUID } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

const SAFE_REQUEST_ID = /^[a-zA-Z0-9._:-]{1,128}$/

/**
 * Attach one trace identifier to both the upstream request and final response.
 *
 * A syntactically safe upstream ID is preserved for distributed tracing.
 * Unsafe or oversized values are replaced to prevent log/header injection.
 */
export function proxy(request: NextRequest) {
  const incomingRequestId = request.headers.get('x-request-id')
  const requestId = incomingRequestId && SAFE_REQUEST_ID.test(incomingRequestId)
    ? incomingRequestId
    : randomUUID()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set('x-request-id', requestId)
  return response
}

export const config = {
  matcher: '/api/:path*',
}
