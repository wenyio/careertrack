/**
 * 打印 Hook（编辑页使用）
 *
 * 克隆预览内容到隐藏 iframe，调用浏览器原生打印（兼容移动端）
 */

import { useCallback } from 'react'
import { App } from 'antd'
import { cloneElementForPrint, printHtml } from '@/utils/print'

interface UsePrintOptions {
  resumeName: string
}

export function usePrint({ resumeName }: UsePrintOptions) {
  const { message } = App.useApp()

  const handlePrint = useCallback(async () => {
    try {
      const sourceEl = document.querySelector('.resume-a4-preview') as HTMLElement
      if (!sourceEl) {
        message.error({ content: '未找到预览区域', key: 'print' })
        return
      }

      const clone = cloneElementForPrint(sourceEl)

      await printHtml(clone.outerHTML, resumeName || '简历')
    } catch {
      message.error({ content: '打印失败，请重试', key: 'print' })
    }
  }, [message, resumeName])

  return { handlePrint }
}
