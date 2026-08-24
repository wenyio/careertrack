/**
 * 打印 Hook（编辑页使用）
 *
 * 克隆预览内容到隐藏 iframe，调用浏览器原生打印（兼容移动端）
 */

import { useCallback } from 'react'
import { App } from 'antd'
import { cloneElementForPrint, printHtml } from '@/utils/print'
import { useI18n } from '@/i18n'

interface UsePrintOptions {
  resumeName: string
}

export function usePrint({ resumeName }: UsePrintOptions) {
  const { message } = App.useApp()
  const { t } = useI18n()

  const handlePrint = useCallback(async () => {
    try {
      const sourceEl = document.querySelector('.resume-a4-preview') as HTMLElement
      if (!sourceEl) {
        message.error({ content: t('resumeEditor.previewNotFound'), key: 'print' })
        return
      }

      const clone = cloneElementForPrint(sourceEl)

      await printHtml(clone.outerHTML, resumeName || t('resumeEditor.printDocumentTitle'))
    } catch {
      message.error({ content: t('resumeEditor.printFailedRetry'), key: 'print' })
    }
  }, [message, resumeName, t])

  return { handlePrint }
}
