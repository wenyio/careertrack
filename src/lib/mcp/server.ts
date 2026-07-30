/**
 * MCP Server composition root
 *
 * 每个请求创建独立实例并注入用户权限；具体工具按 schema、profile、resume
 * 三个稳定领域注册，避免权限边界和业务实现堆叠在同一文件。
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { McpScope } from '@/lib/services/mcp-key'
import { registerProfileTools } from './profile-tools'
import { registerResumeTools } from './resume-tools'
import { registerSchemaTools } from './schema-tools'

export interface McpAuthContext {
  userId: string
  keyId: string
  scope: McpScope
}

/** 创建 MCP Server 实例（每个请求独立）。 */
export function createMcpServerForUser(auth: McpAuthContext): McpServer {
  const server = new McpServer({
    name: 'CareerTrack',
    version: '1.0.3',
  })
  const canWrite = auth.scope === 'read_write'

  registerSchemaTools(server)
  registerProfileTools(server, auth.userId, canWrite)
  registerResumeTools(server, auth.userId, canWrite)

  return server
}
