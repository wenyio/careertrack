import { NextResponse } from 'next/server'
import type { z } from 'zod'

type ParsedRequestInput<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse }

interface ParseJsonBodyOptions {
  /** Treat an empty HTTP body as an empty object for endpoints with defaults. */
  allowEmpty?: boolean
  /** Override the shared byte ceiling for a specific endpoint. */
  maxBytes?: number
}

export const MAX_JSON_BODY_BYTES = 1024 * 1024
export const MAX_JSON_DEPTH = 32
export const MAX_JSON_NODES = 10_000
export const MAX_JSON_STRING_CHARS = 256 * 1024

type BodyReadResult =
  | { success: true; text: string }
  | { success: false; response: NextResponse }

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

function payloadTooLargeResponse(maxBytes: number): NextResponse {
  const maxMiB = maxBytes / (1024 * 1024)
  return NextResponse.json(
    {
      code: 'PAYLOAD_TOO_LARGE',
      message: `请求体不能超过 ${maxMiB} MiB`,
    },
    { status: 413 },
  )
}

async function readBoundedBody(
  request: Request,
  maxBytes: number,
): Promise<BodyReadResult> {
  const declaredLength = Number(request.headers.get('content-length'))
  if (
    Number.isFinite(declaredLength)
    && declaredLength > maxBytes
  ) {
    return {
      success: false,
      response: payloadTooLargeResponse(maxBytes),
    }
  }

  if (!request.body) return { success: true, text: '' }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel()
        return {
          success: false,
          response: payloadTooLargeResponse(maxBytes),
        }
      }
      chunks.push(value)
    }
  } catch {
    return {
      success: false,
      response: validationResponse('请求体读取失败'),
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return {
      success: true,
      text: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    }
  } catch {
    return {
      success: false,
      response: validationResponse('请求体必须使用有效的 UTF-8 编码'),
    }
  }
}

function jsonComplexityError(input: unknown): string | undefined {
  const stack: Array<{ value: unknown; depth: number }> = [
    { value: input, depth: 0 },
  ]
  let nodes = 0

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) break

    nodes += 1
    if (nodes > MAX_JSON_NODES) {
      return `JSON 节点数量不能超过 ${MAX_JSON_NODES} 个`
    }
    if (current.depth > MAX_JSON_DEPTH) {
      return `JSON 嵌套层级不能超过 ${MAX_JSON_DEPTH} 层`
    }
    if (
      typeof current.value === 'string'
      && current.value.length > MAX_JSON_STRING_CHARS
    ) {
      return `单个文本字段不能超过 ${MAX_JSON_STRING_CHARS} 个字符`
    }

    if (Array.isArray(current.value)) {
      for (const value of current.value) {
        stack.push({ value, depth: current.depth + 1 })
      }
    } else if (current.value && typeof current.value === 'object') {
      for (const value of Object.values(current.value)) {
        stack.push({ value, depth: current.depth + 1 })
      }
    }
  }

  return undefined
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
    const bodyResult = await readBoundedBody(
      request,
      options.maxBytes ?? MAX_JSON_BODY_BYTES,
    )
    if (!bodyResult.success) return bodyResult
    const rawBody = bodyResult.text
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

  const complexityError = jsonComplexityError(body)
  if (complexityError) {
    return {
      success: false,
      response: validationResponse(complexityError),
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
