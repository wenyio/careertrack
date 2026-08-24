'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Drawer, Empty, Input, Modal, Pagination, Space, Spin, Typography } from 'antd'
import { HistoryOutlined, ReloadOutlined } from '@ant-design/icons'
import { StandardResumePreview } from '@/components/resume/ResumePreviewShared'
import {
  createResumeVersion,
  getResumeVersion,
  getResumeVersions,
  restoreResumeVersion,
} from '@/services/resume'
import { resumeQueryKey } from '@/hooks/useResume'
import type { Resume, ResumeVersion, ResumeVersionDetail } from '@/types/resume'
import { getPreviewConfig } from '@/utils/resume-preview'
import { getErrorMessage } from '@/utils/error'
import { useI18n } from '@/i18n'

function formatTime(value: string, locale: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(locale, { hour12: false })
}

interface ResumeVersionHistoryDrawerProps {
  open: boolean
  resumeId: string
  revision: number
  onClose: () => void
  onRestored: (resume: Resume) => void
  flushCurrentSave?: () => Promise<number>
}

export default function ResumeVersionHistoryDrawer({
  open,
  resumeId,
  revision,
  onClose,
  onRestored,
  flushCurrentSave,
}: ResumeVersionHistoryDrawerProps) {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { locale, t } = useI18n()
  const [label, setLabel] = useState('')
  const [detail, setDetail] = useState<ResumeVersionDetail | null>(null)
  const [restoreCandidate, setRestoreCandidate] = useState<ResumeVersion | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const versions = useQuery({
    queryKey: ['resume-versions', resumeId, page, pageSize],
    queryFn: () => getResumeVersions(resumeId, page, pageSize),
    enabled: open,
  })
  const pagination = versions.data?.pagination

  useEffect(() => {
    if (!pagination) return
    const lastPage = Math.max(1, pagination.total_pages)
    if (page <= lastPage) return
    // Defer the correction until after React commits the stale page response.
    // This refetches the final valid page when retention or a refresh shrinks it.
    const timer = window.setTimeout(() => setPage(lastPage), 0)
    return () => window.clearTimeout(timer)
  }, [page, pagination])

  const handleClose = () => {
    setPage(1)
    setDetail(null)
    onClose()
  }

  const createVersion = useMutation({
    mutationFn: async () => {
      if (!flushCurrentSave) throw new Error(t('resumeEditor.versionUnsupported'))
      const expectedRevision = await flushCurrentSave()
      return createResumeVersion(resumeId, {
        expected_revision: expectedRevision,
        label: label.trim() || undefined,
      })
    },
    onSuccess: () => {
      setLabel('')
      setPage(1)
      void queryClient.invalidateQueries({ queryKey: ['resume-versions', resumeId] })
    },
    onError: (reason) => message.error(getErrorMessage(reason, t('resumeEditor.versionCreateFailed'))),
  })
  const loadDetail = useMutation({
    mutationFn: (versionId: string) => getResumeVersion(resumeId, versionId),
    onSuccess: setDetail,
    onError: (reason) => message.error(getErrorMessage(reason, t('resumeEditor.versionDetailFailed'))),
  })
  const restore = useMutation({
    mutationFn: (versionId: string) => restoreResumeVersion(resumeId, versionId, revision),
    onSuccess: (restored) => {
      queryClient.setQueryData(resumeQueryKey(resumeId), restored)
      void queryClient.invalidateQueries({ queryKey: ['resumes'] })
      void queryClient.invalidateQueries({ queryKey: ['resume-versions', resumeId] })
      onRestored(restored)
      setRestoreCandidate(null)
      setDetail(null)
    },
    onError: (reason) => message.error(getErrorMessage(reason, t('resumeEditor.versionRestoreFailed'))),
  })
  const sourceLabels: Record<ResumeVersion['source'], string> = {
    auto: t('resumeEditor.versionSourceAuto'),
    manual: t('resumeEditor.versionSourceManual'),
    restore: t('resumeEditor.versionSourceRestore'),
    application: t('resumeEditor.versionSourceApplication'),
  }

  return (
    <>
      <Drawer
        title={t('resumeEditor.versionHistory')}
        open={open}
        onClose={handleClose}
        size={460}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">
          {t('resumeEditor.versionDescription')}
        </Typography.Paragraph>
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Input
            aria-label={t('resumeEditor.versionLabelAria')}
            value={label}
            maxLength={100}
            placeholder={t('resumeEditor.versionLabelPlaceholder')}
            onChange={(event) => setLabel(event.target.value)}
            onPressEnter={() => !createVersion.isPending && createVersion.mutate()}
            disabled={createVersion.isPending}
          />
          <Button
            type="primary"
            icon={<HistoryOutlined />}
            aria-label={t('resumeEditor.createManualVersion')}
            loading={createVersion.isPending}
            disabled={!flushCurrentSave}
            onClick={() => createVersion.mutate()}
          >
            {createVersion.isPending ? t('resumeEditor.creatingVersion') : t('resumeEditor.saveVersion')}
          </Button>
        </Space.Compact>
        {createVersion.isPending && (
          <Typography.Paragraph type="secondary">{t('resumeEditor.creatingVersionHint')}</Typography.Paragraph>
        )}
        {versions.isLoading ? <Spin aria-label={t('resumeEditor.loadingVersionHistory')} /> : versions.isError ? (
          <Alert
            type="error"
            showIcon
            title={t('resumeEditor.versionHistoryLoadFailed')}
            action={<Button size="small" onClick={() => versions.refetch()}>{t('common.retry')}</Button>}
          />
        ) : (
          versions.data?.items.length ? (
            <ul aria-label={t('resumeEditor.versionRecords')} style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {versions.data.items.map((version) => (
                <li
                  key={version.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '12px 0',
                    borderBottom: '1px solid var(--ant-color-border-secondary)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Typography.Text strong>
                      {sourceLabels[version.source]} · revision {version.revision}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ display: 'block' }}>
                      {formatTime(version.created_at, locale)}{version.label ? ` · ${version.label}` : ''}
                    </Typography.Text>
                  </div>
                  <Space size={0}>
                    <Button
                      type="link"
                      aria-label={t('resumeEditor.viewVersionAria', { revision: version.revision, label: version.label ? ` ${version.label}` : '' })}
                      onClick={() => loadDetail.mutate(version.id)}
                    >{t('resumeEditor.viewVersion')}</Button>
                    <Button
                      type="link"
                      danger
                      aria-label={t('resumeEditor.restoreVersionAria', { revision: version.revision, label: version.label ? ` ${version.label}` : '' })}
                      onClick={() => setRestoreCandidate(version)}
                    >{t('resumeEditor.restoreVersion')}</Button>
                  </Space>
                </li>
              ))}
            </ul>
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('resumeEditor.noVersionRecords')} />
        )}
        {pagination && pagination.total > 0 && (
          <nav aria-label={t('resumeEditor.versionHistoryPagination')}>
            <Pagination
              style={{ marginTop: 16 }}
              current={page}
              pageSize={pageSize}
              total={pagination.total}
              showSizeChanger
              onChange={(nextPage, nextPageSize) => {
                setPage(nextPage)
                setPageSize(nextPageSize)
              }}
            />
          </nav>
        )}
      </Drawer>

      <Modal
        title={detail ? t('resumeEditor.versionPreviewWithRevision', { revision: detail.revision }) : t('resumeEditor.versionPreview')}
        open={Boolean(detail)}
        onCancel={() => setDetail(null)}
        footer={<Button aria-label={t('resumeEditor.closeVersionPreview')} onClick={() => setDetail(null)}>{t('common.close')}</Button>}
        width={860}
      >
        {detail && (() => {
          const preview = getPreviewConfig(detail.snapshot.content.preview_config)
          return (
            <div aria-label={t('resumeEditor.readonlyVersionPreview')} className="resume-a4-preview" style={{ margin: '0 auto' }}>
              <StandardResumePreview
                content={detail.snapshot.content}
                modulesConfig={detail.snapshot.modules_config}
                modulesOrder={detail.snapshot.modules_order}
                template={detail.snapshot.template}
                fontSize={preview.fontSize}
                lineHeight={preview.lineHeight}
              />
            </div>
          )
        })()}
      </Modal>

      <Modal
        title={t('resumeEditor.confirmRestoreVersionTitle')}
        open={Boolean(restoreCandidate)}
        okText={t('resumeEditor.confirmRestoreVersion')}
        okButtonProps={{ danger: true, loading: restore.isPending, icon: <ReloadOutlined /> }}
        cancelText={t('common.cancel')}
        onCancel={() => setRestoreCandidate(null)}
        onOk={() => restoreCandidate && restore.mutate(restoreCandidate.id)}
      >
        {t('resumeEditor.confirmRestoreVersionContent')}
      </Modal>
    </>
  )
}
