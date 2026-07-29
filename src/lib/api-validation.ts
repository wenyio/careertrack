import { NextResponse } from 'next/server'
import type { z } from 'zod'

type ParsedRequestInput<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse }

interface ParseJsonBodyOptions {
  /** Treat an empty HTTP body as an empty object for endpoints with defaults. */
  allowEmpty?: boolean
}

function parseWithSchema<Schema extends z.ZodType>(
  input: unknown,
  schema: Schema,
  formatIssue: (issue: z.core.$ZodIssue | undefined) => string = (issue) =>
    issue?.message || '请求参数无效',
): ParsedRequestInput<z.output<Schema>> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      response: validationResponse(formatIssue(parsed.error.issues[0])),
    }
  }

  return { success: true, data: parsed.data }
}

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
  options: ParseJsonBodyOptions = {},
): Promise<ParsedRequestInput<z.output<Schema>>> {
  let body: unknown
  try {
    const rawBody = await request.text()
    if (!rawBody.trim()) {
      if (!options.allowEmpty) {
        return {
          success: false,
          response: validationResponse('请求体必须是有效的 JSON'),
        }
      }
      body = {}
    } else {
      body = JSON.parse(rawBody)
    }
  } catch {
    return {
      success: false,
      response: validationResponse('请求体必须是有效的 JSON'),
    }
  }

  return parseWithSchema(body, schema, (issue) =>
    issue?.path.length === 0 && issue.code === 'invalid_type'
      ? '请求体必须是 JSON 对象'
      : issue?.message || '请求参数无效',
  )
}

/**
 * Validate decoded Next.js dynamic route parameters.
 */
export async function parseRouteParams<Schema extends z.ZodType>(
  params: Promise<unknown>,
  schema: Schema,
): Promise<ParsedRequestInput<z.output<Schema>>> {
  return parseWithSchema(await params, schema)
}

/**
 * Validate URL query parameters while preserving duplicate keys as arrays.
 *
 * Schemas for single-value filters reject those arrays, preventing ambiguous
 * inputs such as `?status=used&status=unused` from silently choosing one.
 */
export function parseSearchParams<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): ParsedRequestInput<z.output<Schema>> {
  const values: Record<string, string | string[]> = {}
  for (const [key, value] of new URL(request.url).searchParams) {
    const previous = values[key]
    if (previous === undefined) {
      values[key] = value
    } else {
      values[key] = Array.isArray(previous)
        ? [...previous, value]
        : [previous, value]
    }
  }

  return parseWithSchema(values, schema)
}
