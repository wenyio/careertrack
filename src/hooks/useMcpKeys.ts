/**
 * MCP Key 相关 Hooks
 *
 * 使用 TanStack Query 管理 MCP Key 的获取、创建和撤销
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { getMcpKeys, createMcpKey, revokeMcpKey, deleteMcpKey } from '@/services/mcp'

/** Query key 常量 */
export const MCP_KEYS_QUERY_KEY = ['mcp-keys']

/** 获取 MCP Key 列表 */
export function useMcpKeys() {
  return useQuery({
    queryKey: MCP_KEYS_QUERY_KEY,
    queryFn: getMcpKeys,
    staleTime: 60 * 1000, // 1 分钟
  })
}

/** 创建 MCP Key */
export function useCreateMcpKey() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  return useMutation({
    mutationFn: () => createMcpKey(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MCP_KEYS_QUERY_KEY })
      message.success('Key 创建成功')
    },
    onError: () => {
      message.error('创建 Key 失败')
    },
  })
}

/** 撤销 MCP Key */
export function useRevokeMcpKey() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  return useMutation({
    mutationFn: (keyId: string) => revokeMcpKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MCP_KEYS_QUERY_KEY })
      message.success('Key 已撤销')
    },
    onError: () => {
      message.error('撤销失败')
    },
  })
}

/** 删除 MCP Key（物理删除） */
export function useDeleteMcpKey() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  return useMutation({
    mutationFn: (keyId: string) => deleteMcpKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MCP_KEYS_QUERY_KEY })
      message.success('Key 已删除')
    },
    onError: () => {
      message.error('删除失败')
    },
  })
}
