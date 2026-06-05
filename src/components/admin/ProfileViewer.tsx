/**
 * 个人信息只读查看组件
 *
 * 用于后台管理中展示用户的 profile 数据
 * 复用现有 Profile 类型定义
 */

'use client'

import { Descriptions, Tag, Typography, Card, Collapse } from 'antd'
import type { Profile, Education, WorkExperience, Project, Skill } from '@/types/profile'
import { formatDate } from '@/utils/format'
import { desc } from '@/utils/resume-preview'

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
  if (!items.length) return <Text type="secondary">暂无</Text>
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
  if (!items.length) return <Text type="secondary">暂无</Text>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <Card key={item.id || i} size="small">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text strong>{item.company}</Text>
            <Text type="secondary">{formatDate(item.start_date)} ~ {item.end_date ? formatDate(item.end_date) : '至今'}</Text>
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
  if (!items.length) return <Text type="secondary">暂无</Text>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <Card key={item.id || i} size="small">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text strong>{item.name}</Text>
            <Text type="secondary">{formatDate(item.start_date)} ~ {item.end_date ? formatDate(item.end_date) : '至今'}</Text>
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
  if (!items.length) return <Text type="secondary">暂无</Text>
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

/** 通用列表渲染（奖项、作品、其他经历、研究经历） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SimpleList({ items, renderItem }: { items: any[]; renderItem: (item: any) => React.ReactNode }) {
  if (!items.length) return <Text type="secondary">暂无</Text>
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

export default function ProfileViewer({ profile }: ProfileViewerProps) {
  const basicInfo = profile.basic_info

  const collapseItems = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label="姓名">{basicInfo?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="电话">{basicInfo?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{basicInfo?.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="性别">{basicInfo?.other?.gender || '-'}</Descriptions.Item>
          <Descriptions.Item label="年龄">{basicInfo?.other?.age || '-'}</Descriptions.Item>
          <Descriptions.Item label="工作年限">{basicInfo?.other?.work_years ? `${basicInfo.other.work_years}年` : '-'}</Descriptions.Item>
          <Descriptions.Item label="最高学历">{basicInfo?.other?.education_level || '-'}</Descriptions.Item>
          <Descriptions.Item label="现居城市">{basicInfo?.other?.city || '-'}</Descriptions.Item>
          <Descriptions.Item label="微信号">{basicInfo?.other?.wechat || '-'}</Descriptions.Item>
          <Descriptions.Item label="GitHub">{basicInfo?.other?.github || '-'}</Descriptions.Item>
          <Descriptions.Item label="个人网站">{basicInfo?.other?.website || '-'}</Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'intention',
      label: '求职意向',
      children: basicInfo?.job_intention ? (
        <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label="当前状态">{basicInfo.job_intention.current_status || '-'}</Descriptions.Item>
          <Descriptions.Item label="期望职位">{basicInfo.job_intention.position || '-'}</Descriptions.Item>
          <Descriptions.Item label="期望城市">{basicInfo.job_intention.expected_city || '-'}</Descriptions.Item>
          <Descriptions.Item label="期望薪资">{basicInfo.job_intention.expected_salary || '-'}</Descriptions.Item>
        </Descriptions>
      ) : <Text type="secondary">暂无</Text>,
    },
    {
      key: 'education',
      label: `教育经历 (${profile.education?.length ?? 0})`,
      children: <EducationList items={profile.education || []} />,
    },
    {
      key: 'work',
      label: `工作经历 (${profile.work_experience?.length ?? 0})`,
      children: <WorkExperienceList items={profile.work_experience || []} />,
    },
    {
      key: 'projects',
      label: `项目经历 (${profile.projects?.length ?? 0})`,
      children: <ProjectList items={profile.projects || []} />,
    },
    {
      key: 'skills',
      label: `专业技能 (${profile.skills?.length ?? 0})`,
      children: <SkillList items={profile.skills || []} />,
    },
    {
      key: 'awards',
      label: `荣誉奖项 (${profile.awards?.length ?? 0})`,
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
      label: `个人作品 (${profile.portfolio?.length ?? 0})`,
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
      label: `研究经历 (${profile.research?.length ?? 0})`,
      children: (
        <SimpleList
          items={profile.research || []}
          renderItem={(item) => (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>{item.name}</Text>
                <Text type="secondary">{formatDate(item.start_date)} ~ {item.end_date ? formatDate(item.end_date) : '至今'}</Text>
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
      label: `其他经历 (${profile.other_experience?.length ?? 0})`,
      children: (
        <SimpleList
          items={profile.other_experience || []}
          renderItem={(item) => (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>{item.name}</Text>
                <Text type="secondary">{formatDate(item.start_date)} ~ {item.end_date ? formatDate(item.end_date) : '至今'}</Text>
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
      {profile.summary && (
        <Card size="small" title="个人简介" style={{ marginBottom: 16 }}>
          <DescriptionView value={profile.summary} />
        </Card>
      )}
      <Collapse defaultActiveKey={['basic', 'intention']} items={collapseItems} />
    </div>
  )
}
