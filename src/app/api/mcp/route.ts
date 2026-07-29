/**
 * MCP HTTP 端点
 *
 * POST /api/mcp - 处理 MCP JSON-RPC 消息
 * GET  /api/mcp - 建立 SSE 流（可选）
 * DELETE /api/mcp - 关闭会话
 *
 * 鉴权：Authorization: Bearer <key> 或 X-API-Key: <key>
 */

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { verifyMcpKey } from '@/lib/services/mcp-key'
import { createMcpServerForUser } from '@/lib/mcp/server'
import type { McpAuthContext } from '@/lib/mcp/server'
import { enforceRateLimit } from '@/lib/security/rate-limit'

/** 从请求中提取 MCP Key */
function extractMcpKey(request: Request): string | null {
  // 优先检查 Authorization: Bearer <key>
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // 其次检查 X-API-Key: <key>
  const apiKey = request.headers.get('x-api-key')
  if (apiKey) {
    return apiKey
  }

  return null
}

/** 验证 MCP Key 并返回完整授权上下文 */
async function authenticateMcpKey(request: Request): Promise<McpAuthContext | null> {
  const key = extractMcpKey(request)
  if (!key) return null

  const record = await verifyMcpKey(key)
  if (!record) return null

  return {
    userId: record.user_id,
    keyId: record.id,
    scope: record.scope,
  }
}

export async function POST(request: Request) {
  const ipLimit = enforceRateLimit(request, {
    namespace: 'mcp-ip',
    limit: 120,
    windowMs: 60 * 1000,
  })
  if (ipLimit) return ipLimit

  const auth = await authenticateMcpKey(request)
  if (!auth) {
    return new Response(
      JSON.stringify({ error: '未授权：无效或已撤销的 MCP Key' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const keyLimit = enforceRateLimit(request, {
    namespace: 'mcp-key',
    limit: 600,
    windowMs: 60 * 1000,
  }, auth.keyId)
  if (keyLimit) return keyLimit

  const server = createMcpServerForUser(auth)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
    enableJsonResponse: true,
  })

  await server.connect(transport)

  try {
    const response = await transport.handleRequest(request)
    return response
  } finally {
    await server.close()
  }
}

export async function GET(request: Request) {
  const ipLimit = enforceRateLimit(request, {
    namespace: 'mcp-ip',
    limit: 120,
    windowMs: 60 * 1000,
  })
  if (ipLimit) return ipLimit

  const auth = await authenticateMcpKey(request)
  if (!auth) {
    return new Response(
      JSON.stringify({ error: '未授权' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const keyLimit = enforceRateLimit(request, {
    namespace: 'mcp-key',
    limit: 600,
    windowMs: 60 * 1000,
  }, auth.keyId)
  if (keyLimit) return keyLimit

  const server = createMcpServerForUser(auth)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  await server.connect(transport)

  try {
    const response = await transport.handleRequest(request)
    return response
  } finally {
    await server.close()
  }
}

export async function DELETE(request: Request) {
  const ipLimit = enforceRateLimit(request, {
    namespace: 'mcp-ip',
    limit: 120,
    windowMs: 60 * 1000,
  })
  if (ipLimit) return ipLimit

  const auth = await authenticateMcpKey(request)
  if (!auth) {
    return new Response(
      JSON.stringify({ error: '未授权' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const keyLimit = enforceRateLimit(request, {
    namespace: 'mcp-key',
    limit: 600,
    windowMs: 60 * 1000,
  }, auth.keyId)
  if (keyLimit) return keyLimit

  const server = createMcpServerForUser(auth)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  await server.connect(transport)

  try {
    const response = await transport.handleRequest(request)
    return response
  } finally {
    await server.close()
  }
}
