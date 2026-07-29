import { NextResponse } from 'next/server'
import type { z } from 'zod'

type ParsedJsonBody<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse }

function validationResponse(message: string): NextResponse {
  return NextResponse.json(
    { code: 'VALIDATION_ERROR', message },
    { status: 400 },
  )
}

/**
 * Parse and validate a JSON request body without leaking parser/schema details.
 *
 * Routes receive a discriminated result so malformed client input is handled
 * before business logic and never falls through to a generic 500 response.
 */
export async function parseJsonBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<ParsedJsonBody<z.output<Schema>>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return {
      success: false,
      response: validationResponse('请求体必须是有效的 JSON'),
    }
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return {
      success: false,
      response: validationResponse(
        issue?.path.length === 0
          ? '请求体必须是 JSON 对象'
          : issue?.message || '请求参数无效',
      ),
    }
  }

  return { success: true, data: parsed.data }
}
