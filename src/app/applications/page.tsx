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
import { APPLICATION_STAGE_ORDER, APPLICATION_STATUS_COLORS as STATUS_COLORS, APPLICATION_STATUS_LABELS as STATUS_LABELS, getPriorityActionPolicy } from '@/lib/job-applications/config'
import type { PriorityBucket, PriorityNextActionMode } from '@/lib/job-applications/config'
import { appTodayDateOnly } from '@/lib/app-time'
import { ApplicationDetailDrawer } from '@/components/applications/ApplicationDetailDrawer'
import PageContainer from '@/components/layout/PageContainer'
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

  const formContent = <Form form={form} layout="vertical" requiredMark={false} initialValues={application ? {
      ...application,
      applied_at: application.applied_at ? dayjs(application.applied_at) : undefined,
      next_action_at: application.next_action_at ? dayjs(application.next_action_at) : undefined,
    } : { status: 'wishlist' }}>
      <Typography.Title level={5}>职位信息</Typography.Title>
      <Space size="middle" orientation={screens.md ? 'horizontal' : 'vertical'} style={{ display: 'flex' }}>
        <Form.Item label="公司" name="company" rules={[{ required: true, message: '请输入公司名称' }, { max: 120, message: '公司名称最多 120 字' }]} style={{ flex: 1 }}><Input autoFocus /></Form.Item>
        <Form.Item label="职位" name="position" rules={[{ required: true, message: '请输入职位名称' }, { max: 120, message: '职位名称最多 120 字' }]} style={{ flex: 1 }}><Input /></Form.Item>
      </Space>
      <Typography.Title level={5}>进展与跟进</Typography.Title>
      <Space size="middle" orientation={screens.md ? 'horizontal' : 'vertical'} style={{ display: 'flex' }}>
        <Form.Item label="状态" name="status" rules={[{ required: true }]} style={{ flex: 1 }}><Select options={JOB_APPLICATION_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))} /></Form.Item>
        <Form.Item label="投递日期" name="applied_at" style={{ flex: 1 }}><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="下次跟进" name="next_action_at" style={{ flex: 1 }}><DatePicker style={{ width: '100%' }} /></Form.Item>
      </Space>
      <Form.Item label="职位链接" name="job_url" rules={[{
        validator: async (_rule, value) => {
          if (!value || /^https?:\/\//i.test(value)) return
          throw new Error('请输入 http 或 https 链接')
        },
      }]}><Input placeholder="https://example.com/jobs/123" /></Form.Item>
      <Space size="middle" orientation={screens.md ? 'horizontal' : 'vertical'} style={{ display: 'flex' }}>
        <Form.Item label="地点" name="location" rules={[{ max: 120 }]} style={{ flex: 1 }}><Input /></Form.Item>
        <Form.Item label="投递渠道" name="channel" rules={[{ max: 80 }]} style={{ flex: 1 }}><Input placeholder="官网、内推、招聘平台…" /></Form.Item>
        <Form.Item label="薪资" name="salary" rules={[{ max: 80 }]} style={{ flex: 1 }}><Input /></Form.Item>
      </Space>
      <Typography.Title level={5}>简历与备注</Typography.Title>
      {resumesError && <Alert type="error" showIcon title="简历列表加载失败" action={<Button size="small" onClick={() => void refetchResumes()}>重试</Button>} />}
      {versionsError && effectiveResumeId && <Alert type="error" showIcon title="简历版本加载失败" action={<Button size="small" onClick={() => void loadVersions(effectiveResumeId)}>重试</Button>} />}
      <div className={styles.resumeEditPanel}>
        <div className={styles.resumeEditGrid}>
          <div className={styles.resumeInlineField}>
            <Typography.Text type="secondary" className={styles.inlineLabel}>关联简历</Typography.Text>
            <Form.Item name="resume_id" style={{ marginBottom: 0 }}><Select allowClear showSearch={{ filterOption: false, onSearch: setResumeQuery }} aria-label="关联简历" placeholder="选择简历" style={{ width: '100%' }} options={(resumePage?.items || []).map((resume) => ({ value: resume.id, label: resume.name }))} onChange={(value) => { setResumeId(value || null); setVersions([]); setVersionsError(false); form.setFieldValue('resume_version_id', undefined) }} /></Form.Item>
          </div>
          <div className={styles.versionInlineField}>
            <Typography.Text type="secondary" className={styles.inlineLabel}>投递版本</Typography.Text>
            <Form.Item name="resume_version_id" style={{ marginBottom: 0 }}><Select allowClear disabled={!effectiveResumeId} aria-label="简历版本" placeholder={effectiveResumeId ? '当前快照' : '先选简历'} style={{ width: '100%' }} options={versions.map((version) => ({ value: version.id, label: `r${version.revision} · ${version.source} · ${dayjs(version.created_at).format('YYYY-MM-DD HH:mm')}` }))} /></Form.Item>
          </div>
        </div>
      </div>
      <Form.Item label="备注" name="notes" rules={[{ max: 5000, message: '备注最多 5000 字' }]}><Input.TextArea rows={3} showCount maxLength={5000} placeholder="补充地点、偏好、沟通注意点等" /></Form.Item>
    </Form>

  return <Drawer
    title={<Space orientation="vertical" size={0}><Typography.Text strong>{application ? '编辑申请' : '新建申请'}</Typography.Text><Typography.Text type="secondary">{application ? '修改职位信息、阶段和投递快照' : '创建后可继续记录沟通和面试'}</Typography.Text></Space>}
    open={open}
    onClose={onClose}
    placement="right"
    size={nested ? (screens.md ? 720 : 'calc(100vw - 28px)') : 'large'}
    closable={false}
    styles={{ body: { overscrollBehavior: 'contain' } }}
    destroyOnHidden
    extra={<Space><Button onClick={onClose}>取消</Button><Button type="primary" onClick={submit} loading={create.isPending || update.isPending}>{application ? '保存修改' : '创建申请'}</Button></Space>}
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
  const filters = useMemo(() => JOB_APPLICATION_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })), [])
  const today = appTodayDateOnly()
  const isActionable = (item: JobApplication) => APPLICATION_STAGE_ORDER.slice(0, 4).includes(item.status)
  const allPriorityItems: PriorityItem[] = [
    ...(actions?.overdue.items || []).map((item) => ({ item, bucket: 'overdue' as const, tone: 'error' as const, label: '已逾期', description: `原定 ${item.next_action_at}` })),
    ...(actions?.due_today.items || []).map((item) => ({ item, bucket: 'due_today' as const, tone: 'warning' as const, label: '今天', description: '今天需要完成跟进' })),
    ...(actions?.upcoming.items || []).map((item) => ({ item, bucket: 'upcoming' as const, tone: 'processing' as const, label: '未来七天', description: `${item.next_action_at} 前处理` })),
    ...(actions?.unplanned.items || []).map((item) => ({ item, bucket: 'unplanned' as const, tone: 'default' as const, label: '待规划', description: '尚未设置下一步行动' })),
  ]
  // 优先处理只展示最高优先级的五条；完整数据通过下方申请列表管理。
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
      title: `删除 ${item.company} 的申请？`,
      content: '删除会移除申请和时间线记录，此操作不可恢复。',
      okText: '删除',
      cancelText: '取消',
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
    >
      <span className={avatarClassName} aria-hidden="true">{companyAvatarText(item.company)}</span>
      <Space orientation="vertical" size={5} className={styles.applicationMain}>
        <Space wrap size={8}>
          <Typography.Text strong>{item.company}</Typography.Text>
          <Typography.Text type="secondary">{item.position}</Typography.Text>
          <Tag color={STATUS_COLORS[item.status]}>{STATUS_LABELS[item.status]}</Tag>
          {overdue && <Tag color="error">跟进已逾期</Tag>}
        </Space>
        <Space wrap separator={<span>·</span>}>
          <span>{item.location || '地点未填写'}</span>
          {item.salary && <span>薪资：{item.salary}</span>}
          {item.channel && <span>渠道：{item.channel}</span>}
          {item.applied_at && <span>投递：{item.applied_at}</span>}
          {item.next_action_at ? <Typography.Text strong={overdue}><CalendarOutlined /> 下一步：{item.next_action_at}</Typography.Text> : <Typography.Text type="secondary">尚未安排下一步</Typography.Text>}
          {item.job_url && /^https?:\/\//i.test(item.job_url) && <a href={item.job_url} target="_blank" rel="noopener noreferrer" aria-label={`打开 ${item.company} 的职位链接`}>职位链接 <ExportOutlined /></a>}
          {item.resume_id && <span>简历：{item.resume_name || '已删除'}{item.resume_version_revision ? ` · r${item.resume_version_revision}` : ''}</span>}
        </Space>
        {item.notes && <Typography.Text type="secondary" className={styles.applicationNotes}>{item.notes}</Typography.Text>}
      </Space>
      <div className={styles.applicationActions}>
        <Button type="primary" size="small" icon={<MessageOutlined />} aria-label={`记录 ${item.company} 的进展`} onClick={() => openDetail(item, 'follow_up', true)}>记录进展</Button>
        <Button size="small" aria-label={`查看申请详情 ${item.company}`} onClick={() => openDetail(item)}>详情</Button>
        <Dropdown menu={{
          items: [{ key: 'edit', label: '编辑申请' }, { key: 'delete', label: '删除申请', danger: true }],
          onClick: ({ key }) => key === 'edit' ? setEditing(item) : confirmRemove(item),
        }} trigger={['click']}>
          <Button size="small" icon={<EllipsisOutlined />} aria-label={`${item.company} 的更多操作`} />
        </Dropdown>
      </div>
    </div>
  }

  return <PageContainer
    size="lg"
    title="求职进展"
    subtitle="聚焦下一步行动，掌握每一条申请的最新状态"
    extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing(null)}>新建申请</Button>}
  >
    <Space orientation="vertical" size="large" style={{ display: 'flex' }}>
      {(isError || isSummaryError || isActionsError) && <Alert type="error" showIcon title="求职数据加载失败" description="请检查网络后重试。" action={<Button size="small" onClick={() => { void refetch(); void refetchSummary(); void refetchActions() }}>重试</Button>} />}

      <div className={styles.dashboardGrid}>
        <div ref={priorityRef} style={{ scrollMarginTop: 72 }}>
          <Card
            title="优先处理"
            styles={{ body: { paddingTop: priorityItems.length ? 0 : 24 } }}
          >
            {isActionsError ? <Alert type="error" showIcon title="优先事项加载失败" action={<Button size="small" onClick={() => void refetchActions()}>重试</Button>} /> : !actions && isActionsLoading ? <div style={{ textAlign: 'center', padding: 32 }} aria-label="正在加载优先处理"><Spin /></div> : priorityItems.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待办，当前申请都已安排妥当" style={{ margin: '12px 0' }} /> : <div aria-label="优先处理申请">{priorityItems.map(({ item, bucket, tone, label, description }, index) => {
              const actionPolicy = getPriorityActionPolicy(bucket, item.status)
              return <div
                key={item.id}
                className={styles.priorityRow}
              >
              <span className={`${styles.companyAvatar} ${styles[`companyAvatarTone${companyAvatarTone(item.company)}`]}`} aria-hidden="true">{companyAvatarText(item.company)}</span>
              <Space orientation="vertical" size={4} className={styles.priorityMain}>
                <Space wrap size={8}><Typography.Text strong>{item.company}</Typography.Text><Typography.Text type="secondary">{item.position}</Typography.Text><Tag color={STATUS_COLORS[item.status]}>{STATUS_LABELS[item.status]}</Tag><Tag color={tone}>{label}</Tag></Space>
                <Typography.Text type={tone === 'error' ? 'danger' : 'secondary'}><ClockCircleOutlined /> {description}</Typography.Text>
              </Space>
              <div className={styles.priorityActions}>
                <Button size="small" type={index === 0 ? 'primary' : 'default'} onClick={() => openDetail(item, actionPolicy.activity, true, actionPolicy.initialNextActionMode)}>{actionPolicy.primaryLabel}</Button>
                <Button size="small" aria-label={`查看优先事项详情 ${item.company}`} onClick={() => openDetail(item)}>详情</Button>
              </div>
            </div>})}</div>}
          </Card>
        </div>

        <Card title="进展概览">
          {summary ? <div className={styles.overviewBody}>
            <div className={styles.overviewStats} aria-label="求职申请概览">
              <button type="button" className={styles.statButton} onClick={() => filterByStatus('all')}><Statistic title="进行中" value={summary.active} /></button>
              <button type="button" className={styles.statButton} onClick={() => { priorityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}><Statistic title="待跟进" value={summary.due_today + summary.overdue} styles={summary.overdue ? { content: { color: '#ff4d4f' } } : undefined} /></button>
              <button type="button" className={styles.statButton} onClick={() => filterByStatus('interview')}><Statistic title="面试中" value={summary.interview} /></button>
            </div>
            <div className={styles.pipeline} aria-label="申请阶段分布">
              {APPLICATION_STAGE_ORDER.map((stage) => <span key={stage} className={styles.pipelineStage}>
                <button type="button" className={styles.pipelineButton} onClick={() => filterByStatus(stage)}><Tag color={STATUS_COLORS[stage]}>{STATUS_LABELS[stage]} {summary.by_status[stage] || 0}</Tag></button>
              </span>)}
            </div>
          </div> : <Spin aria-label="正在加载求职概览" />}
        </Card>
      </div>

      <Card
        className={styles.applicationListCard}
        title={<Tabs className={styles.listTabs} activeKey={view} onChange={(key) => changeView(key as ApplicationView)} items={[{ key: 'recent', label: '最近动态' }, { key: 'all', label: '全部申请' }]} />}
        extra={<div className={styles.listHeaderActions}>
          <Input.Search className={styles.search} aria-label="搜索公司或职位" placeholder="搜索公司或职位" allowClear value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onSearch={(value) => { setSearchInput(value); setQ(value.trim()); setPage(1) }} />
          {(searchInput || status !== 'all') && <Button onClick={clearFilters}>清空筛选</Button>}
        </div>}
      >
        {view === 'all' && <div className={styles.toolbar}>
          <Select aria-label="按状态筛选" value={status} onChange={filterByStatus} options={[{ value: 'all', label: `全部状态 (${summary?.total || 0})` }, ...filters.map((filter) => ({ ...filter, label: `${filter.label} (${summary?.by_status[filter.value] || 0})` }))]} style={{ width: 180 }} />
          <Select aria-label="排序方式" value={sort} onChange={setSort} options={[{ value: 'next_action', label: '按下次行动' }, { value: 'updated', label: '按最近更新' }, { value: 'applied_at', label: '按投递日期' }, { value: 'company', label: '按公司名称' }]} style={{ width: 160 }} />
        </div>}

        {isLoading ? <div style={{ textAlign: 'center', padding: 64 }} aria-label="正在加载求职申请"><Spin /></div> : applications.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={q || status !== 'all' ? '没有符合条件的申请' : '还没有求职申请'} style={{ margin: '28px 0' }}><Button type="primary" onClick={() => setEditing(null)}>创建第一条申请</Button></Empty> : <div aria-label="求职申请列表">{applications.map(renderApplicationCard)}</div>}
        {view === 'all' && data && data.pagination.total_pages > 1 && <div className={styles.pagination}><Pagination current={page} pageSize={data.pagination.page_size} total={data.pagination.total} showSizeChanger={false} showTotal={(total) => `共 ${total} 条申请`} onChange={setPage} /></div>}
      </Card>
    </Space>
    <ApplicationDetailDrawer key={`application-detail-${detail?.id || 'closed'}-${detailActivity}-${detailNextActionMode}-${detailRecorderOpen ? 'recorder' : 'summary'}`} application={detail} open={Boolean(detail)} initialActivity={detailActivity} initialRecorderOpen={detailRecorderOpen} initialNextActionMode={detailNextActionMode} onClose={() => setDetail(null)} onEdit={setEditing}>
      {detail && <ApplicationForm key={`nested-application-form-${editing?.id || 'closed'}`} application={editing || null} open={editing !== undefined} onClose={() => setEditing(undefined)} nested />}
    </ApplicationDetailDrawer>
    {!detail && <ApplicationForm key={`application-form-${editing?.id || (editing === null ? 'new' : 'closed')}`} application={editing || null} open={editing !== undefined} onClose={() => setEditing(undefined)} />}
  </PageContainer>
}
