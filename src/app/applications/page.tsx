'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Alert, App, Button, Card, DatePicker, Drawer, Dropdown, Empty, Form, Grid, Input, Pagination, Select, Space, Spin, Statistic, Tabs, Tag, Typography } from 'antd'
import { CalendarOutlined, ClockCircleOutlined, EllipsisOutlined, ExportOutlined, MessageOutlined, PlusOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/useAuthStore'
import { useJobApplicationActions, useJobApplicationMutations, useJobApplicationSummary, useJobApplications } from '@/hooks/useJobApplications'
import { useResumes } from '@/hooks/useResume'
import { getResumeVersions } from '@/services/resume'
import type { CreateJobApplicationRequest, JobApplication, JobApplicationSort, JobApplicationStatus } from '@/types/job-application'
import { JOB_APPLICATION_STATUSES } from '@/types/job-application'
import { APPLICATION_STAGE_ORDER, APPLICATION_STATUS_COLORS as STATUS_COLORS, getPriorityActionPolicy } from '@/lib/job-applications/config'
import type { PriorityBucket, PriorityNextActionMode } from '@/lib/job-applications/config'
import { appTodayDateOnly } from '@/lib/app-time'
import { ApplicationDetailDrawer } from '@/components/applications/ApplicationDetailDrawer'
import PageContainer from '@/components/layout/PageContainer'
import { useI18n } from '@/i18n'
import styles from './applications.module.css'

type ApplicationFormValues = Omit<CreateJobApplicationRequest, 'applied_at' | 'next_action_at'> & {
  applied_at?: dayjs.Dayjs
  next_action_at?: dayjs.Dayjs
}

function toPayload(values: ApplicationFormValues): CreateJobApplicationRequest {
  return {
    ...values,
    job_url: values.job_url || null,
    location: values.location || null,
    channel: values.channel || null,
    salary: values.salary || null,
    notes: values.notes || null,
    applied_at: values.applied_at?.format('YYYY-MM-DD') || null,
    next_action_at: values.next_action_at?.format('YYYY-MM-DD') || null,
    resume_id: values.resume_id || null,
    resume_version_id: values.resume_version_id || null,
  }
}

function companyAvatarText(company: string) {
  const value = company.trim()
  if (!value) return '?'

  const cjk = value.match(/[\u3400-\u9fff]/g)
  if (cjk?.length) return cjk.slice(0, 2).join('')

  const words = value.match(/[A-Za-z0-9]+/g) || []
  if (words.length >= 3) return words.slice(0, 3).map((word) => word[0]).join('').toUpperCase()

  const compact = words.join('')
  if (compact) return compact.slice(0, 3).toUpperCase()

  return Array.from(value).slice(0, 2).join('')
}

function companyAvatarTone(company: string) {
  let hash = 0
  for (const char of company) hash = (hash * 31 + char.charCodeAt(0)) % 6
  return hash
}

function ApplicationForm({ application, open, onClose, nested = false }: { application: JobApplication | null; open: boolean; onClose: () => void; nested?: boolean }) {
  const [form] = Form.useForm<ApplicationFormValues>()
  const screens = Grid.useBreakpoint()
  const { t } = useI18n()
  const { create, update } = useJobApplicationMutations()
  const [resumeQuery, setResumeQuery] = useState('')
  const { data: resumePage, isError: resumesError, refetch: refetchResumes } = useResumes(1, 20, { enabled: open, q: resumeQuery })
  const [resumeId, setResumeId] = useState<string | null | undefined>()
  const [versions, setVersions] = useState<Array<{ id: string; revision: number; source: string; created_at: string }>>([])
  const [versionsError, setVersionsError] = useState(false)

  const effectiveResumeId = resumeId === undefined ? application?.resume_id || undefined : resumeId || undefined

  const loadVersions = useCallback(async (id: string) => {
    try {
      const first = await getResumeVersions(id, 1, 20)
      setVersions(first.items || [])
      setVersionsError(false)
    } catch {
      setVersions([])
      setVersionsError(true)
    }
  }, [])

  useEffect(() => {
    if (open && effectiveResumeId) void Promise.resolve().then(() => loadVersions(effectiveResumeId))
  }, [effectiveResumeId, loadVersions, open])

  const submit = async () => {
    const values = await form.validateFields()
    const payload = toPayload(values)
    if (application) {
      // Keep an existing application snapshot immutable during ordinary edits.
      // Re-sending the unchanged IDs would needlessly re-run ownership checks
      // and makes an unrelated status/date update depend on historical links.
      if (
        payload.resume_id === application.resume_id
        && payload.resume_version_id === application.resume_version_id
      ) {
        delete payload.resume_id
        delete payload.resume_version_id
      }
      update.mutate({ id: application.id, data: { ...payload, expected_revision: application.revision } }, { onSuccess: onClose })
    } else {
      create.mutate(payload, { onSuccess: onClose })
    }
  }

  const statusLabel = (status: JobApplicationStatus) => t(`applications.status.${status}`)
  const formContent = <Form form={form} layout="vertical" requiredMark={false} initialValues={application ? {
      ...application,
      applied_at: application.applied_at ? dayjs(application.applied_at) : undefined,
      next_action_at: application.next_action_at ? dayjs(application.next_action_at) : undefined,
    } : { status: 'wishlist' }}>
      <Typography.Title level={5}>{t('applications.jobInfo')}</Typography.Title>
      <Space size="middle" orientation={screens.md ? 'horizontal' : 'vertical'} style={{ display: 'flex' }}>
        <Form.Item label={t('applications.company')} name="company" rules={[{ required: true, message: t('applications.companyRequired') }, { max: 120, message: t('applications.companyMax') }]} style={{ flex: 1 }}><Input autoFocus /></Form.Item>
        <Form.Item label={t('applications.position')} name="position" rules={[{ required: true, message: t('applications.positionRequired') }, { max: 120, message: t('applications.positionMax') }]} style={{ flex: 1 }}><Input /></Form.Item>
      </Space>
      <Typography.Title level={5}>{t('applications.progressAndFollowUp')}</Typography.Title>
      <Space size="middle" orientation={screens.md ? 'horizontal' : 'vertical'} style={{ display: 'flex' }}>
        <Form.Item label={t('applications.statusLabel')} name="status" rules={[{ required: true }]} style={{ flex: 1 }}><Select options={JOB_APPLICATION_STATUSES.map((value) => ({ value, label: statusLabel(value) }))} /></Form.Item>
        <Form.Item label={t('applications.appliedDate')} name="applied_at" style={{ flex: 1 }}><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item label={t('applications.nextFollowUp')} name="next_action_at" style={{ flex: 1 }}><DatePicker style={{ width: '100%' }} /></Form.Item>
      </Space>
      <Form.Item label={t('applications.jobUrl')} name="job_url" rules={[{
        validator: async (_rule, value) => {
          if (!value || /^https?:\/\//i.test(value)) return
          throw new Error(t('applications.jobUrlInvalid'))
        },
      }]}><Input placeholder="https://example.com/jobs/123" /></Form.Item>
      <Space size="middle" orientation={screens.md ? 'horizontal' : 'vertical'} style={{ display: 'flex' }}>
        <Form.Item label={t('applications.location')} name="location" rules={[{ max: 120 }]} style={{ flex: 1 }}><Input /></Form.Item>
        <Form.Item label={t('applications.channel')} name="channel" rules={[{ max: 80 }]} style={{ flex: 1 }}><Input placeholder={t('applications.channelPlaceholder')} /></Form.Item>
        <Form.Item label={t('applications.salary')} name="salary" rules={[{ max: 80 }]} style={{ flex: 1 }}><Input /></Form.Item>
      </Space>
      <Typography.Title level={5}>{t('applications.resumeAndNotes')}</Typography.Title>
      {resumesError && <Alert type="error" showIcon title={t('applications.resumesLoadFailed')} action={<Button size="small" onClick={() => void refetchResumes()}>{t('common.retry')}</Button>} />}
      {versionsError && effectiveResumeId && <Alert type="error" showIcon title={t('applications.versionsLoadFailed')} action={<Button size="small" onClick={() => void loadVersions(effectiveResumeId)}>{t('common.retry')}</Button>} />}
      <div className={styles.resumeEditPanel}>
        <div className={styles.resumeEditGrid}>
          <div className={styles.resumeInlineField}>
            <Typography.Text type="secondary" className={styles.inlineLabel}>{t('applications.linkedResume')}</Typography.Text>
            <Form.Item name="resume_id" style={{ marginBottom: 0 }}><Select allowClear showSearch={{ filterOption: false, onSearch: setResumeQuery }} aria-label={t('applications.linkedResume')} placeholder={t('applications.selectResume')} style={{ width: '100%' }} options={(resumePage?.items || []).map((resume) => ({ value: resume.id, label: resume.name }))} onChange={(value) => { setResumeId(value || null); setVersions([]); setVersionsError(false); form.setFieldValue('resume_version_id', undefined) }} /></Form.Item>
          </div>
          <div className={styles.versionInlineField}>
            <Typography.Text type="secondary" className={styles.inlineLabel}>{t('applications.resumeVersion')}</Typography.Text>
            <Form.Item name="resume_version_id" style={{ marginBottom: 0 }}><Select allowClear disabled={!effectiveResumeId} aria-label={t('applications.resumeVersionAria')} placeholder={effectiveResumeId ? t('applications.currentSnapshot') : t('applications.selectResumeFirst')} style={{ width: '100%' }} options={versions.map((version) => ({ value: version.id, label: `r${version.revision} · ${version.source} · ${dayjs(version.created_at).format('YYYY-MM-DD HH:mm')}` }))} /></Form.Item>
          </div>
        </div>
      </div>
      <Form.Item label={t('applications.notes')} name="notes" rules={[{ max: 5000, message: t('applications.notesMax') }]}><Input.TextArea rows={3} showCount maxLength={5000} placeholder={t('applications.notesPlaceholder')} /></Form.Item>
    </Form>

  return <Drawer
    title={<Space orientation="vertical" size={0}><Typography.Text strong>{application ? t('applications.editApplication') : t('applications.newApplication')}</Typography.Text><Typography.Text type="secondary">{application ? t('applications.editApplicationSubtitle') : t('applications.newApplicationSubtitle')}</Typography.Text></Space>}
    open={open}
    onClose={onClose}
    placement="right"
    size={nested ? (screens.md ? 720 : 'calc(100vw - 28px)') : 'large'}
    closable={false}
    styles={{ body: { overscrollBehavior: 'contain' } }}
    destroyOnHidden
    extra={<Space><Button onClick={onClose}>{t('common.cancel')}</Button><Button type="primary" onClick={submit} loading={create.isPending || update.isPending}>{application ? t('applications.saveChanges') : t('applications.createApplication')}</Button></Space>}
  >
    {formContent}
  </Drawer>
}

type ApplicationView = 'recent' | 'all'
type ActivityType = 'follow_up' | 'interview' | 'note'
type PriorityItem = {
  item: JobApplication
  bucket: PriorityBucket
  tone: 'error' | 'warning' | 'processing' | 'default'
  label: string
  description: string
}

export default function ApplicationsPage() {
  const router = useRouter()
  const { modal } = App.useApp()
  const { t } = useI18n()
  const { isAuthenticated, sessionReady } = useAuthStore()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | JobApplicationStatus>('all')
  const [sort, setSort] = useState<JobApplicationSort>('next_action')
  const [view, setView] = useState<ApplicationView>('recent')
  const [editing, setEditing] = useState<JobApplication | null | undefined>(undefined)
  const [detail, setDetail] = useState<JobApplication | null>(null)
  const [detailActivity, setDetailActivity] = useState<ActivityType>('follow_up')
  const [detailRecorderOpen, setDetailRecorderOpen] = useState(false)
  const [detailNextActionMode, setDetailNextActionMode] = useState<PriorityNextActionMode>('keep')
  const priorityRef = useRef<HTMLDivElement>(null)

  const queryOptions = useMemo(() => ({
    page: view === 'all' ? page : 1,
    pageSize: view === 'recent' ? 5 : 20,
    q,
    status: view === 'all' ? status : 'all' as const,
    sort: view === 'recent' ? 'updated' as const : sort,
  }), [page, q, sort, status, view])
  const { data, isLoading, isError, refetch } = useJobApplications(queryOptions)
  const { data: summary, isError: isSummaryError, refetch: refetchSummary } = useJobApplicationSummary()
  const { data: actions, isError: isActionsError, isLoading: isActionsLoading, refetch: refetchActions } = useJobApplicationActions()
  const { remove } = useJobApplicationMutations()

  useEffect(() => {
    if (sessionReady && !isAuthenticated) router.replace('/auth/login')
  }, [isAuthenticated, router, sessionReady])
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setQ(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  const applications = data?.items || []
  const statusLabel = useCallback((value: JobApplicationStatus) => t(`applications.status.${value}`), [t])
  const filters = useMemo(() => JOB_APPLICATION_STATUSES.map((value) => ({ value, label: statusLabel(value) })), [statusLabel])
  const today = appTodayDateOnly()
  const isActionable = (item: JobApplication) => APPLICATION_STAGE_ORDER.slice(0, 4).includes(item.status)
  const allPriorityItems: PriorityItem[] = [
    ...(actions?.overdue.items || []).map((item) => ({ item, bucket: 'overdue' as const, tone: 'error' as const, label: t('applications.priority.overdue'), description: t('applications.priority.overdueDescription', { date: item.next_action_at || '' }) })),
    ...(actions?.due_today.items || []).map((item) => ({ item, bucket: 'due_today' as const, tone: 'warning' as const, label: t('applications.priority.dueToday'), description: t('applications.priority.dueTodayDescription') })),
    ...(actions?.upcoming.items || []).map((item) => ({ item, bucket: 'upcoming' as const, tone: 'processing' as const, label: t('applications.priority.upcoming'), description: t('applications.priority.upcomingDescription', { date: item.next_action_at || '' }) })),
    ...(actions?.unplanned.items || []).map((item) => ({ item, bucket: 'unplanned' as const, tone: 'default' as const, label: t('applications.priority.unplanned'), description: t('applications.priority.unplannedDescription') })),
  ]
  // Show only the highest-priority items here; the full set stays manageable in the list below.
  const priorityItems = allPriorityItems.slice(0, 5)

  if (!sessionReady || !isAuthenticated) return null

  const openDetail = (item: JobApplication, activity: ActivityType = 'follow_up', recorderOpen = false, nextActionMode: PriorityNextActionMode = 'keep') => {
    setDetailActivity(activity)
    setDetailRecorderOpen(recorderOpen)
    setDetailNextActionMode(nextActionMode)
    setDetail(item)
  }
  const changeView = (nextView: ApplicationView) => {
    setView(nextView)
    setPage(1)
    if (nextView !== 'all') setStatus('all')
  }
  const filterByStatus = (nextStatus: JobApplicationStatus | 'all') => {
    setStatus(nextStatus)
    setView('all')
    setPage(1)
  }
  const clearFilters = () => {
    setSearchInput('')
    setQ('')
    setStatus('all')
    setPage(1)
  }
  const confirmRemove = (item: JobApplication) => {
    modal.confirm({
      title: t('applications.confirmDeleteTitle', { company: item.company }),
      content: t('applications.confirmDeleteContent'),
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => remove.mutateAsync(item.id),
    })
  }

  const renderApplicationCard = (item: JobApplication) => {
    const overdue = Boolean(item.next_action_at && item.next_action_at < today && isActionable(item))
    const avatarClassName = `${styles.companyAvatar} ${styles[`companyAvatarTone${companyAvatarTone(item.company)}`]}`
    return <div
      key={item.id}
      className={`${styles.applicationRow} ${overdue ? styles.applicationRowOverdue : ''}`}
      role="button"
      tabIndex={0}
      aria-label={t('applications.openDetailAria', { company: item.company })}
      onClick={() => openDetail(item)}
      onKeyDown={(event) => {
        if (event.currentTarget !== event.target) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openDetail(item)
        }
      }}
    >
      <span className={avatarClassName} aria-hidden="true">{companyAvatarText(item.company)}</span>
      <Space orientation="vertical" size={5} className={styles.applicationMain}>
        <Space wrap size={8}>
          <Typography.Text strong>{item.company}</Typography.Text>
          <Typography.Text type="secondary">{item.position}</Typography.Text>
          <Tag color={STATUS_COLORS[item.status]}>{statusLabel(item.status)}</Tag>
          {overdue && <Tag color="error">{t('applications.overdueTag')}</Tag>}
        </Space>
        <Space wrap separator={<span>·</span>}>
          <span>{item.location || t('applications.locationEmpty')}</span>
          {item.salary && <span>{t('applications.salaryPrefix', { salary: item.salary })}</span>}
          {item.channel && <span>{t('applications.channelPrefix', { channel: item.channel })}</span>}
          {item.applied_at && <span>{t('applications.appliedPrefix', { date: item.applied_at })}</span>}
          {item.next_action_at ? <Typography.Text strong={overdue}><CalendarOutlined /> {t('applications.nextStepPrefix', { date: item.next_action_at })}</Typography.Text> : <Typography.Text type="secondary">{t('applications.nextStepEmpty')}</Typography.Text>}
          {item.job_url && /^https?:\/\//i.test(item.job_url) && <a href={item.job_url} target="_blank" rel="noopener noreferrer" aria-label={t('applications.openJobLinkAria', { company: item.company })} onClick={(event) => event.stopPropagation()}>{t('applications.jobUrl')} <ExportOutlined /></a>}
          {item.resume_id && <span>{t('applications.resumePrefix', { name: item.resume_name || t('applications.deletedResume') })}{item.resume_version_revision ? ` · r${item.resume_version_revision}` : ''}</span>}
        </Space>
        {item.notes && <Typography.Text type="secondary" className={styles.applicationNotes}>{item.notes}</Typography.Text>}
      </Space>
      <div className={styles.applicationActions} onClick={(event) => event.stopPropagation()}>
        <Button type="primary" size="small" icon={<MessageOutlined />} aria-label={t('applications.recordProgressAria', { company: item.company })} onClick={() => openDetail(item, 'follow_up', true)}>{t('applications.priority.recordProgress')}</Button>
        <Button size="small" aria-label={t('applications.detailAria', { company: item.company })} onClick={() => openDetail(item)}>{t('applications.detail')}</Button>
        <Dropdown menu={{
          items: [{ key: 'edit', label: t('applications.editMenu') }, { key: 'delete', label: t('applications.deleteMenu'), danger: true }],
          onClick: ({ key }) => key === 'edit' ? setEditing(item) : confirmRemove(item),
        }} trigger={['click']}>
          <Button size="small" icon={<EllipsisOutlined />} aria-label={t('applications.moreActionsAria', { company: item.company })} />
        </Dropdown>
      </div>
    </div>
  }

  return <PageContainer
    size="lg"
    title={t('applications.title')}
    subtitle={t('applications.subtitle')}
    extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing(null)}>{t('applications.newApplication')}</Button>}
  >
    <Space orientation="vertical" size="large" style={{ display: 'flex' }}>
      {(isError || isSummaryError || isActionsError) && <Alert type="error" showIcon title={t('applications.dataLoadFailed')} description={t('applications.dataLoadFailedDescription')} action={<Button size="small" onClick={() => { void refetch(); void refetchSummary(); void refetchActions() }}>{t('common.retry')}</Button>} />}

      <div className={styles.dashboardGrid}>
        <div ref={priorityRef} style={{ scrollMarginTop: 72 }}>
          <Card
            title={t('applications.priorityTitle')}
            styles={{ body: { paddingTop: priorityItems.length ? 0 : 24 } }}
          >
            {isActionsError ? <Alert type="error" showIcon title={t('applications.priorityLoadFailed')} action={<Button size="small" onClick={() => void refetchActions()}>{t('common.retry')}</Button>} /> : !actions && isActionsLoading ? <div style={{ textAlign: 'center', padding: 32 }} aria-label={t('applications.loadingPriority')}><Spin /></div> : priorityItems.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('applications.noPriority')} style={{ margin: '12px 0' }} /> : <div aria-label={t('applications.priorityListAria')}>{priorityItems.map(({ item, bucket, tone, label, description }, index) => {
              const actionPolicy = getPriorityActionPolicy(bucket, item.status)
              return <div
                key={item.id}
                className={styles.priorityRow}
                role="button"
                tabIndex={0}
                aria-label={t('applications.openDetailAria', { company: item.company })}
                onClick={() => openDetail(item)}
                onKeyDown={(event) => {
                  if (event.currentTarget !== event.target) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openDetail(item)
                  }
                }}
              >
              <span className={`${styles.companyAvatar} ${styles[`companyAvatarTone${companyAvatarTone(item.company)}`]}`} aria-hidden="true">{companyAvatarText(item.company)}</span>
              <Space orientation="vertical" size={4} className={styles.priorityMain}>
                <Space wrap size={8}><Typography.Text strong>{item.company}</Typography.Text><Typography.Text type="secondary">{item.position}</Typography.Text><Tag color={STATUS_COLORS[item.status]}>{statusLabel(item.status)}</Tag><Tag color={tone}>{label}</Tag></Space>
                <Typography.Text type={tone === 'error' ? 'danger' : 'secondary'}><ClockCircleOutlined /> {description}</Typography.Text>
              </Space>
              <div className={styles.priorityActions} onClick={(event) => event.stopPropagation()}>
                <Button size="small" type={index === 0 ? 'primary' : 'default'} onClick={() => openDetail(item, actionPolicy.activity, true, actionPolicy.initialNextActionMode)}>{t(actionPolicy.primaryLabelKey)}</Button>
                <Button size="small" aria-label={t('applications.priorityDetailAria', { company: item.company })} onClick={() => openDetail(item)}>{t('applications.detail')}</Button>
              </div>
            </div>})}</div>}
          </Card>
        </div>

        <Card title={t('applications.overviewTitle')}>
          {summary ? <div className={styles.overviewBody}>
            <div className={styles.overviewStats} aria-label={t('applications.overviewAria')}>
              <button type="button" className={styles.statButton} onClick={() => filterByStatus('all')}><Statistic title={t('applications.active')} value={summary.active} /></button>
              <button type="button" className={styles.statButton} onClick={() => { priorityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}><Statistic title={t('applications.due')} value={summary.due_today + summary.overdue} styles={summary.overdue ? { content: { color: '#ff4d4f' } } : undefined} /></button>
              <button type="button" className={styles.statButton} onClick={() => filterByStatus('interview')}><Statistic title={t('applications.interviewing')} value={summary.interview} /></button>
            </div>
            <div className={styles.pipeline} aria-label={t('applications.stageDistributionAria')}>
              {APPLICATION_STAGE_ORDER.map((stage) => <span key={stage} className={styles.pipelineStage}>
                <button type="button" className={styles.pipelineButton} onClick={() => filterByStatus(stage)}><Tag color={STATUS_COLORS[stage]}>{statusLabel(stage)} {summary.by_status[stage] || 0}</Tag></button>
              </span>)}
            </div>
          </div> : <Spin aria-label={t('applications.loadingOverview')} />}
        </Card>
      </div>

      <Card
        className={styles.applicationListCard}
        title={<Tabs className={styles.listTabs} activeKey={view} onChange={(key) => changeView(key as ApplicationView)} items={[{ key: 'recent', label: t('applications.recent') }, { key: 'all', label: t('applications.allApplications') }]} />}
        extra={<div className={styles.listHeaderActions}>
          <Input.Search className={styles.search} aria-label={t('applications.searchAria')} placeholder={t('applications.searchPlaceholder')} allowClear value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onSearch={(value) => { setSearchInput(value); setQ(value.trim()); setPage(1) }} />
          {(searchInput || status !== 'all') && <Button onClick={clearFilters}>{t('applications.clearFilters')}</Button>}
        </div>}
      >
        {view === 'all' && <div className={styles.toolbar}>
          <Select aria-label={t('applications.statusFilterAria')} value={status} onChange={filterByStatus} options={[{ value: 'all', label: t('applications.allStatus', { count: summary?.total || 0 }) }, ...filters.map((filter) => ({ ...filter, label: `${filter.label} (${summary?.by_status[filter.value] || 0})` }))]} style={{ width: 180 }} />
          <Select aria-label={t('applications.sortAria')} value={sort} onChange={setSort} options={[{ value: 'next_action', label: t('applications.sortNextAction') }, { value: 'updated', label: t('applications.sortUpdated') }, { value: 'applied_at', label: t('applications.sortAppliedAt') }, { value: 'company', label: t('applications.sortCompany') }]} style={{ width: 160 }} />
        </div>}

        {isLoading ? <div style={{ textAlign: 'center', padding: 64 }} aria-label={t('applications.loadingApplications')}><Spin /></div> : applications.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={q || status !== 'all' ? t('applications.noMatchingApplications') : t('applications.noApplications')} style={{ margin: '28px 0' }}><Button type="primary" onClick={() => setEditing(null)}>{t('applications.createFirst')}</Button></Empty> : <div aria-label={t('applications.listAria')}>{applications.map(renderApplicationCard)}</div>}
        {view === 'all' && data && data.pagination.total_pages > 1 && <div className={styles.pagination}><Pagination current={page} pageSize={data.pagination.page_size} total={data.pagination.total} showSizeChanger={false} showTotal={(total) => t('applications.totalApplications', { total })} onChange={setPage} /></div>}
      </Card>
    </Space>
    <ApplicationDetailDrawer key={`application-detail-${detail?.id || 'closed'}-${detailActivity}-${detailNextActionMode}-${detailRecorderOpen ? 'recorder' : 'summary'}`} application={detail} open={Boolean(detail)} initialActivity={detailActivity} initialRecorderOpen={detailRecorderOpen} initialNextActionMode={detailNextActionMode} onClose={() => setDetail(null)} onEdit={setEditing}>
      {detail && <ApplicationForm key={`nested-application-form-${editing?.id || 'closed'}`} application={editing || null} open={editing !== undefined} onClose={() => setEditing(undefined)} nested />}
    </ApplicationDetailDrawer>
    {!detail && <ApplicationForm key={`application-form-${editing?.id || (editing === null ? 'new' : 'closed')}`} application={editing || null} open={editing !== undefined} onClose={() => setEditing(undefined)} />}
  </PageContainer>
}
