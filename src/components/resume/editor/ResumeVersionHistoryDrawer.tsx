'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Drawer, Empty, Input, Modal, Space, Spin, Typography } from 'antd'
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

const sourceLabels: Record<ResumeVersion['source'], string> = {
  auto: '自动快照',
  manual: '手动版本',
  restore: '恢复记录',
  application: '求职投递',
}

function formatTime(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('zh-CN', { hour12: false })
}

interface ResumeVersionHistoryDrawerProps {
  open: boolean
  resumeId: string
  revision: number
  onClose: () => void
  onRestored: (resume: Resume) => void
}

export default function ResumeVersionHistoryDrawer({
  open,
  resumeId,
  revision,
  onClose,
  onRestored,
}: ResumeVersionHistoryDrawerProps) {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [label, setLabel] = useState('')
  const [detail, setDetail] = useState<ResumeVersionDetail | null>(null)
  const [restoreCandidate, setRestoreCandidate] = useState<ResumeVersion | null>(null)
  const versions = useQuery({
    queryKey: ['resume-versions', resumeId],
    queryFn: () => getResumeVersions(resumeId),
    enabled: open,
  })
  const createVersion = useMutation({
    mutationFn: () => createResumeVersion(resumeId, label.trim() || undefined),
    onSuccess: () => {
      setLabel('')
      void queryClient.invalidateQueries({ queryKey: ['resume-versions', resumeId] })
    },
    onError: (reason) => message.error(getErrorMessage(reason, '创建版本失败')),
  })
  const loadDetail = useMutation({
    mutationFn: (versionId: string) => getResumeVersion(resumeId, versionId),
    onSuccess: setDetail,
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
    onError: (reason) => message.error(getErrorMessage(reason, '恢复版本失败')),
  })

  return (
    <>
      <Drawer
        title="版本历史"
        open={open}
        onClose={onClose}
        size={460}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">
          手动保存重要节点；恢复会覆盖当前内容，但会生成一个新的版本记录。
        </Typography.Paragraph>
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Input
            aria-label="手动版本标签"
            value={label}
            maxLength={100}
            placeholder="版本标签（可选）"
            onChange={(event) => setLabel(event.target.value)}
            onPressEnter={() => createVersion.mutate()}
          />
          <Button
            type="primary"
            icon={<HistoryOutlined />}
            aria-label="创建手动版本"
            loading={createVersion.isPending}
            onClick={() => createVersion.mutate()}
          >
            保存版本
          </Button>
        </Space.Compact>
        {versions.isLoading ? <Spin aria-label="加载版本历史" /> : (
          versions.data?.items.length ? (
            <ul aria-label="版本记录" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
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
                      {formatTime(version.created_at)}{version.label ? ` · ${version.label}` : ''}
                    </Typography.Text>
                  </div>
                  <Space size={0}>
                    <Button type="link" onClick={() => loadDetail.mutate(version.id)}>查看</Button>
                    <Button type="link" danger onClick={() => setRestoreCandidate(version)}>恢复</Button>
                  </Space>
                </li>
              ))}
            </ul>
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有版本记录" />
        )}
      </Drawer>

      <Modal
        title={detail ? `版本预览 · revision ${detail.revision}` : '版本预览'}
        open={Boolean(detail)}
        onCancel={() => setDetail(null)}
        footer={<Button aria-label="关闭版本预览" onClick={() => setDetail(null)}>关闭</Button>}
        width={860}
      >
        {detail && (() => {
          const preview = getPreviewConfig(detail.snapshot.content.preview_config)
          return (
            <div aria-label="历史版本只读预览" className="resume-a4-preview" style={{ margin: '0 auto' }}>
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
        title="确认恢复此版本？"
        open={Boolean(restoreCandidate)}
        okText="确认恢复"
        okButtonProps={{ danger: true, loading: restore.isPending, icon: <ReloadOutlined /> }}
        cancelText="取消"
        onCancel={() => setRestoreCandidate(null)}
        onOk={() => restoreCandidate && restore.mutate(restoreCandidate.id)}
      >
        恢复会覆盖当前内容，但会产生新的 revision 和恢复记录，不会让 revision 倒退。
      </Modal>
    </>
  )
}
