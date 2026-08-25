/**
 * 简历列表卡片组件
 *
 * 渲染单个简历的缩略图、名称、日期和操作按钮。
 * 正式用户显示公开链接按钮，游客不显示。
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, Button, Tag, Popover, Typography, Spin } from 'antd'
import {
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  GlobalOutlined,
  LockOutlined,
  PrinterOutlined,
} from '@ant-design/icons'
import ResumeMiniPreview from '@/components/resume/ResumeMiniPreview'
import ResumeSummaryThumbnail from '@/components/resume/ResumeSummaryThumbnail'
import PublicLinkPopover from '@/components/resume/PublicLinkPopover'
import { formatDate } from '@/utils/format'
import { useResume } from '@/hooks/useResume'
import { DEFAULT_MODULES_ORDER } from '@/types/resume'
import type { ResumeContent, ModulesConfig, ResumeModuleType, ResumeTemplateId } from '@/types/resume'
import type { Profile } from '@/types/profile'
import { useI18n } from '@/i18n'

const { Text } = Typography

export interface ResumeListResume {
  id: string
  name: string
  content?: ResumeContent
  modules_config?: ModulesConfig
  modules_order?: ResumeModuleType[]
  preview_sections?: ResumeModuleType[]
  template: ResumeTemplateId
  updated_at: string
  is_public?: boolean
  public_slug?: string | null
}

interface ResumeListCardProps {
  resume: ResumeListResume
  profile?: Profile | null
  showPublic: boolean
  popoverResumeId: string | null
  exportingId: string | null
  isNavigating: boolean
  isNavigationPending: boolean
  onEdit: (id: string) => void
  onPreview: (id: string) => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string, name: string) => void
  onPrint: (id: string) => void
  onTogglePublic?: (resumeId: string, isPublic: boolean, slug?: string) => void
  onPopoverChange: (resumeId: string | null) => void
}

/**
 * 只在缩略图接近视口时读取正文。列表接口保持轻量，滚动到卡片时才用真实
 * A4 预览替换结构摘要；不支持 IntersectionObserver 的旧环境则安全降级为读取。
 */
function usePreviewInViewport() {
  const targetRef = useRef<HTMLDivElement>(null)
  const [isInViewport, setIsInViewport] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    if (!('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setIsInViewport(true)
        observer.disconnect()
      }
    }, { rootMargin: '160px 0px' })

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return { targetRef, isInViewport }
}

export default function ResumeListCard({
  resume,
  profile,
  showPublic,
  popoverResumeId,
  exportingId,
  isNavigating,
  isNavigationPending,
  onEdit,
  onPreview,
  onRename,
  onDuplicate,
  onDelete,
  onPrint,
  onTogglePublic,
  onPopoverChange,
}: ResumeListCardProps) {
  const { t } = useI18n()
  const hasInlinePreview = Boolean(resume.content && resume.modules_config)
  const { targetRef, isInViewport } = usePreviewInViewport()
  const { data: previewResume } = useResume(resume.id, {
    // 游客数据已经在内存中；正式用户只在卡片接近视口时按需取详情。
    enabled: !hasInlinePreview && isInViewport,
  })
  const livePreview = hasInlinePreview
    ? resume
    : previewResume
  const isDisabledByNavigation = isNavigationPending && !isNavigating

  return (
    <Card
      hoverable
      aria-busy={isNavigating}
      aria-disabled={isNavigationPending}
      data-resume-card-id={resume.id}
      data-resume-navigation-state={isNavigating ? 'loading' : isDisabledByNavigation ? 'disabled' : 'idle'}
      onClick={() => {
        if (!isNavigationPending) onEdit(resume.id)
      }}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        cursor: isNavigationPending ? 'progress' : 'pointer',
        opacity: isDisabledByNavigation ? 0.55 : 1,
        position: 'relative',
        transition: 'box-shadow 0.2s, transform 0.2s, opacity 0.18s',
      }}
      styles={{ body: { padding: 0 } }}
    >
      {isNavigating && (
        <div className="resume-list-navigation-overlay" aria-hidden="true">
          <Spin size="small" />
        </div>
      )}
      <div style={{ display: 'flex', padding: 16, gap: 16 }}>
        {/* 左侧：缩略图预览 */}
        <div
          ref={targetRef}
          className="resume-list-preview-trigger"
          data-preview-mode={livePreview ? 'live' : 'summary'}
          data-resume-preview-id={resume.id}
          style={{ flexShrink: 0, cursor: isNavigationPending ? 'progress' : 'pointer', position: 'relative' }}
          role="button"
          tabIndex={isNavigationPending ? -1 : 0}
          aria-label={`预览 ${resume.name}`}
          onClick={(event) => {
            event.stopPropagation()
            if (!isNavigationPending) onPreview(resume.id)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              event.stopPropagation()
              if (!isNavigationPending) onPreview(resume.id)
            }
          }}
        >
          {livePreview?.content && livePreview.modules_config ? (
            <ResumeMiniPreview
              content={livePreview.content}
              modulesConfig={livePreview.modules_config}
              modulesOrder={livePreview.modules_order || DEFAULT_MODULES_ORDER}
              template={livePreview.template || 'classic'}
              profile={profile ?? undefined}
              width={120}
            />
          ) : (
            <ResumeSummaryThumbnail
              sections={resume.preview_sections || []}
              template={resume.template || 'classic'}
              width={120}
            />
          )}
          <div className="resume-list-preview-overlay" aria-hidden="true">
            <EyeOutlined />
          </div>
        </div>

        {/* 右侧：信息与操作 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* 顶部：名称 + 标签 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <Text
              strong
              ellipsis
              style={{ fontSize: 15, cursor: isNavigationPending ? 'progress' : 'pointer', flex: 1, minWidth: 0 }}
              role="link"
              tabIndex={isNavigationPending ? -1 : 0}
              aria-label={`编辑 ${resume.name}`}
              onClick={(event) => {
                event.stopPropagation()
                if (!isNavigationPending) onEdit(resume.id)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  if (!isNavigationPending) onEdit(resume.id)
                }
              }}
            >
              {resume.name}
            </Text>
            {showPublic && resume.is_public && <Tag color="blue" style={{ flexShrink: 0 }}>{t('resume.publicTag')}</Tag>}
          </div>

          <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
            {t('resume.updatedAt', { time: formatDate(resume.updated_at, 'YYYY-MM-DD HH:mm') })}
          </Text>

          {/* 底部：操作按钮 */}
          <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Button
              type="text"
              size="small"
              aria-label={`重命名 ${resume.name}`}
              icon={<EditOutlined />}
              disabled={isNavigationPending}
              onClick={(event) => {
                event.stopPropagation()
                onRename(resume.id, resume.name)
              }}
            />
            <Button
              type="text"
              size="small"
              aria-label={`复制 ${resume.name}`}
              icon={<CopyOutlined />}
              disabled={isNavigationPending}
              onClick={(event) => {
                event.stopPropagation()
                onDuplicate(resume.id)
              }}
            />
            {showPublic && onTogglePublic && (
              <Popover
                content={
                  <PublicLinkPopover
                    isPublic={resume.is_public || false}
                    publicSlug={resume.public_slug || null}
                    resumeId={resume.id}
                    resumeName={resume.name}
                    onTogglePublic={(isPublic, slug) => onTogglePublic(resume.id, isPublic, slug)}
                  />
                }
                title={null}
                trigger="click"
                open={popoverResumeId === resume.id}
                onOpenChange={(open) => onPopoverChange(open ? resume.id : null)}
                placement="bottomRight"
                destroyOnHidden={false}
              >
                <span onClick={(event) => event.stopPropagation()}>
                  <Button
                    type="text"
                    size="small"
                    aria-label={`公开设置 ${resume.name}`}
                    icon={resume.is_public ? <LockOutlined /> : <GlobalOutlined />}
                    disabled={isNavigationPending}
                  />
                </span>
              </Popover>
            )}
            <Button
              type="text"
              size="small"
              aria-label={`打印 ${resume.name}`}
              icon={<PrinterOutlined />}
              loading={exportingId === resume.id}
              disabled={isNavigationPending}
              onClick={(event) => {
                event.stopPropagation()
                onPrint(resume.id)
              }}
            />
            <Button
              type="text"
              size="small"
              danger
              aria-label={`删除 ${resume.name}`}
              icon={<DeleteOutlined />}
              disabled={isNavigationPending}
              onClick={(event) => {
                event.stopPropagation()
                onDelete(resume.id, resume.name)
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
