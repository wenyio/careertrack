/**
 * 基本信息表单
 *
 * Profile 模式支持维护多条求职意向；简历模式仍只保存单条求职意向。
 */

'use client'

import { useMemo, useState } from 'react'
import {
  App,
  AutoComplete,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tooltip,
} from 'antd'
import { ImportOutlined, SyncOutlined } from '@ant-design/icons'
import type { BasicInfo, JobIntention, JobIntentionEntry, ProfileEntrySyncMode } from '@/types/profile'
import type { BasicInfoDisplayConfig } from '@/types/resume'
import GravatarToggle from '@/components/common/GravatarToggle'
import BasicInfoExtraFields from './BasicInfoExtraFields'
import { ArrayFormItemCard, AddItemButton } from '@/components/common/ArrayFormCard'
import { CURRENT_STATUS_OPTIONS, SALARY_OPTIONS } from '@/constants'
import { useI18n } from '@/i18n'
import { useSyncProfileEntry } from '@/hooks/useProfile'
import { generateId } from '@/utils/format'
import {
  DEFAULT_JOB_INTENTION_TITLE,
  getPrimaryJobIntention,
  hasJobIntentionContent,
  normalizeJobIntention,
  normalizeJobIntentions,
} from '@/utils/job-intention'

type JobIntentionSyncMode = ProfileEntrySyncMode | 'pull'

interface BasicInfoFormProps {
  value?: Partial<BasicInfo>
  defaultValue?: BasicInfo
  onChange: (value: Partial<BasicInfo>) => void
  /** 基本信息展示配置 */
  displayConfig?: BasicInfoDisplayConfig
  /** 展示配置变更 */
  onDisplayConfigChange?: (config: BasicInfoDisplayConfig) => void
  /** 个人信息数据，用于简历编辑模式下的手动导入 */
  importValue?: BasicInfo
  /** profile 模式下的多条求职意向草稿 */
  profileJobIntentions?: Partial<JobIntentionEntry>[]
  /** profile 模式下已保存的多条求职意向 */
  defaultProfileJobIntentions?: JobIntentionEntry[]
  /** 简历编辑模式下可导入的多条求职意向 */
  importJobIntentions?: JobIntentionEntry[]
  canSyncProfile?: boolean
  onProfileJobIntentionsChange?: (value: Partial<JobIntentionEntry>[]) => void
}

function createJobIntention(): Partial<JobIntentionEntry> {
  return {
    id: generateId(),
    title: '',
    current_status: '',
    position: '',
    expected_city: '',
    expected_salary: '',
  }
}

function cloneBasicInfo(value: BasicInfo | undefined): Partial<BasicInfo> {
  return value ? structuredClone(value) as Partial<BasicInfo> : {}
}

function getJobIntentionTitle(
  entry: Partial<JobIntentionEntry>,
  index: number,
  defaultTitle: string,
): string {
  return entry.title?.trim()
    || entry.position?.trim()
    || (index === 0 ? defaultTitle : `${defaultTitle} ${index + 1}`)
}

function getJobIntentionSubtitle(entry: Partial<JobIntention>): string {
  return [
    entry.current_status,
    entry.position,
    entry.expected_city,
    entry.expected_salary,
  ].filter(Boolean).join(' · ')
}

function getJobIntentionSignature(entry: Partial<JobIntention>): string {
  const normalized = normalizeJobIntention(entry)
  return [
    normalized.current_status,
    normalized.position,
    normalized.expected_city,
    normalized.expected_salary,
  ].map((value) => value.trim().toLowerCase()).join('|')
}

export default function BasicInfoForm({
  value,
  defaultValue,
  onChange,
  displayConfig,
  onDisplayConfigChange,
  importValue,
  profileJobIntentions,
  defaultProfileJobIntentions,
  importJobIntentions,
  canSyncProfile,
  onProfileJobIntentionsChange,
}: BasicInfoFormProps) {
  const { modal } = App.useApp()
  const { t } = useI18n()
  const { mutateAsync: syncProfileEntry, isPending: isSyncingProfileEntry } = useSyncProfileEntry()
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [selectedImportId, setSelectedImportId] = useState<string | undefined>()
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [syncMode, setSyncMode] = useState<JobIntentionSyncMode>('create')
  const [syncTargetId, setSyncTargetId] = useState<string | undefined>()
  const [syncTitle, setSyncTitle] = useState('')

  const isProfileMode = !onDisplayConfigChange
  const data = isProfileMode ? { ...defaultValue, ...value } : (value || {})
  const currentJobIntention = normalizeJobIntention(data.job_intention)
  const showImportButton = !isProfileMode && !!importValue
  const canSyncCurrentJobIntention = !isProfileMode
    && !!canSyncProfile
    && hasJobIntentionContent(currentJobIntention)

  const currentStatusOptions = useMemo(() => CURRENT_STATUS_OPTIONS.map((option) => ({
    ...option,
    label: t(option.labelKey),
  })), [t])
  const salaryOptions = useMemo(() => SALARY_OPTIONS.map((option) => ({
    ...option,
    label: option.label,
  })), [])

  const profileJobIntentionItems = useMemo(() => {
    if (!isProfileMode) return []
    if (profileJobIntentions !== undefined) return profileJobIntentions
    const source = normalizeJobIntentions(defaultProfileJobIntentions, data.job_intention)
    return source.length > 0 ? source : [createJobIntention()]
  }, [data.job_intention, defaultProfileJobIntentions, isProfileMode, profileJobIntentions])

  const importCandidates = useMemo(() => (
    normalizeJobIntentions(importJobIntentions, importValue?.job_intention)
      .filter(hasJobIntentionContent)
  ), [importJobIntentions, importValue?.job_intention])

  const profileJobIntentionOptions = useMemo(
    () => importCandidates.map((entry, index) => ({
      value: entry.id,
      label: [
        getJobIntentionTitle(entry, index, t('basicInfo.defaultJobIntention')),
        getJobIntentionSubtitle(entry),
      ].filter(Boolean).join(' · '),
    })),
    [importCandidates, t],
  )

  const handleChange = (
    field: 'name' | 'phone' | 'email' | 'avatar',
    fieldValue: string,
  ) => {
    onChange({ ...data, [field]: fieldValue })
  }

  const handleJobIntentionChange = (
    field: keyof BasicInfo['job_intention'],
    fieldValue: string | undefined,
  ) => {
    onChange({
      ...data,
      job_intention: {
        ...currentJobIntention,
        [field]: fieldValue || '',
      },
    })
  }

  const handleProfileJobIntentionsChange = (items: Partial<JobIntentionEntry>[]) => {
    onProfileJobIntentionsChange?.(items)
    onChange({
      ...data,
      job_intention: getPrimaryJobIntention(items),
    })
  }

  const handleProfileJobIntentionFieldChange = (
    index: number,
    field: keyof JobIntentionEntry,
    fieldValue: string | undefined,
  ) => {
    const next = [...profileJobIntentionItems]
    next[index] = { ...next[index], [field]: fieldValue || '' }
    handleProfileJobIntentionsChange(next)
  }

  const handleAddProfileJobIntention = () => {
    handleProfileJobIntentionsChange([...profileJobIntentionItems, createJobIntention()])
  }

  const handleRemoveProfileJobIntention = (index: number) => {
    handleProfileJobIntentionsChange(profileJobIntentionItems.filter((_, itemIndex) => itemIndex !== index))
  }

  const importBasicInfo = (selected?: Partial<JobIntention>) => {
    const next = cloneBasicInfo(importValue)
    if (selected) next.job_intention = normalizeJobIntention(selected)
    onChange(next)
  }

  const handleConfirmImport = () => {
    const selected = importCandidates.find((entry) => entry.id === selectedImportId) || importCandidates[0]
    importBasicInfo(selected)
    setImportModalOpen(false)
  }

  const handleImportFromProfile = () => {
    if (importCandidates.length > 1) {
      setSelectedImportId(importCandidates[0]?.id)
      setImportModalOpen(true)
      return
    }

    const selected = importCandidates[0]
    modal.confirm({
      title: t('basicInfo.importConfirmTitle'),
      content: t('basicInfo.importConfirmContent'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: () => importBasicInfo(selected),
    })
  }

  const handleOpenSyncModal = () => {
    const currentSignature = getJobIntentionSignature(currentJobIntention)
    const matched = currentSignature.replace(/\|/g, '')
      ? importCandidates.find((entry) => getJobIntentionSignature(entry) === currentSignature)
      : undefined
    setSyncTargetId(matched?.id)
    setSyncMode(matched ? 'replace' : 'create')
    setSyncTitle(matched?.title || currentJobIntention.position || '')
    setSyncModalOpen(true)
  }

  const handlePullFromProfile = () => {
    const source = importCandidates.find((entry) => entry.id === syncTargetId)
    if (!source) return
    onChange({
      ...data,
      job_intention: normalizeJobIntention(source),
    })
    setSyncModalOpen(false)
    setSyncTargetId(undefined)
  }

  const handleConfirmSync = async () => {
    if (syncMode === 'pull') {
      handlePullFromProfile()
      return
    }
    if (syncMode === 'replace' && !syncTargetId) return

    await syncProfileEntry({
      field: 'job_intentions',
      mode: syncMode,
      target_id: syncMode === 'replace' ? syncTargetId : undefined,
      entry: {
        title: syncTitle.trim() || currentJobIntention.position || DEFAULT_JOB_INTENTION_TITLE,
        ...currentJobIntention,
      },
    })

    setSyncModalOpen(false)
    setSyncTargetId(undefined)
    setSyncTitle('')
  }

  const renderJobIntentionFields = (
    intention: Partial<JobIntention>,
    onFieldChange: (field: keyof JobIntention, value: string | undefined) => void,
  ) => (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item label={t('basicInfo.currentStatus')}>
            <AutoComplete
              value={intention.current_status}
              onChange={(value) => onFieldChange('current_status', value)}
              placeholder={t('basicInfo.currentStatusPlaceholder')}
              options={currentStatusOptions}
              allowClear
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item label={t('basicInfo.expectedPosition')}>
            <Input
              value={intention.position}
              onChange={(event) => onFieldChange('position', event.target.value)}
              placeholder={t('basicInfo.expectedPositionPlaceholder')}
              allowClear
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item label={t('basicInfo.expectedCity')}>
            <Input
              value={intention.expected_city}
              onChange={(event) => onFieldChange('expected_city', event.target.value)}
              placeholder={t('basicInfo.expectedCityPlaceholder')}
              allowClear
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item label={t('basicInfo.expectedSalary')}>
            <AutoComplete
              value={intention.expected_salary}
              onChange={(value) => onFieldChange('expected_salary', value)}
              placeholder={t('basicInfo.expectedSalaryPlaceholder')}
              options={salaryOptions}
              allowClear
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  )

  return (
    <Form layout="vertical">
      {(showImportButton || canSyncCurrentJobIntention) && (
        <Space.Compact block style={{ marginBottom: 16 }}>
          {showImportButton && (
            <Button
              type="dashed"
              icon={<ImportOutlined />}
              onClick={handleImportFromProfile}
              style={{ width: canSyncCurrentJobIntention ? '50%' : '100%', whiteSpace: 'normal', height: 'auto', minHeight: 32 }}
            >
              {t('basicInfo.importFromProfile')}
            </Button>
          )}
          {canSyncCurrentJobIntention && (
            <Button
              type="dashed"
              icon={<SyncOutlined />}
              onClick={handleOpenSyncModal}
              loading={isSyncingProfileEntry}
              style={{ width: showImportButton ? '50%' : '100%', whiteSpace: 'normal', height: 'auto', minHeight: 32 }}
            >
              {t('basicInfo.syncToProfile')}
            </Button>
          )}
        </Space.Compact>
      )}

      <Card title={t('basicInfo.basicInfo')} style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label={t('basicInfo.name')}>
              <Input
                value={data?.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder={t('basicInfo.namePlaceholder')}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label={t('basicInfo.phone')}>
              <Input
                value={data?.phone}
                onChange={(event) => handleChange('phone', event.target.value)}
                placeholder={t('basicInfo.phonePlaceholder')}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label={t('basicInfo.email')}>
              <Input
                value={data?.email}
                onChange={(event) => handleChange('email', event.target.value)}
                placeholder={t('basicInfo.emailPlaceholder')}
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <GravatarToggle
            avatar={data?.avatar}
            email={data?.email}
            showManualInput
            onAvatarChange={(url) => handleChange('avatar', url)}
          />
          {onDisplayConfigChange && (
            <Tooltip title={t('basicInfo.avatarLeftTooltip')}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#666' }}>
                {t('basicInfo.avatarLeft')}
                <Switch
                  size="small"
                  aria-label={t('basicInfo.avatarLeft')}
                  checked={displayConfig?.avatar_left ?? false}
                  onChange={(checked) =>
                    onDisplayConfigChange({
                      ...displayConfig,
                      visible_extra_fields: displayConfig?.visible_extra_fields || [],
                      avatar_left: checked,
                    })
                  }
                />
              </span>
            </Tooltip>
          )}
        </div>

        <BasicInfoExtraFields
          value={data.other}
          importValue={importValue?.other}
          displayConfig={displayConfig}
          onChange={(other) => onChange({ ...data, other })}
          onDisplayConfigChange={onDisplayConfigChange}
        />
      </Card>

      {isProfileMode ? (
        <>
          {profileJobIntentionItems.map((item, index) => (
            <ArrayFormItemCard
              key={item.id || index}
              id={item.id}
              index={index}
              onRemove={() => handleRemoveProfileJobIntention(index)}
            >
              <Form.Item label={t('basicInfo.jobIntentionTitle')}>
                <Input
                  value={item.title}
                  onChange={(event) => handleProfileJobIntentionFieldChange(index, 'title', event.target.value)}
                  placeholder={index === 0
                    ? t('basicInfo.defaultJobIntention')
                    : t('basicInfo.jobIntentionTitlePlaceholder')}
                  allowClear
                />
              </Form.Item>
              {renderJobIntentionFields(item, (field, value) =>
                handleProfileJobIntentionFieldChange(index, field, value)
              )}
            </ArrayFormItemCard>
          ))}
          <AddItemButton text={t('basicInfo.addJobIntention')} onClick={handleAddProfileJobIntention} />
        </>
      ) : (
        <Card title={t('basicInfo.jobIntention')} style={{ marginBottom: 16 }}>
          {renderJobIntentionFields(currentJobIntention, handleJobIntentionChange)}
        </Card>
      )}

      <Modal
        title={t('basicInfo.chooseJobIntention')}
        open={importModalOpen}
        okText={t('basicInfo.import')}
        cancelText={t('common.cancel')}
        onOk={handleConfirmImport}
        onCancel={() => setImportModalOpen(false)}
        okButtonProps={{ disabled: !selectedImportId }}
      >
        {importCandidates.length === 0 ? (
          <Empty description={t('basicInfo.noJobIntentions')} />
        ) : (
          <Radio.Group
            value={selectedImportId}
            onChange={(event) => setSelectedImportId(event.target.value)}
            style={{ width: '100%' }}
          >
            <Space orientation="vertical" style={{ width: '100%' }}>
              {importCandidates.map((entry, index) => (
                <Radio key={entry.id} value={entry.id} style={{ width: '100%' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {getJobIntentionTitle(entry, index, t('basicInfo.defaultJobIntention'))}
                    </div>
                    <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                      {getJobIntentionSubtitle(entry)}
                    </div>
                  </div>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )}
      </Modal>

      {canSyncCurrentJobIntention && (
        <Modal
          title={t('basicInfo.syncJobIntentionTitle')}
          open={syncModalOpen}
          okText={syncMode === 'pull'
            ? t('basicInfo.updateCurrentJobIntention')
            : syncMode === 'create'
              ? t('basicInfo.create')
              : t('basicInfo.replace')}
          cancelText={t('common.cancel')}
          onOk={handleConfirmSync}
          onCancel={() => setSyncModalOpen(false)}
          confirmLoading={isSyncingProfileEntry}
          okButtonProps={{
            disabled: (syncMode === 'replace' || syncMode === 'pull') && !syncTargetId,
          }}
        >
          <Radio.Group
            value={syncMode}
            onChange={(event) => setSyncMode(event.target.value as JobIntentionSyncMode)}
            style={{ display: 'grid', gap: 12, width: '100%' }}
          >
            <Radio value="create">{t('basicInfo.createProfileJobIntention')}</Radio>
            <Radio value="replace" disabled={profileJobIntentionOptions.length === 0}>
              {t('basicInfo.replaceProfileJobIntention')}
            </Radio>
            <Radio value="pull" disabled={profileJobIntentionOptions.length === 0}>
              {t('basicInfo.pullProfileJobIntention')}
            </Radio>
          </Radio.Group>

          {syncMode === 'create' ? (
            <Form.Item label={t('basicInfo.jobIntentionTitle')} style={{ marginTop: 12 }}>
              <Input
                value={syncTitle}
                onChange={(event) => setSyncTitle(event.target.value)}
                placeholder={t('basicInfo.createProfileJobIntentionTitlePlaceholder')}
              />
            </Form.Item>
          ) : (
            <div style={{ marginTop: 12 }}>
              {profileJobIntentionOptions.length === 0 ? (
                <Empty description={t('basicInfo.noProfileJobIntentions')} />
              ) : (
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <Select
                    value={syncTargetId}
                    onChange={(nextTargetId) => {
                      setSyncTargetId(nextTargetId)
                      const target = importCandidates.find((entry) => entry.id === nextTargetId)
                      setSyncTitle(target?.title || '')
                    }}
                    placeholder={syncMode === 'pull'
                      ? t('basicInfo.selectProfileJobIntentionForPull')
                      : t('basicInfo.selectProfileJobIntention')}
                    options={profileJobIntentionOptions}
                    style={{ width: '100%' }}
                    showSearch={{ optionFilterProp: 'label' }}
                  />
                </Space>
              )}
            </div>
          )}
        </Modal>
      )}
    </Form>
  )
}
