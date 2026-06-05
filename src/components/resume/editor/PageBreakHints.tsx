/**
 * 分页提示组件
 *
 * 在简历预览区显示分页虚线提示，帮助用户调整内容避免打印时被切割。
 */

'use client'

import { useState, useEffect, type RefObject } from 'react'

const A4_PREVIEW_HEIGHT = 1123

export default function PageBreakHints({ previewRef }: { previewRef: RefObject<HTMLDivElement | null> }) {
  const [breakPositions, setBreakPositions] = useState<number[]>([])

  useEffect(() => {
    const previewEl = previewRef.current
    if (!previewEl) return

    const getContentElements = () => (
      Array.from(previewEl.children).filter((child): child is HTMLElement => (
        child instanceof HTMLElement
        && child.tagName !== 'STYLE'
        && !child.classList.contains('resume-page-break-hint')
      ))
    )

    const updateBreaks = () => {
      const contentHeight = Math.max(
        A4_PREVIEW_HEIGHT,
        ...getContentElements().map((child) => child.offsetTop + child.scrollHeight),
      )
      const pageCount = Math.ceil(contentHeight / A4_PREVIEW_HEIGHT)
      const minHeight = `${pageCount * A4_PREVIEW_HEIGHT}px`
      if (previewEl.style.minHeight !== minHeight) {
        previewEl.style.minHeight = minHeight
      }
      const next = Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => (i + 1) * A4_PREVIEW_HEIGHT)
      setBreakPositions((prev) => (
        prev.length === next.length && prev.every((value, index) => value === next[index]) ? prev : next
      ))
    }

    const resizeObserver = new ResizeObserver(updateBreaks)
    const observeContent = () => {
      resizeObserver.disconnect()
      resizeObserver.observe(previewEl)
      getContentElements().forEach((child) => resizeObserver.observe(child))
    }

    const mutationObserver = new MutationObserver(() => {
      observeContent()
      updateBreaks()
    })

    observeContent()
    mutationObserver.observe(previewEl, { childList: true })

    const frameId = window.requestAnimationFrame(updateBreaks)
    window.addEventListener('resize', updateBreaks)

    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', updateBreaks)
    }
  }, [previewRef])

  return (
    <>
      {breakPositions.map((top, index) => (
        <div
          key={top}
          className="resume-page-break-hint"
          style={{
            position: 'absolute',
            top,
            left: 0,
            right: 0,
            zIndex: 20,
            pointerEvents: 'none',
            borderTop: '1px dashed rgba(255, 77, 79, 0.9)',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: -14,
              transform: 'translateX(-50%)',
              padding: '2px 8px',
              borderRadius: 999,
              backgroundColor: 'rgba(255, 255, 255, 0.96)',
              border: '1px solid rgba(255, 77, 79, 0.45)',
              color: '#cf1322',
              fontSize: 11,
              lineHeight: '18px',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
            }}
          >
            这里是分页区（第 {index + 2} 页开始）：可通过换行或调整行间距，避免内容被切割
          </span>
        </div>
      ))}
    </>
  )
}
