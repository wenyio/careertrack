/**
 * 公开简历客户端组件
 *
 * 负责简历数据的加载与渲染（客户端交互部分）。
 * 支持从服务端传入初始数据，避免客户端重复请求，提升 SSR 内容可读性。
 */

'use client'

import { useEffect, useState, useCallback, useRef, type TouchEvent } from 'react'
import Link from 'next/link'
import { Typography, Spin } from 'antd'
import { getPublicResume } from '@/services/resume'
import { ResumeLivePreview } from '@/components/resume/ResumeLivePreview'
import type { ResumeContent, ModulesConfig, ResumeModuleType, ResumeTemplateId } from '@/types/resume'
import { DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER } from '@/types/resume'

const { Text } = Typography

const RESUME_WIDTH = 794
const RESUME_HEIGHT = 1123

/** 计算自适应缩放比 */
function calcZoom() {
  if (typeof window === 'undefined') return 1
  const available = window.innerWidth - 32 // 左右 padding 各 16px
  return available < RESUME_WIDTH ? available / RESUME_WIDTH : 1
}

/** 自适应缩放比（移动端等比缩小 A4 内容） */
function useResponsiveZoom() {
  // 初始化为 1（与 SSR 一致），挂载后立即计算真实缩放比
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const recalc = () => setZoom(calcZoom())
    recalc()
    window.addEventListener('resize', recalc)
    return () => {
      window.removeEventListener('resize', recalc)
    }
  }, [])

  return { zoom, ready: true }
}

function PublicPaginatedResume({
  content,
  basicInfo,
  config,
  modulesOrder,
  template,
  zoom,
  ready,
}: {
  content: ResumeContent
  basicInfo: ResumeContent['basic_info']
  config: ModulesConfig
  modulesOrder: ResumeModuleType[]
  template: ResumeTemplateId
  zoom: number
  ready: boolean
}) {
  const measureRef = useRef<HTMLDivElement>(null)
  const touchStartXRef = useRef<number | null>(null)
  const [pageCount, setPageCount] = useState(1)
  const [currentPage, setCurrentPage] = useState(0)
  const visiblePage = Math.min(currentPage, pageCount - 1)
  const scaledWidth = RESUME_WIDTH * zoom
  const scaledHeight = RESUME_HEIGHT * zoom

  useEffect(() => {
    const measureEl = measureRef.current
    if (!measureEl) return

    const updatePageCount = () => {
      const contentEl = measureEl.firstElementChild as HTMLElement | null
      const contentHeight = Math.max(
        RESUME_HEIGHT,
        contentEl?.scrollHeight || 0,
        contentEl?.getBoundingClientRect().height || 0,
      )
      const next = Math.max(1, Math.ceil(contentHeight / RESUME_HEIGHT))
      setPageCount((prev) => (prev === next ? prev : next))
    }

    const resizeObserver = new ResizeObserver(updatePageCount)
    resizeObserver.observe(measureEl)
    if (measureEl.firstElementChild) resizeObserver.observe(measureEl.firstElementChild)

    const mutationObserver = new MutationObserver(updatePageCount)
    mutationObserver.observe(measureEl, { childList: true, subtree: true })

    const frameId = window.requestAnimationFrame(updatePageCount)

    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [content, basicInfo, config, modulesOrder, template])

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
        opacity: ready ? 1 : 0,
        transition: 'opacity 300ms ease, width 200ms ease',
      }}
    >
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute',
          left: -9999,
          top: 0,
          width: RESUME_WIDTH,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <ResumeLivePreview
          content={content}
          basicInfo={basicInfo}
          config={config}
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
            width: RESUME_WIDTH,
            height: RESUME_HEIGHT,
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
              width: RESUME_WIDTH * pageCount,
              transform: `translateX(-${visiblePage * RESUME_WIDTH}px)`,
              transition: 'transform 240ms ease',
            }}
          >
            {Array.from({ length: pageCount }, (_, pageIndex) => (
              <div
                key={pageIndex}
                className="public-resume-page"
                style={{
                  position: 'relative',
                  width: RESUME_WIDTH,
                  flex: `0 0 ${RESUME_WIDTH}px`,
                  height: RESUME_HEIGHT,
                  overflow: 'hidden',
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -pageIndex * RESUME_HEIGHT,
                    left: 0,
                    width: RESUME_WIDTH,
                  }}
                >
                  <ResumeLivePreview
                    content={content}
                    basicInfo={basicInfo}
                    config={config}
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
    </div>
  )
}

/** 安全解析 JSON 字段 */
function safeParse<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T } catch {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[safeParse] JSON 解析失败，使用默认值')
      }
      return fallback
    }
  }
  return value as T
}

/** API 返回的原始数据类型（字段可能是字符串或对象） */
interface RawResumeData {
  name?: string
  content?: unknown
  modules_config?: unknown
  modules_order?: unknown
  template?: string
  public_slug?: string
  is_public?: boolean
}

/** 组件 Props */
interface PublicResumeClientProps {
  slug: string
  /** 服务端传入的初始数据，避免客户端重复请求 */
  initialData?: RawResumeData | null
}

export default function PublicResumeClient({ slug, initialData }: PublicResumeClientProps) {
  const { zoom, ready } = useResponsiveZoom()

  const [resume, setResume] = useState<RawResumeData | null>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 如果已有初始数据，跳过请求
    if (initialData) return

    let cancelled = false
    const fetchResume = async () => {
      try {
        const data = await getPublicResume(slug)
        if (!cancelled) {
          setResume(data as unknown as RawResumeData)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const axiosErr = err as { response?: { status?: number } }
          if (axiosErr?.response?.status === 404) {
            setError('简历不存在或未公开')
          } else {
            setError('加载失败，请稍后重试')
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    fetchResume()
    return () => { cancelled = true }
  }, [slug, initialData])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7f8fa',
      }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !resume) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7f8fa',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Typography.Title level={3} type="secondary">{error || '简历不存在'}</Typography.Title>
        </div>
      </div>
    )
  }

  // 解析各字段
  const content = safeParse<ResumeContent>(resume.content, {})
  const basicInfo = content.basic_info || {}
  const config = {
    ...DEFAULT_MODULES_CONFIG,
    ...safeParse<Partial<ModulesConfig>>(resume.modules_config, {}),
    basic_info: true,
  }
  const rawOrder = safeParse<ResumeModuleType[]>(resume.modules_order, [])
  const modulesOrder = Array.isArray(rawOrder) && rawOrder.length > 0 ? rawOrder : DEFAULT_MODULES_ORDER
  const template: ResumeTemplateId = (resume.template as ResumeTemplateId) || 'classic'

  return (
    <div
      className="public-resume-shell"
      style={{
        minHeight: '100vh',
        background: '#f7f8fa',
        padding: '40px 16px',
      }}
    >
      <PublicPaginatedResume
        content={content}
        basicInfo={basicInfo}
        config={config}
        modulesOrder={modulesOrder}
        template={template}
        zoom={zoom}
        ready={ready}
      />
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          由
          <Link
            href="/"
            style={{ color: 'inherit', textDecoration: 'none', margin: '0 4px' }}
          >
            职迹 CareerTrack
          </Link>
          生成
        </Text>
      </div>

      {/* 移动端响应式 */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .public-resume-shell {
            padding: 16px !important;
          }
          .public-resume-frame-shell {
            border-radius: 4px !important;
          }
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
