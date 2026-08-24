/**
 * 个人信息只读查看组件
 *
 * 用于后台管理中展示用户的 profile 数据
 * 复用现有 Profile 类型定义
 */

'use client'

import { Descriptions, Tag, Typography, Card, Collapse } from 'antd'
import type { Profile, Education, WorkExperience, Project, Skill, SelfEvaluation, JobIntentionEntry } from '@/types/profile'
import { formatDate } from '@/utils/format'
import { desc } from '@/utils/resume-preview'
import { useI18n } from '@/i18n'

const { Text, Paragraph } = Typography

interface ProfileViewerProps {
  profile: Profile
}

/** 渲染描述字段（支持富文本和纯文本） */
function DescriptionView({ value }: { value: unknown }) {
  const text = desc(value)
  if (!text) return <Text type="secondary">-</Text>
  return <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{text}</Paragraph>
}

/** 教育经历列表 */
function EducationList({ items }: { items: Education[] }) {
  const { t } = useI18n()
  if (!items.length) return <Text type="secondary">{t('admin.none')}</Text>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <Card key={item.id || i} size="small">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text strong>{item.school}</Text>
            <Text type="secondary">{formatDate(item.start_date)} ~ {formatDate(item.end_date)}</Text>
          </div>
          <div style={{ marginBottom: 4 }}>
            {item.major && <Text>{item.major}</Text>}
            {item.degree && <Text type="secondary" style={{ marginLeft: 8 }}>{item.degree}</Text>}
            {item.degree_type && <Tag style={{ marginLeft: 8 }}>{item.degree_type}</Tag>}
          </div>
          {item.college && <div><Text type="secondary">{item.college}</Text></div>}
          {item.city && <div><Text type="secondary">{item.city}</Text></div>}
          {item.description && <div style={{ marginTop: 4 }}><DescriptionView value={item.description} /></div>}
        </Card>
      ))}
    </div>
  )
}

/** 工作经历列表 */
function WorkExperienceList({ items }: { items: WorkExperience[] }) {
  const { t } = useI18n()
  if (!items.length) return <Text type="secondary">{t('admin.none')}</Text>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <Card key={item.id || i} size="small">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text strong>{item.company}</Text>
            <Text type="secondary">{formatDate(item.start_date)} ~ {item.end_date ? formatDate(item.end_date) : t('resume.present')}</Text>
          </div>
          <div>
            {item.department && <Text>{item.department}</Text>}
            {item.position && <Text type="secondary" style={{ marginLeft: 8 }}>{item.position}</Text>}
          </div>
          {item.city && <div><Text type="secondary">{item.city}</Text></div>}
          {item.description && <div style={{ marginTop: 4 }}><DescriptionView value={item.description} /></div>}
        </Card>
      ))}
    </div>
  )
}

/** 项目经历列表 */
function ProjectList({ items }: { items: Project[] }) {
  const { t } = useI18n()
  if (!items.length) return <Text type="secondary">{t('admin.none')}</Text>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <Card key={item.id || i} size="small">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text strong>{item.name}</Text>
            <Text type="secondary">{formatDate(item.start_date)} ~ {item.end_date ? formatDate(item.end_date) : t('resume.present')}</Text>
          </div>
          {item.role && <div><Text>{item.role}</Text></div>}
          {item.city && <div><Text type="secondary">{item.city}</Text></div>}
          {item.link && <div><a href={item.link} target="_blank" rel="noreferrer">{item.link}</a></div>}
          {item.description && <div style={{ marginTop: 4 }}><DescriptionView value={item.description} /></div>}
        </Card>
      ))}
    </div>
  )
}

/** 技能列表 */
function SkillList({ items }: { items: Skill[] }) {
  const { t } = useI18n()
  if (!items.length) return <Text type="secondary">{t('admin.none')}</Text>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div key={item.id || i}>
          <Tag>{item.name}</Tag>
          {item.description && <DescriptionView value={item.description} />}
        </div>
      ))}
    </div>
  )
}

function SelfEvaluationList({ items }: { items: SelfEvaluation[] }) {
  const { t } = useI18n()
  if (!items.length) return <Text type="secondary">{t('admin.none')}</Text>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, index) => (
        <Card key={item.id || index} size="small">
          <Text strong>{item.title || t('admin.selfEvaluationIndexed', { index: index + 1 })}</Text>
          {item.description && <div style={{ marginTop: 4 }}><DescriptionView value={item.description} /></div>}
        </Card>
      ))}
    </div>
  )
}

/** 通用列表渲染（奖项、作品、其他经历、研究经历） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SimpleList({ items, renderItem }: { items: any[]; renderItem: (item: any) => React.ReactNode }) {
  const { t } = useI18n()
  if (!items.length) return <Text type="secondary">{t('admin.none')}</Text>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item: Record<string, unknown>, i: number) => (
        <Card key={(item.id as string) || i} size="small">
          {renderItem(item)}
        </Card>
      ))}
    </div>
  )
}

function JobIntentionList({ items }: { items: JobIntentionEntry[] }) {
  const { t } = useI18n()
  if (!items.length) return <Text type="secondary">{t('admin.none')}</Text>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, index) => (
        <Card key={item.id || index} size="small">
          <Text strong>{item.title || item.position || t('basicInfo.defaultJobIntention')}</Text>
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small" style={{ marginTop: 8 }}>
            <Descriptions.Item label={t('admin.currentStatus')}>{item.current_status || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('admin.expectedPosition')}>{item.position || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('admin.expectedCity')}>{item.expected_city || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('admin.expectedSalary')}>{item.expected_salary || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>
      ))}
    </div>
  )
}

export default function ProfileViewer({ profile }: ProfileViewerProps) {
  const { t } = useI18n()
  const basicInfo = profile.basic_info

  const collapseItems = [
    {
      key: 'basic',
      label: t('modules.basic_info'),
      children: (
        <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label={t('admin.name')}>{basicInfo?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('admin.phone')}>{basicInfo?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('admin.email')}>{basicInfo?.email || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('basicInfo.gender')}>{basicInfo?.other?.gender || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('basicInfo.age')}>{basicInfo?.other?.age || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('basicInfo.workYears')}>{basicInfo?.other?.work_years ? t('resume.years', { count: basicInfo.other.work_years }) : '-'}</Descriptions.Item>
          <Descriptions.Item label={t('basicInfo.highestEducation')}>{basicInfo?.other?.education_level || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('basicInfo.currentCity')}>{basicInfo?.other?.city || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('basicInfo.wechat')}>{basicInfo?.other?.wechat || '-'}</Descriptions.Item>
          <Descriptions.Item label="GitHub">{basicInfo?.other?.github || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('basicInfo.website')}>{basicInfo?.other?.website || '-'}</Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'intention',
      label: `${t('admin.jobIntention')} (${profile.job_intentions?.length ?? 0})`,
      children: <JobIntentionList items={profile.job_intentions || []} />,
    },
    {
      key: 'education',
      label: `${t('modules.education')} (${profile.education?.length ?? 0})`,
      children: <EducationList items={profile.education || []} />,
    },
    {
      key: 'work',
      label: `${t('modules.work_experience')} (${profile.work_experience?.length ?? 0})`,
      children: <WorkExperienceList items={profile.work_experience || []} />,
    },
    {
      key: 'projects',
      label: `${t('modules.projects')} (${profile.projects?.length ?? 0})`,
      children: <ProjectList items={profile.projects || []} />,
    },
    {
      key: 'skills',
      label: `${t('modules.skills')} (${profile.skills?.length ?? 0})`,
      children: <SkillList items={profile.skills || []} />,
    },
    {
      key: 'awards',
      label: `${t('modules.awards')} (${profile.awards?.length ?? 0})`,
      children: (
        <SimpleList
          items={profile.awards || []}
          renderItem={(item) => (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>{item.name}</Text>
                <Text type="secondary">{formatDate(item.date)}</Text>
              </div>
              {item.description && <DescriptionView value={item.description} />}
            </>
          )}
        />
      ),
    },
    {
      key: 'portfolio',
      label: `${t('modules.portfolio')} (${profile.portfolio?.length ?? 0})`,
      children: (
        <SimpleList
          items={profile.portfolio || []}
          renderItem={(item) => (
            <>
              <Text strong>{item.name}</Text>
              {item.link && <div><a href={item.link} target="_blank" rel="noreferrer">{item.link}</a></div>}
              {item.description && <DescriptionView value={item.description} />}
            </>
          )}
        />
      ),
    },
    {
      key: 'research',
      label: `${t('modules.research')} (${profile.research?.length ?? 0})`,
      children: (
        <SimpleList
          items={profile.research || []}
          renderItem={(item) => (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>{item.name}</Text>
                <Text type="secondary">{formatDate(item.start_date)} ~ {item.end_date ? formatDate(item.end_date) : t('resume.present')}</Text>
              </div>
              {item.role && <div><Text>{item.role}</Text></div>}
              {item.description && <DescriptionView value={item.description} />}
            </>
          )}
        />
      ),
    },
    {
      key: 'other',
      label: `${t('modules.other_experience')} (${profile.other_experience?.length ?? 0})`,
      children: (
        <SimpleList
          items={profile.other_experience || []}
          renderItem={(item) => (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>{item.name}</Text>
                <Text type="secondary">{formatDate(item.start_date)} ~ {item.end_date ? formatDate(item.end_date) : t('resume.present')}</Text>
              </div>
              {item.role && <div><Text>{item.role}</Text></div>}
              {item.department && <div><Text type="secondary">{item.department}</Text></div>}
              {item.description && <DescriptionView value={item.description} />}
            </>
          )}
        />
      ),
    },
  ]

  return (
    <div>
      {(profile.self_evaluations?.length || profile.summary) && (
        <Card size="small" title={t('admin.selfEvaluation')} style={{ marginBottom: 16 }}>
          <SelfEvaluationList items={profile.self_evaluations || []} />
        </Card>
      )}
      <Collapse defaultActiveKey={['basic', 'intention']} items={collapseItems} />
    </div>
  )
}
