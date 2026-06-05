/**
 * MCP Key 服务
 *
 * 提供 MCP Key 的创建、查询、撤销功能
 */

import api from './api'

/** MCP Key 信息（列表项，不含 secret） */
export interface McpKeyInfo {
  id: string
  prefix: string
  scope: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

/** MCP Key 创建结果（含 secret） */
interface McpKeyCreated {
  id: string
  secret: string
  prefix: string
  scope: string
  created_at: string
  message: string
}

/** 获取 MCP Key 列表 */
export async function getMcpKeys(): Promise<McpKeyInfo[]> {
  const response = await api.get('/mcp-keys')
  return response.data
}

/** 创建 MCP Key */
export async function createMcpKey(scope = 'read_write'): Promise<McpKeyCreated> {
  const response = await api.post('/mcp-keys', { scope })
  return response.data
}

/** 撤销 MCP Key */
export async function revokeMcpKey(keyId: string): Promise<void> {
  await api.delete(`/mcp-keys/${keyId}`)
}

/** 删除 MCP Key（物理删除） */
export async function deleteMcpKey(keyId: string): Promise<void> {
  await api.delete(`/mcp-keys/${keyId}?action=delete`)
}
