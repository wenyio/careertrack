/**
 * Public A4 resume viewer.
 *
 * Owns the layout-specific behavior that is independent from public data
 * loading: responsive scaling, content measurement, page slicing, touch
 * navigation and the accessible pager.
 */

'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent,
} from 'react'
import { ResumeLivePreview } from '@/components/resume/ResumeLivePreview'
import {
  A4_PAGE_HEIGHT_PX,
  A4_PAGE_WIDTH_PX,
} from '@/constants'
import type {
  ModulesConfig,
  ResumeContent,
  ResumeModuleType,
  ResumeTemplateId,
} from '@/types/resume'

interface PublicPaginatedResumeProps {
  content: ResumeContent
  basicInfo: ResumeContent['basic_info']
  modulesConfig: ModulesConfig
  modulesOrder: ResumeModuleType[]
  template: ResumeTemplateId
}

/** Scale an A4 page down only when the viewport cannot fit its full width. */
function calculateResponsiveZoom(): number {
  if (typeof window === 'undefined') return 1
  const availableWidth = window.innerWidth - 32
  return availableWidth < A4_PAGE_WIDTH_PX
    ? availableWidth / A4_PAGE_WIDTH_PX
    : 1
}

function useResponsiveZoom() {
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const recalculate = () => setZoom(calculateResponsiveZoom())
    recalculate()
    window.addEventListener('resize', recalculate)
    return () => window.removeEventListener('resize', recalculate)
  }, [])

  return zoom
}

export default function PublicPaginatedResume({
  content,
  basicInfo,
  modulesConfig,
  modulesOrder,
  template,
}: PublicPaginatedResumeProps) {
  const zoom = useResponsiveZoom()
  const measureRef = useRef<HTMLDivElement>(null)
  const touchStartXRef = useRef<number | null>(null)
  const [pageCount, setPageCount] = useState(1)
  const [currentPage, setCurrentPage] = useState(0)
  const visiblePage = Math.min(currentPage, pageCount - 1)
  const scaledWidth = A4_PAGE_WIDTH_PX * zoom
  const scaledHeight = A4_PAGE_HEIGHT_PX * zoom

  useEffect(() => {
    const measureElement = measureRef.current
    if (!measureElement) return

    const updatePageCount = () => {
      const contentElement =
        measureElement.firstElementChild as HTMLElement | null
      const contentHeight = Math.max(
        A4_PAGE_HEIGHT_PX,
        contentElement?.scrollHeight || 0,
        contentElement?.getBoundingClientRect().height || 0,
      )
      const nextPageCount = Math.max(
        1,
        Math.ceil(contentHeight / A4_PAGE_HEIGHT_PX),
      )
      setPageCount((previous) => (
        previous === nextPageCount ? previous : nextPageCount
      ))
    }

    const resizeObserver = new ResizeObserver(updatePageCount)
    resizeObserver.observe(measureElement)
    if (measureElement.firstElementChild) {
      resizeObserver.observe(measureElement.firstElementChild)
    }

    const mutationObserver = new MutationObserver(updatePageCount)
    mutationObserver.observe(measureElement, {
      childList: true,
      subtree: true,
    })

    const frameId = window.requestAnimationFrame(updatePageCount)

    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [basicInfo, content, modulesConfig, modulesOrder, template])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, pageCount - 1)))
  }, [pageCount])

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null
  }, [])

  const handleTouchEnd = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current
    const endX = event.changedTouches[0]?.clientX
    touchStartXRef.current = null
    if (startX == null || endX == null) return

    const delta = endX - startX
    if (Math.abs(delta) < 48) return
    goToPage(visiblePage + (delta < 0 ? 1 : -1))
  }, [goToPage, visiblePage])

  return (
    <div
      style={{
        width: scaledWidth,
        maxWidth: '100%',
        margin: '0 auto',
        transition: 'width 200ms ease',
      }}
    >
      {/* Hidden full-height render is the single source for page measurement. */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute',
          left: -9999,
          top: 0,
          width: A4_PAGE_WIDTH_PX,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <ResumeLivePreview
          content={content}
          basicInfo={basicInfo}
          config={modulesConfig}
          modulesOrder={modulesOrder}
          template={template}
        />
      </div>

      <div
        className="public-resume-frame-shell"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          width: scaledWidth,
          height: scaledHeight,
          overflow: 'hidden',
          borderRadius: 4,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          background: '#fff',
          touchAction: 'pan-y',
          transition: 'width 200ms ease, height 200ms ease',
        }}
      >
        <div
          className="public-resume-frame"
          style={{
            width: A4_PAGE_WIDTH_PX,
            height: A4_PAGE_HEIGHT_PX,
            overflow: 'hidden',
            background: '#fff',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 200ms ease, width 200ms ease, height 200ms ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: A4_PAGE_WIDTH_PX * pageCount,
              transform: `translateX(-${visiblePage * A4_PAGE_WIDTH_PX}px)`,
              transition: 'transform 240ms ease',
            }}
          >
            {Array.from({ length: pageCount }, (_, pageIndex) => (
              <div
                key={pageIndex}
                className="public-resume-page"
                style={{
                  position: 'relative',
                  width: A4_PAGE_WIDTH_PX,
                  flex: `0 0 ${A4_PAGE_WIDTH_PX}px`,
                  height: A4_PAGE_HEIGHT_PX,
                  overflow: 'hidden',
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -pageIndex * A4_PAGE_HEIGHT_PX,
                    left: 0,
                    width: A4_PAGE_WIDTH_PX,
                  }}
                >
                  <ResumeLivePreview
                    content={content}
                    basicInfo={basicInfo}
                    config={modulesConfig}
                    modulesOrder={modulesOrder}
                    template={template}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {pageCount > 1 && (
        <div
          className="public-resume-pager"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginTop: 14,
          }}
        >
          <button
            type="button"
            aria-label="上一页"
            disabled={visiblePage === 0}
            onClick={() => goToPage(visiblePage - 1)}
            style={{
              width: 30,
              height: 30,
              border: '1px solid #d9d9d9',
              borderRadius: '50%',
              background: visiblePage === 0 ? '#f5f5f5' : '#fff',
              color: visiblePage === 0 ? '#bfbfbf' : '#333',
              cursor: visiblePage === 0 ? 'not-allowed' : 'pointer',
              fontSize: 18,
              lineHeight: '28px',
              padding: 0,
            }}
          >
            ‹
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`第 ${index + 1} 页`}
                aria-current={visiblePage === index ? 'page' : undefined}
                onClick={() => goToPage(index)}
                style={{
                  width: visiblePage === index ? 18 : 7,
                  height: 7,
                  border: 0,
                  borderRadius: 999,
                  padding: 0,
                  background: visiblePage === index ? '#1677ff' : '#d9d9d9',
                  cursor: 'pointer',
                  transition: 'width 160ms ease, background-color 160ms ease',
                }}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="下一页"
            disabled={visiblePage === pageCount - 1}
            onClick={() => goToPage(visiblePage + 1)}
            style={{
              width: 30,
              height: 30,
              border: '1px solid #d9d9d9',
              borderRadius: '50%',
              background: visiblePage === pageCount - 1 ? '#f5f5f5' : '#fff',
              color: visiblePage === pageCount - 1 ? '#bfbfbf' : '#333',
              cursor: visiblePage === pageCount - 1 ? 'not-allowed' : 'pointer',
              fontSize: 18,
              lineHeight: '28px',
              padding: 0,
            }}
          >
            ›
          </button>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 768px) {
          .public-resume-frame-shell,
          .public-resume-page {
            border-radius: 4px !important;
          }
          .public-resume-pager {
            gap: 8px !important;
          }
        }
      `}</style>
    </div>
  )
}
