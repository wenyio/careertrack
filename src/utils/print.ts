/**
 * 简历打印工具
 *
 * 通过隐藏 iframe 渲染简历 HTML，调用浏览器原生打印（兼容移动端）
 */

import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Resume, ResumeContent, ModulesConfig, ResumeModuleType, ResumeTemplateId } from '@/types/resume'
import { DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER } from '@/types/resume'
import ResumeHtmlPreview from '@/components/resume/editor/ResumeHtmlPreview'
import { A4_PAGE_HEIGHT_PX, A4_PAGE_WIDTH_PX } from '@/constants'

const PRINT_RICH_TEXT_CSS = `
  .resume-desc {
    word-break: break-word;
  }
  .resume-desc p {
    margin: 0 0 4px 0;
  }
  .resume-desc p:last-child {
    margin-bottom: 0;
  }
  .resume-desc ul {
    margin: 2px 0 4px 0;
    padding-left: 20px;
    list-style-type: disc;
  }
  .resume-desc ol {
    margin: 2px 0 4px 0;
    padding-left: 20px;
    list-style-type: decimal;
  }
  .resume-desc li {
    margin-bottom: 2px;
  }
  .resume-desc code {
    background-color: #f5f5f5;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 0.9em;
  }
  .resume-desc a {
    color: #1677ff;
    text-decoration: underline;
  }
`

function copyComputedStyles(source: Element, target: Element) {
  const computed = window.getComputedStyle(source)
  const targetStyle = (target as HTMLElement | SVGElement).style

  for (let i = 0; i < computed.length; i += 1) {
    const property = computed[i]
    targetStyle.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property))
  }

  for (let i = 0; i < source.children.length; i += 1) {
    copyComputedStyles(source.children[i], target.children[i])
  }
}

/**
 * 克隆预览节点并固化计算样式，尽量保证打印与屏幕预览一致。
 */
export function cloneElementForPrint(sourceEl: HTMLElement): HTMLElement {
  const clone = sourceEl.cloneNode(true) as HTMLElement
  copyComputedStyles(sourceEl, clone)
  clone.querySelectorAll('.resume-page-break-hint').forEach((el) => el.remove())
  // 移除编辑 UI 元素（避免冻结高度包含工具栏空间）
  clone.querySelectorAll('.preview-module-toolbar, .preview-subitem-actions').forEach((el) => el.remove())
  // 重置所有 resume 相关容器的高度为 auto，消除 copyComputedStyles 冻结的固定高度
  clone.querySelectorAll<HTMLElement>('.resume-a4-preview, section, [data-module], .resume-subitem, .preview-subitem, .resume-subitem > div, .preview-subitem > div').forEach((el) => {
    el.style.setProperty('height', 'auto', 'important')
  })
  clone.querySelectorAll<HTMLElement>('.resume-subitem, .preview-subitem, .resume-subitem > div, .preview-subitem > div').forEach((el) => {
    el.style.setProperty('break-inside', 'auto', 'important')
    el.style.setProperty('page-break-inside', 'auto', 'important')
  })
  clone.style.width = `${A4_PAGE_WIDTH_PX}px`
  clone.style.height = 'auto'
  clone.style.minHeight = `${A4_PAGE_HEIGHT_PX}px`
  clone.style.margin = '0 auto'
  clone.style.transform = 'none'
  clone.style.transformOrigin = 'top left'
  clone.style.boxShadow = 'none'
  clone.style.borderRadius = '0'
  return clone
}

/**
 * 生成打印用 HTML 页面
 */
function buildPrintHtml(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100%;
    min-height: 100%;
    background: #fff;
  }
  body, * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  body {
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
  body > .resume-a4-preview {
    flex: 0 0 ${A4_PAGE_WIDTH_PX}px !important;
    width: ${A4_PAGE_WIDTH_PX}px !important;
    max-width: ${A4_PAGE_WIDTH_PX}px !important;
    height: auto !important;
    margin: 0 auto !important;
    transform: none !important;
    transform-origin: top left !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
  /* 重置内部容器高度：copyComputedStyles 会冻结 height 为固定像素值，
     在打印上下文中可能导致内容高度不匹配，产生异常空白 */
  .resume-a4-preview > div {
    height: auto !important;
  }
  .anticon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 1em;
    height: 1em;
    line-height: 1;
    vertical-align: -0.125em;
    overflow: visible;
  }
  .anticon > svg {
    display: block;
    width: 1em;
    height: 1em;
    overflow: visible;
  }
  .preview-module-toolbar,
  .preview-subitem-actions,
  .resume-page-break-hint {
    display: none !important;
  }
  .resume-subitem,
  .preview-subitem {
    break-inside: auto !important;
    page-break-inside: auto !important;
  }
  .resume-subitem > div,
  .preview-subitem > div {
    break-inside: auto !important;
    page-break-inside: auto !important;
  }
${PRINT_RICH_TEXT_CSS}
  @media print { body { margin: 0; } }
</style>
</head>
<body>${bodyHtml}</body>
</html>`
}

/**
 * 通过隐藏 iframe 打印 HTML 内容（兼容移动端）
 *
 * 创建隐藏 iframe → 写入 HTML → 等待加载 → 调用 print → 移除 iframe
 */
export function printHtml(bodyHtml: string, title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    iframe.style.opacity = '0'
    iframe.style.pointerEvents = 'none'
    iframe.title = title
    document.body.appendChild(iframe)

    const cleanup = () => {
      iframe.remove()
    }

    const win = iframe.contentWindow
    if (!win) {
      cleanup()
      reject(new Error('无法创建打印窗口'))
      return
    }

    iframe.srcdoc = buildPrintHtml(bodyHtml, title)

    // 等待内容加载完成后触发打印
    iframe.onload = () => {
      // 留出渲染时间
      setTimeout(() => {
        // 临时替换父页面标题，使打印/保存 PDF 的默认文件名为简历名
        const originalTitle = document.title
        document.title = title
        try {
          win.print()
        } finally {
          document.title = originalTitle
          cleanup()
          resolve()
        }
      }, 300)
    }
  })
}

/**
 * 在新窗口中渲染简历并打印（列表页使用）
 *
 * 渲染 React 预览组件到离屏容器 → 取 HTML → 通过隐藏 iframe 打印
 */
export async function printResume(resume: Resume): Promise<void> {
  // 创建离屏容器渲染预览
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.zIndex = '-1'
  document.body.appendChild(container)

  const root = createRoot(container)

  try {
    const content: ResumeContent = resume.content || {}
    const modulesConfig: ModulesConfig = resume.modules_config || DEFAULT_MODULES_CONFIG
    const modulesOrder: ResumeModuleType[] = resume.modules_order || DEFAULT_MODULES_ORDER
    const template: ResumeTemplateId = resume.template || 'classic'

    await new Promise<void>((resolve) => {
      root.render(
        createElement('div', {
          className: 'resume-a4-preview',
          style: { width: A4_PAGE_WIDTH_PX },
        },
          createElement(ResumeHtmlPreview, { content, modulesConfig, modulesOrder, template }),
        ),
      )
      setTimeout(resolve, 500)
    })

    const previewEl = container.querySelector('.resume-a4-preview') as HTMLElement
    if (!previewEl) throw new Error('未找到预览区域')

    const clone = cloneElementForPrint(previewEl)

    await printHtml(clone.outerHTML, resume.name || '简历')
  } finally {
    root.unmount()
    document.body.removeChild(container)
  }
}
