/**
 * 简历列表视图组件（正式用户和游客共享）
 *
 * 只负责渲染列表 UI 和本地弹窗状态，不直接调用 API 或 service。
 * 通过 props 接收数据和回调，由父页面决定数据来源和跳转路径。
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Row, Col, Empty, Spin, App, Pagination, Modal } from 'antd'
import { PlusOutlined, UserOutlined } from '@ant-design/icons'
import PageContainer from '@/components/layout/PageContainer'
import { StandardResumePreview } from '@/components/resume/ResumePreviewShared'
import ResumeListCard from './ResumeListCard'
import ResumeCreateModal from './ResumeCreateModal'
import ResumeRenameModal from './ResumeRenameModal'
import { DEFAULT_MODULES_ORDER } from '@/types/resume'
import type { ResumeListResume } from './ResumeListCard'
import type { Profile } from '@/types/profile'
import type { PaginationMeta } from '@/types/pagination'
import { useI18n } from '@/i18n'

interface ResumeListViewProps {
  /** 简历列表数据 */
  resumes: ResumeListResume[]
  /** 个人信息（用于缩略图预览） */
  profile?: Profile | null
  /** 加载状态 */
  isLoading: boolean
  /** 页面标题 */
  title: string
  /** 页面副标题 */
  subtitle: string
  /** 是否显示公开链接相关 UI */
  showPublic: boolean
  /** 创建弹窗是否显示"从个人信息初始化"选项 */
  showInitFromProfile: boolean
  /** 点击简历卡片/名称的跳转回调 */
  onEdit: (id: string) => void
  /** 点击缩略图预览回调，返回完整简历正文用于只读预览 */
  onPreview: (id: string) => Promise<ResumeListResume | null>
  /** 创建简历回调 */
  onCreate: (name: string, initFromProfile: boolean) => void
  /** 删除简历回调 */
  onDelete: (id: string, name: string) => void
  /** 复制简历回调 */
  onDuplicate: (id: string) => void
  /** 重命名简历回调 */
  onRename: (id: string, name: string) => void
  /** 打印简历回调，返回 Promise 以控制 loading 状态 */
  onPrint: (id: string) => Promise<void>
  /** 公开/取消公开回调（仅正式用户） */
  onTogglePublic?: (resumeId: string, isPublic: boolean, slug?: string) => void
  /** 创建中状态 */
  isCreating?: boolean
  /** 服务端分页信息；游客本地列表不传。 */
  pagination?: PaginationMeta
  onPageChange?: (page: number, pageSize: number) => void
}

export default function ResumeListView({
  resumes,
  profile,
  isLoading,
  title,
  subtitle,
  showPublic,
  showInitFromProfile,
  onEdit,
  onPreview,
  onCreate,
  onDelete,
  onDuplicate,
  onRename,
  onPrint,
  onTogglePublic,
  isCreating,
  pagination,
  onPageChange,
}: ResumeListViewProps) {
  const { message, modal } = App.useApp()
  const { t } = useI18n()
  const router = useRouter()

  // 弹窗状态
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [renameModalVisible, setRenameModalVisible] = useState(false)
  const [renamingResumeId, setRenamingResumeId] = useState<string | null>(null)
  const [renamingResumeName, setRenamingResumeName] = useState('')
  const [popoverResumeId, setPopoverResumeId] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [navigatingResumeId, setNavigatingResumeId] = useState<string | null>(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewResume, setPreviewResume] = useState<ResumeListResume | null>(null)
  const isNavigationPending = Boolean(navigatingResumeId)

  // 创建简历
  const handleCreate = (name: string, initFromProfile: boolean) => {
    if (!name.trim()) {
      message.warning(t('resume.nameRequired'))
      return
    }
    onCreate(name.trim(), initFromProfile)
    setCreateModalVisible(false)
  }

  // 删除简历（带确认弹窗）
  const handleDelete = (id: string, name: string) => {
    modal.confirm({
      title: t('resume.confirmDeleteTitle'),
      content: t('resume.confirmDeleteContent', { name }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => onDelete(id, name),
    })
  }

  // 重命名简历
  const handleRenameClick = (id: string, name: string) => {
    setRenamingResumeId(id)
    setRenamingResumeName(name)
    setRenameModalVisible(true)
  }

  const handleRenameOk = (id: string, name: string) => {
    if (!name.trim()) {
      message.warning(t('resume.nameRequired'))
      return
    }
    onRename(id, name.trim())
    setRenameModalVisible(false)
    setRenamingResumeId(null)
    setRenamingResumeName('')
  }

  // 打印简历
  const handlePrint = async (id: string) => {
    setExportingId(id)
    try {
      await onPrint(id)
    } catch {
      // 错误由父页面处理
    } finally {
      setExportingId(null)
    }
  }

  const handleEdit = (id: string) => {
    if (navigatingResumeId) return
    setPopoverResumeId(null)
    setNavigatingResumeId(id)
    onEdit(id)
  }

  const handlePreview = async (id: string) => {
    setPreviewModalOpen(true)
    setPreviewLoading(true)
    setPreviewResume(null)
    try {
      const resume = await onPreview(id)
      if (!resume?.content || !resume.modules_config) {
        message.warning(t('resume.previewUnavailable'))
        setPreviewModalOpen(false)
        return
      }
      setPreviewResume(resume)
    } catch {
      message.error(t('resume.previewFailed'))
      setPreviewModalOpen(false)
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <PageContainer
      size="lg"
      title={title}
      subtitle={subtitle}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          {t('resume.newResume')}
        </Button>
      }
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <Spin size="large" />
        </div>
      ) : resumes.length > 0 ? (
        <>
          <Row gutter={[20, 16]}>
            {resumes.map((resume) => (
              <Col key={resume.id} xs={24} sm={24} md={12} lg={12} xl={8}>
                <ResumeListCard
                  resume={resume}
                  profile={profile}
                  showPublic={showPublic}
                  popoverResumeId={popoverResumeId}
                  exportingId={exportingId}
                  isNavigating={navigatingResumeId === resume.id}
                  isNavigationPending={isNavigationPending}
                  onEdit={handleEdit}
                  onPreview={handlePreview}
                  onRename={handleRenameClick}
                  onDuplicate={onDuplicate}
                  onDelete={handleDelete}
                  onPrint={handlePrint}
                  onTogglePublic={onTogglePublic}
                  onPopoverChange={setPopoverResumeId}
                />
              </Col>
            ))}
          </Row>
          {pagination && onPageChange && pagination.total > pagination.page_size && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
              <Pagination
                current={pagination.page}
                pageSize={pagination.page_size}
                total={pagination.total}
                pageSizeOptions={[12, 24, 48]}
                showSizeChanger
                showTotal={(total) => t('resume.total', { total })}
                onChange={onPageChange}
              />
            </div>
          )}
        </>
      ) : (
        <Empty description={t('resume.empty')} style={{ marginTop: 120 }}>
          {showInitFromProfile && (
            <Button
              icon={<UserOutlined />}
              style={{ marginBottom: 12 }}
              onClick={() => router.push('/profile')}
            >
              {t('resume.completeProfileFirst')}
            </Button>
          )}
          <div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              {t('resume.firstResume')}
            </Button>
          </div>
        </Empty>
      )}

      {/* 创建简历弹窗 */}
      <ResumeCreateModal
        key={createModalVisible ? 'create-open' : 'create-closed'}
        open={createModalVisible}
        confirmLoading={isCreating}
        showInitFromProfile={showInitFromProfile}
        onOk={handleCreate}
        onCancel={() => setCreateModalVisible(false)}
      />

      {/* 重命名简历弹窗 */}
      <ResumeRenameModal
        key={renamingResumeId || 'rename-closed'}
        open={renameModalVisible}
        resumeId={renamingResumeId}
        initialName={renamingResumeName}
        onOk={handleRenameOk}
        onCancel={() => {
          setRenameModalVisible(false)
          setRenamingResumeId(null)
          setRenamingResumeName('')
        }}
      />

      <Modal
        open={previewModalOpen}
        title={previewResume?.name || t('resume.previewTitle')}
        footer={null}
        width={920}
        centered
        destroyOnHidden
        onCancel={() => {
          setPreviewModalOpen(false)
          setPreviewResume(null)
        }}
      >
        <div className="resume-list-preview-modal-body">
          {previewLoading ? (
            <div style={{ minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spin />
            </div>
          ) : previewResume?.content && previewResume.modules_config ? (
            <div
              aria-label={t('resume.readonlyPreview')}
              className="resume-a4-preview resume-list-preview-document"
            >
              <StandardResumePreview
                content={previewResume.content}
                modulesConfig={previewResume.modules_config}
                modulesOrder={previewResume.modules_order || DEFAULT_MODULES_ORDER}
                template={previewResume.template || 'classic'}
                profile={profile ?? undefined}
              />
            </div>
          ) : null}
        </div>
      </Modal>
    </PageContainer>
  )
}
