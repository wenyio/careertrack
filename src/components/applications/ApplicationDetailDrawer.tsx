'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import dayjs from 'dayjs'
import { useQuery } from '@tanstack/react-query'
import { Alert, App, Button, DatePicker, Drawer, Dropdown, Empty, Form, Grid, Input, Segmented, Select, Space, Spin, Tabs, Tag, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DownOutlined, EditOutlined, ExportOutlined, FileTextOutlined, MessageOutlined, UpOutlined } from '@ant-design/icons'
import { ApplicationEventTimeline } from './ApplicationEventTimeline'
import { useJobApplication, useJobApplicationEvents, useJobApplicationMutations } from '@/hooks/useJobApplications'
import { useResume, useResumes } from '@/hooks/useResume'
import { getResumeVersion, getResumeVersions } from '@/services/resume'
import { StandardResumePreview } from '@/components/resume/ResumePreviewShared'
import { APPLICATION_STAGE_ORDER, APPLICATION_STATUS_COLORS, APPLICATION_STATUS_LABELS, nextApplicationStatus, previousApplicationStatus } from '@/lib/job-applications/config'
import { appDateOnlyAfterDays } from '@/lib/app-time'
import { getPreviewConfig } from '@/utils/resume-preview'
import type { JobApplication } from '@/types/job-application'
import { JOB_APPLICATION_STATUSES } from '@/types/job-application'
import type { PriorityNextActionMode } from '@/lib/job-applications/config'
import type { ResumeVersion } from '@/types/resume'
import { DEFAULT_MODULES_ORDER } from '@/config/modules'
import { A4_PAGE_HEIGHT_PX, A4_PAGE_WIDTH_PX } from '@/constants'
import styles from './ApplicationDetailDrawer.module.css'

type ActivityType = 'follow_up' | 'interview' | 'note'
type NextActionMode = PriorityNextActionMode
type EventValues = {
  content?: string
  next_action_at?: dayjs.Dayjs
  next_action_mode?: NextActionMode
  next_status?: JobApplication['status']
  round?: string
  format?: string
  result?: string
}

const activityOptions = [
  { value: 'follow_up', label: '跟进' },
  { value: 'interview', label: '面试' },
  { value: 'note', label: '备注' },
]

function activityCopy(type: ActivityType) {
  if (type === 'interview') return { title: '记录面试', placeholder: '面试重点、反馈或待确认事项', action: '保存面试记录' }
  if (type === 'note') return { title: '添加备注', placeholder: '记录不会改变当前阶段', action: '保存备注' }
  return { title: '记录跟进', placeholder: '例如：已发邮件询问面试安排', action: '保存跟进' }
}

function suggestedStatus(type: ActivityType, status: JobApplication['status']) {
  if (type !== 'interview') return undefined
  const currentIndex = APPLICATION_STAGE_ORDER.indexOf(status)
  const interviewIndex = APPLICATION_STAGE_ORDER.indexOf('interview')
  return currentIndex >= 0 && currentIndex < interviewIndex ? 'interview' : undefined
}

function FitToWidthPreview({ children, compact }: { children: ReactNode; compact: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState(A4_PAGE_WIDTH_PX)
  const [contentHeight, setContentHeight] = useState(A4_PAGE_HEIGHT_PX)
  const [frameHeight, setFrameHeight] = useState(compact ? 520 : 680)

  useEffect(() => {
    const frameEl = frameRef.current
    const measureEl = measureRef.current
    const pageEl = pageRef.current
    if (!frameEl || !measureEl || !pageEl) return
    const update = () => {
      setAvailableWidth(measureEl.clientWidth || A4_PAGE_WIDTH_PX)
      setContentHeight(Math.max(A4_PAGE_HEIGHT_PX, pageEl.scrollHeight || A4_PAGE_HEIGHT_PX))
      const { top } = frameEl.getBoundingClientRect()
      const bottomGap = compact ? 12 : 24
      setFrameHeight(Math.max(compact ? 260 : 360, window.innerHeight - top - bottomGap))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(frameEl)
    observer.observe(measureEl)
    observer.observe(pageEl)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [compact])

  const scale = Math.min(1, Math.max(0.45, availableWidth / A4_PAGE_WIDTH_PX))
  return <div ref={frameRef} style={{ marginTop: 16, height: frameHeight, overflowY: 'auto', overflowX: 'hidden', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa', padding: compact ? 8 : 20 }}>
    <div ref={measureRef} style={{ width: '100%' }}>
      <div style={{ width: A4_PAGE_WIDTH_PX * scale, minHeight: contentHeight * scale, margin: '0 auto' }}>
        <div
          ref={pageRef}
          aria-label="投递简历只读预览"
          className="resume-a4-preview"
          style={{
            width: A4_PAGE_WIDTH_PX,
            minHeight: A4_PAGE_HEIGHT_PX,
            margin: 0,
            background: '#fff',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  </div>
}

export function ApplicationDetailDrawer({ application, open, onClose, onEdit, initialActivity = 'follow_up', initialRecorderOpen = false, initialNextActionMode = 'keep', children }: {
  application: JobApplication | null
  open: boolean
  onClose: () => void
  onEdit: (application: JobApplication) => void
  initialActivity?: ActivityType
  initialRecorderOpen?: boolean
  initialNextActionMode?: NextActionMode
  children?: ReactNode
}) {
  const detail = useJobApplication(application?.id, open)
  const current = detail.data || application
  const { data: events, isError: eventsError, refetch: refetchEvents } = useJobApplicationEvents(current?.id, open)
  const { addEvent, update, remove } = useJobApplicationMutations()
  const { modal } = App.useApp()
  const screens = Grid.useBreakpoint()
  const [activityType, setActivityType] = useState<ActivityType>(initialActivity)
  const [activeTab, setActiveTab] = useState('progress')
  const [recorderOpen, setRecorderOpen] = useState(initialRecorderOpen)
  const [resumeQuery, setResumeQuery] = useState('')
  const [selectedResumeId, setSelectedResumeId] = useState<string | undefined>(() => application?.resume_id || undefined)
  const [selectedResumeVersionId, setSelectedResumeVersionId] = useState<string | undefined>(() => application?.resume_version_id || undefined)
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>([])
  const [resumeVersionsLoading, setResumeVersionsLoading] = useState(false)
  const [resumeVersionsError, setResumeVersionsError] = useState(false)
  const [resumeVersionsRetry, setResumeVersionsRetry] = useState(0)
  const titleNoteKey = `${current?.id || 'closed'}:${current?.notes || ''}`
  const [titleNoteExpansion, setTitleNoteExpansion] = useState({ key: '', expanded: false })
  const [titleNoteOverflow, setTitleNoteOverflow] = useState({ key: '', overflowing: false })
  const titleNoteExpanded = titleNoteExpansion.key === titleNoteKey && titleNoteExpansion.expanded
  const titleNoteOverflowing = titleNoteOverflow.key === titleNoteKey && titleNoteOverflow.overflowing
  const titleNoteRef = useRef<HTMLDivElement>(null)
  const [form] = Form.useForm<EventValues>()
  const nextActionMode = Form.useWatch('next_action_mode', form) || 'keep'
  const linkedStatus = Form.useWatch('next_status', form)
  const { data: resumePage, isError: resumesError, refetch: refetchResumes } = useResumes(1, 20, { enabled: open && activeTab === 'resume', q: resumeQuery })
  const versionSelectValue = selectedResumeVersionId
  const normalizedSelectedResumeId = selectedResumeId || null
  const normalizedSelectedResumeVersionId = normalizedSelectedResumeId ? versionSelectValue || null : null
  const resumeLinkDirty = normalizedSelectedResumeId !== (current?.resume_id || null) || normalizedSelectedResumeVersionId !== (current?.resume_version_id || null)
  const snapshot = useQuery({
    queryKey: ['job-applications', 'snapshot', current?.resume_id, current?.resume_version_id],
    queryFn: () => getResumeVersion(current!.resume_id!, current!.resume_version_id!),
    enabled: open && Boolean(current?.resume_id && current.resume_version_id),
  })
  const selectedSnapshot = useQuery({
    queryKey: ['job-applications', 'selected-snapshot', selectedResumeId, versionSelectValue],
    queryFn: () => getResumeVersion(selectedResumeId!, versionSelectValue!),
    enabled: open && activeTab === 'resume' && Boolean(resumeLinkDirty && selectedResumeId && versionSelectValue),
  })
  const latestResume = useResume(selectedResumeId || '', {
    enabled: open && activeTab === 'resume' && Boolean(selectedResumeId && (!versionSelectValue || snapshot.isError || selectedSnapshot.isError)),
  })

  useEffect(() => {
    const noteEl = titleNoteRef.current
    if (!current?.notes || !noteEl) return
    const measure = () => {
      const computedStyle = window.getComputedStyle(noteEl)
      const fontSize = Number.parseFloat(computedStyle.fontSize) || 12
      const lineHeight = Number.parseFloat(computedStyle.lineHeight) || fontSize * 1.35
      // Some browsers report the clipped height while line-clamp is active.
      const previousDisplay = noteEl.style.display
      const previousMaxHeight = noteEl.style.maxHeight
      const previousOverflow = noteEl.style.overflow
      const previousLineClamp = noteEl.style.getPropertyValue('-webkit-line-clamp')
      noteEl.style.display = 'block'
      noteEl.style.maxHeight = 'none'
      noteEl.style.overflow = 'visible'
      noteEl.style.setProperty('-webkit-line-clamp', 'unset')
      const fullHeight = noteEl.scrollHeight
      noteEl.style.display = previousDisplay
      noteEl.style.maxHeight = previousMaxHeight
      noteEl.style.overflow = previousOverflow
      if (previousLineClamp) {
        noteEl.style.setProperty('-webkit-line-clamp', previousLineClamp)
      } else {
        noteEl.style.removeProperty('-webkit-line-clamp')
      }
      setTitleNoteOverflow({ key: titleNoteKey, overflowing: fullHeight > lineHeight * 2 + 1 })
    }
    const frame = window.requestAnimationFrame(measure)
    const observer = new ResizeObserver(measure)
    observer.observe(noteEl)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [current?.notes, screens.md, titleNoteKey])

  useEffect(() => {
    if (!open || activeTab !== 'resume' || !selectedResumeId) return
    let ignore = false
    const loadVersions = async () => {
      setResumeVersionsLoading(true)
      try {
        const page = await getResumeVersions(selectedResumeId, 1, 20)
        if (ignore) return
        setResumeVersions(page.items || [])
        setResumeVersionsError(false)
      } catch {
        if (ignore) return
        setResumeVersions([])
        setResumeVersionsError(true)
      } finally {
        if (!ignore) setResumeVersionsLoading(false)
      }
    }
    void loadVersions()
    return () => { ignore = true }
  }, [activeTab, open, resumeVersionsRetry, selectedResumeId])

  if (!current) return null
  const copy = activityCopy(activityType)
  const nextStage = nextApplicationStatus(current.status)
  const resetRecorder = (type: ActivityType, status = current.status, nextActionModeValue: NextActionMode = initialNextActionMode) => {
    setActivityType(type)
    form.resetFields()
    form.setFieldsValue({
      next_action_mode: nextActionModeValue,
      next_status: suggestedStatus(type, status),
    })
  }
  const focusRecorder = (type: ActivityType, nextActionModeValue: NextActionMode = 'keep') => {
    resetRecorder(type, current.status, nextActionModeValue)
    setActiveTab('progress')
    setRecorderOpen(true)
  }
  const cancelRecorder = () => {
    resetRecorder(activityType)
    setRecorderOpen(false)
  }
  const submitEvent = async () => {
    const values = await form.validateFields()
    const nextActionAt = activityType === 'note' || values.next_action_mode === 'keep'
      ? undefined
      : values.next_action_mode === 'clear'
        ? null
        : values.next_action_mode === 'snooze'
          ? appDateOnlyAfterDays(3)
          : values.next_action_at?.format('YYYY-MM-DD')
    addEvent.mutate({ id: current.id, data: {
      event_type: activityType,
      content: values.content || null,
      next_action_at: nextActionAt,
      next_status: values.next_status,
      expected_revision: current.revision,
      metadata: activityType === 'interview'
        ? { round: values.round || undefined, format: values.format || undefined, result: values.result || undefined }
        : {},
    } }, { onSuccess: async () => {
      const refreshed = await detail.refetch()
      resetRecorder(activityType, refreshed.data?.status || current.status)
      setRecorderOpen(false)
    } })
  }
  const advance = (direction: 'next' | 'previous') => {
    const status = direction === 'next' ? nextApplicationStatus(current.status) : previousApplicationStatus(current.status)
    if (status) update.mutate({ id: current.id, data: { expected_revision: current.revision, status } })
  }
  const applyTemplate = (content: string) => {
    form.setFieldValue('content', content)
  }
  const snoozeThreeDays = () => {
    update.mutate({
      id: current.id,
      data: { expected_revision: current.revision, next_action_at: appDateOnlyAfterDays(3) },
    })
  }
  const archiveAs = (status: 'rejected' | 'withdrawn') => {
    update.mutate({ id: current.id, data: { expected_revision: current.revision, status } }, { onSuccess: onClose })
  }
  const confirmArchive = (status: 'rejected' | 'withdrawn') => {
    modal.confirm({
      title: status === 'rejected' ? '标记为未通过？' : '标记为已撤回？',
      content: '状态会记录到时间线中，之后仍可在归档状态里查看。',
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => archiveAs(status),
    })
  }
  const confirmDelete = () => {
    modal.confirm({
      title: '删除这条求职申请？',
      content: '删除会移除申请和时间线记录，此操作不可恢复。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => remove.mutate(current.id, { onSuccess: onClose }),
    })
  }
  const resetResumeLink = () => {
    setSelectedResumeId(current.resume_id || undefined)
    setSelectedResumeVersionId(current.resume_version_id || undefined)
    setResumeQuery('')
    setResumeVersionsError(false)
  }
  const saveResumeLink = () => {
    update.mutate({
      id: current.id,
      data: {
        expected_revision: current.revision,
        resume_id: normalizedSelectedResumeId,
        resume_version_id: normalizedSelectedResumeVersionId,
      },
    }, { onSuccess: () => { void detail.refetch() } })
  }
  const visibleSnapshot = resumeLinkDirty && versionSelectValue ? selectedSnapshot : snapshot
  const visiblePreviewData = versionSelectValue ? visibleSnapshot.data : null
  const versionPreview = visiblePreviewData ? getPreviewConfig(visiblePreviewData.snapshot.content.preview_config) : null
  const latestPreview = latestResume.data ? getPreviewConfig(latestResume.data.content.preview_config) : null
  const resumeOptions = [...(resumePage?.items || []).map((resume) => ({ value: resume.id, label: resume.name }))]
  if (current.resume_id && current.resume_name && !resumeOptions.some((option) => option.value === current.resume_id)) {
    resumeOptions.unshift({ value: current.resume_id, label: current.resume_name })
  }
  const versionOptions = resumeVersions.map((version) => ({
    value: version.id,
    label: `r${version.revision} · ${version.source} · ${dayjs(version.created_at).format('YYYY-MM-DD HH:mm')}`,
  }))
  const actionMenu: MenuProps['items'] = [
    { key: 'previous', label: '退回上一阶段', disabled: !previousApplicationStatus(current.status) },
    { type: 'divider' },
    { key: 'rejected', label: '标记未通过', danger: true },
    { key: 'withdrawn', label: '标记已撤回', danger: true },
    { type: 'divider' },
    { key: 'delete', label: '删除申请', danger: true },
  ]
  const handleActionMenu: MenuProps['onClick'] = ({ key }) => {
    if (key === 'previous') advance('previous')
    if (key === 'rejected') confirmArchive('rejected')
    if (key === 'withdrawn') confirmArchive('withdrawn')
    if (key === 'delete') confirmDelete()
  }
  const eventItems = events?.items || []
  const eventTotal = events?.pagination.total || eventItems.length
  const timelineContent = eventsError
    ? <Alert type="error" showIcon title="活动加载失败" action={<Button size="small" onClick={() => void refetchEvents()}>重试</Button>} />
    : <ApplicationEventTimeline events={eventItems} total={eventTotal} limit={8} onViewAll={() => setActiveTab('timeline')} />
  const fullTimelineContent = eventsError
    ? <Alert type="error" showIcon title="活动加载失败" action={<Button size="small" onClick={() => void refetchEvents()}>重试</Button>} />
    : <ApplicationEventTimeline events={eventItems} total={eventTotal} limit={null} />
  const resumeContent = <>
    <div className={styles.resumeLinkPanel}>
      <div className={styles.resumeLinkGrid}>
        <div className={styles.resumeSelectGroup}>
          <Typography.Text type="secondary" className={styles.fieldLabel}>关联简历</Typography.Text>
          <Select
            allowClear
            showSearch={{ filterOption: false, onSearch: setResumeQuery }}
            aria-label="关联简历"
            placeholder="简历"
            style={{ width: '100%' }}
            value={selectedResumeId}
            options={resumeOptions}
            loading={activeTab === 'resume' && !resumePage && !resumesError}
            onChange={(value) => {
              setSelectedResumeId(value || undefined)
              setSelectedResumeVersionId(undefined)
              setResumeVersions([])
              setResumeVersionsLoading(false)
              setResumeVersionsError(false)
              setResumeVersionsRetry(0)
            }}
          />
        </div>
        <div className={styles.versionSelectGroup}>
          <Typography.Text type="secondary" className={styles.fieldLabel}>投递版本</Typography.Text>
          <Select
            allowClear
            aria-label="投递版本"
            disabled={!selectedResumeId}
            placeholder={selectedResumeId ? '当前快照' : '先选简历'}
            style={{ width: '100%' }}
            value={versionSelectValue}
            options={versionOptions}
            loading={resumeVersionsLoading}
            notFoundContent={resumeVersionsLoading ? <Spin size="small" /> : '暂无历史版本，可使用当前快照'}
            onChange={(value) => setSelectedResumeVersionId(value || undefined)}
          />
        </div>
        {resumeLinkDirty && <Space size={8} className={styles.resumeLinkActions}>
          <Button type="primary" size="small" loading={update.isPending} onClick={saveResumeLink}>保存</Button>
          <Button size="small" onClick={resetResumeLink}>取消</Button>
        </Space>}
      </div>
      {resumesError && <Alert style={{ marginTop: 12 }} type="error" showIcon title="简历列表加载失败" action={<Button size="small" onClick={() => void refetchResumes()}>重试</Button>} />}
      {resumeVersionsError && <Alert style={{ marginTop: 12 }} type="error" showIcon title="简历版本加载失败" action={<Button size="small" onClick={() => setResumeVersionsRetry((value) => value + 1)}>重试</Button>} />}
    </div>
    {versionSelectValue && visiblePreviewData && versionPreview
      ? <FitToWidthPreview compact={!screens.md}><StandardResumePreview content={visiblePreviewData.snapshot.content} modulesConfig={visiblePreviewData.snapshot.modules_config} modulesOrder={visiblePreviewData.snapshot.modules_order} template={visiblePreviewData.snapshot.template} fontSize={versionPreview.fontSize} lineHeight={versionPreview.lineHeight} /></FitToWidthPreview>
      : versionSelectValue && visibleSnapshot.isLoading
        ? <div style={{ marginTop: 24 }}><Spin aria-label="加载投递快照" /></div>
        : latestResume.data && latestPreview
          ? <FitToWidthPreview compact={!screens.md}><StandardResumePreview content={latestResume.data.content} modulesConfig={latestResume.data.modules_config} modulesOrder={latestResume.data.modules_order || DEFAULT_MODULES_ORDER} template={latestResume.data.template || 'classic'} fontSize={latestPreview.fontSize} lineHeight={latestPreview.lineHeight} /></FitToWidthPreview>
          : latestResume.isLoading
            ? <div style={{ marginTop: 24 }}><Spin aria-label="加载简历预览" /></div>
            : selectedResumeId
              ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前简历暂无可预览内容" />
              : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择简历后显示预览" />}
  </>
  const metaItems = [
    current.location ? { key: 'location', label: `地点：${current.location}` } : null,
    current.salary ? { key: 'salary', label: `薪资：${current.salary}` } : null,
    current.channel ? { key: 'channel', label: `渠道：${current.channel}` } : null,
    current.applied_at ? { key: 'applied', label: `投递：${current.applied_at}` } : null,
    current.job_url && /^https?:\/\//i.test(current.job_url) ? { key: 'url', label: <a href={current.job_url} target="_blank" rel="noopener noreferrer">职位链接 <ExportOutlined /></a> } : null,
  ].filter(Boolean) as Array<{ key: string; label: ReactNode }>
  const titleNoteCanToggle = current.notes ? titleNoteOverflowing || current.notes.length > (screens.md ? 90 : 44) : false
  const titleMeta = metaItems.length || current.notes ? <Space orientation="vertical" size={1} style={{ display: 'flex' }}>
    {metaItems.length > 0 && <Space wrap size={[10, 2]}>
      {metaItems.map((item) => <Typography.Text key={item.key} type="secondary" style={{ fontSize: 13 }}>{item.label}</Typography.Text>)}
    </Space>}
    {current.notes && <div className={`${styles.titleNote} ${titleNoteExpanded ? styles.titleNoteExpanded : ''}`} aria-label="备注预览">
      <div ref={titleNoteRef} className={`${styles.titleNoteText} ${titleNoteExpanded ? styles.titleNoteTextExpanded : ''}`}><span className={styles.titleNoteLabel}>备注：</span>{current.notes}</div>
      {titleNoteCanToggle && <Button
        type="link"
        size="small"
        className={styles.titleNoteToggle}
        icon={titleNoteExpanded ? <UpOutlined /> : <DownOutlined />}
        aria-expanded={titleNoteExpanded}
        onClick={() => setTitleNoteExpansion({ key: titleNoteKey, expanded: !titleNoteExpanded })}
      >
        {titleNoteExpanded ? '收起' : '展开'}
      </Button>}
    </div>}
  </Space> : undefined
  const nextActionHelp: Record<NextActionMode, string> = {
    keep: current.next_action_at ? `保留当前下一步提醒：${current.next_action_at}` : '保持当前安排，不新增下一步提醒',
    date: '保存后使用新日期作为下一步提醒',
    snooze: '保存后把下一步提醒顺延到 3 天后',
    clear: '保存后清除当前下一步提醒，不影响申请阶段',
  }
  const progressContent = <>
    <section style={{ padding: '8px 0 20px', borderBottom: '1px solid #f0f0f0' }}>
      <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>当前进展</Typography.Title>
      <Space orientation="vertical" size="middle" style={{ display: 'flex' }}>
        <Space wrap size={[12, 8]}>
          <Space size={6}><Typography.Text type="secondary">当前阶段</Typography.Text><Tag color={APPLICATION_STATUS_COLORS[current.status]}>{APPLICATION_STATUS_LABELS[current.status]}</Tag></Space>
          {nextStage && <Typography.Text type="secondary">下一阶段：{APPLICATION_STATUS_LABELS[nextStage]}</Typography.Text>}
          <Typography.Text type={current.next_action_at ? undefined : 'secondary'}>
            <ClockCircleOutlined /> {current.next_action_at ? `下一步：${current.next_action_at}` : '暂无下一步提醒'}
          </Typography.Text>
        </Space>
        <Space wrap size={[8, 8]}>
          <Button type="primary" icon={<MessageOutlined />} onClick={() => focusRecorder('follow_up')}>记录一次进展</Button>
          {nextStage && <Button loading={update.isPending} onClick={() => advance('next')}>推进至{APPLICATION_STATUS_LABELS[nextStage]}</Button>}
          <Button icon={<CalendarOutlined />} loading={update.isPending} onClick={snoozeThreeDays}>顺延 3 天</Button>
          <Dropdown menu={{ items: actionMenu, onClick: handleActionMenu }} trigger={['click']}>
            <Button>更多 <DownOutlined /></Button>
          </Dropdown>
        </Space>
      </Space>
    </section>
    <div style={{ marginTop: 28 }}>
      <Typography.Title level={5} style={{ marginTop: 0 }}>最近动态</Typography.Title>
      {timelineContent}
    </div>
  </>
  const recorderContent = <>
      <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 14 }}>一次提交可以同时记录过程、调整阶段并安排下一步提醒。</Typography.Paragraph>
      <Segmented value={activityType} options={activityOptions} onChange={(value) => resetRecorder(value as ActivityType)} />
      <Form form={form} layout="vertical" preserve={false} initialValues={{ next_action_mode: initialNextActionMode, next_status: suggestedStatus(initialActivity, current.status) }} style={{ marginTop: 16 }}>
        <Form.Item label={copy.title} name="content" rules={[{ required: activityType !== 'interview', message: '请输入活动内容' }, { max: 5000, message: '内容最多 5000 字' }]} style={{ marginBottom: 8 }}>
          <Input.TextArea rows={3} maxLength={5000} showCount placeholder={copy.placeholder} />
        </Form.Item>
        <Space wrap size={[8, 4]} style={{ display: 'flex', marginBottom: 16 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>快捷填充</Typography.Text>
          <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 12 }} onClick={() => applyTemplate('已邮件跟进 HR，等待回复')}>邮件跟进</Button>
          <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 12 }} onClick={() => { resetRecorder('interview'); form.setFieldValue('content', '已完成面试复盘，补充关键问题和下一步准备') }}>面试复盘</Button>
          <Button type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 12 }} onClick={() => applyTemplate('已根据 JD 调整简历，并确认投递版本')}>更新简历版本</Button>
        </Space>
        {activityType === 'interview' && <Space orientation={screens.md ? 'horizontal' : 'vertical'} size="middle" style={{ display: 'flex' }}>
          <Form.Item label="轮次" name="round" rules={[{ required: true, message: '请选择面试轮次' }]} style={{ flex: 1 }}><Select placeholder="选择轮次" options={['一面', '二面', '三面', 'HR 面', '终面'].map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item label="形式" name="format" style={{ flex: 1 }}><Select placeholder="选择形式" options={['线上', '现场', '电话'].map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item label="结果" name="result" style={{ flex: 1 }}><Select placeholder="选择结果" options={['待定', '通过', '未通过', '需补充材料'].map((value) => ({ value, label: value }))} onChange={(value) => form.setFieldValue('next_status', value === '未通过' ? 'rejected' : suggestedStatus('interview', current.status))} /></Form.Item>
        </Space>}
        {activityType !== 'note' && <Form.Item label="同步阶段" name="next_status" extra={linkedStatus ? `保存后阶段将更新为“${APPLICATION_STATUS_LABELS[linkedStatus]}”` : `保持当前阶段“${APPLICATION_STATUS_LABELS[current.status]}”`} style={{ marginBottom: 18 }}><Select allowClear placeholder="保持当前阶段" options={JOB_APPLICATION_STATUSES.filter((value) => value !== current.status).map((value) => ({ value, label: APPLICATION_STATUS_LABELS[value] }))} /></Form.Item>}
        {activityType !== 'note' && <Form.Item label="下一步提醒" name="next_action_mode" extra={nextActionHelp[nextActionMode]} style={{ marginBottom: nextActionMode === 'date' ? 12 : 18 }}><Segmented block={!screens.sm} options={[{ value: 'keep', label: '保持当前' }, { value: 'date', label: '指定日期' }, { value: 'snooze', label: '3 天后提醒' }, { value: 'clear', label: '不再提醒' }]} /></Form.Item>}
        {activityType !== 'note' && nextActionMode === 'date' && <Form.Item label="提醒日期" name="next_action_at" rules={[{ required: true, message: '请选择提醒日期' }]} style={{ marginBottom: 18 }}><DatePicker style={{ width: screens.sm ? 180 : '100%' }} /></Form.Item>}
        <Space wrap size={8}>
          <Button type="primary" icon={activityType === 'interview' ? <CalendarOutlined /> : activityType === 'note' ? <FileTextOutlined /> : linkedStatus ? <CheckCircleOutlined /> : <MessageOutlined />} loading={addEvent.isPending} onClick={() => void submitEvent()}>{linkedStatus ? `${copy.action}并更新阶段` : copy.action}</Button>
          <Button aria-label="取消记录进展" onClick={cancelRecorder}>取消</Button>
        </Space>
      </Form>
  </>

  return <Drawer
    title={<Space orientation="vertical" size={2} style={{ maxWidth: screens.md ? 760 : 'calc(100vw - 128px)' }}>
      <Space size={8} wrap><Typography.Text strong>{current.company}</Typography.Text><Typography.Text type="secondary">{current.position}</Typography.Text></Space>
      {titleMeta}
    </Space>}
    open={open}
    onClose={onClose}
    size="large"
    closable={false}
    push={{ distance: 1 }}
    styles={{ header: { borderBottom: 0, paddingBottom: 8 }, body: { paddingTop: 0, overscrollBehavior: 'contain' } }}
    destroyOnHidden
    extra={<Button size="small" icon={<EditOutlined />} onClick={() => onEdit(current)}>编辑</Button>}
  >
    {detail.isFetching && <Typography.Text type="secondary">正在同步最新进展…</Typography.Text>}
    {detail.isError && <Alert style={{ marginTop: 12 }} type="warning" showIcon title="最新资料加载失败，正在展示已缓存内容" action={<Button size="small" onClick={() => void detail.refetch()}>重试</Button>} />}
    <Tabs
      className={styles.detailTabs}
      activeKey={activeTab}
      onChange={setActiveTab}
      style={{ marginTop: 0 }}
      items={[
        { key: 'progress', label: '进展', children: progressContent },
        { key: 'resume', label: '简历', children: resumeContent },
        { key: 'timeline', label: '时间线', children: fullTimelineContent },
      ]}
    />
    <Drawer
      title="记录一次进展"
      open={recorderOpen}
      onClose={cancelRecorder}
      placement="right"
      size={screens.md ? 540 : 'calc(100vw - 24px)'}
      closable={false}
      push={false}
      destroyOnHidden
      styles={{ header: { paddingBottom: 10 }, body: { paddingTop: 12, overscrollBehavior: 'contain' } }}
    >
      {recorderContent}
    </Drawer>
    {children}
  </Drawer>
}
