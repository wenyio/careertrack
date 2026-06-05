/**
 * 简历列表卡片组件
 *
 * 渲染单个简历的缩略图、名称、日期和操作按钮。
 * 正式用户显示公开链接按钮，游客不显示。
 */

'use client'

import { Card, Button, Tag, Popover, Typography } from 'antd'
import {
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  GlobalOutlined,
  LockOutlined,
  PrinterOutlined,
} from '@ant-design/icons'
import ResumeMiniPreview from '@/components/resume/ResumeMiniPreview'
import PublicLinkPopover from '@/components/resume/PublicLinkPopover'
import { formatDate } from '@/utils/format'
import { DEFAULT_MODULES_ORDER } from '@/types/resume'
import type { ResumeContent, ModulesConfig, ResumeModuleType, ResumeTemplateId } from '@/types/resume'
import type { Profile } from '@/types/profile'

const { Text } = Typography

export interface ResumeListResume {
  id: string
  name: string
  content: ResumeContent
  modules_config: ModulesConfig
  modules_order: ResumeModuleType[]
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
  onEdit: (id: string) => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string, name: string) => void
  onPrint: (id: string) => void
  onTogglePublic?: (resumeId: string, isPublic: boolean, slug?: string) => void
  onPopoverChange: (resumeId: string | null) => void
}

export default function ResumeListCard({
  resume,
  profile,
  showPublic,
  popoverResumeId,
  exportingId,
  onEdit,
  onRename,
  onDuplicate,
  onDelete,
  onPrint,
  onTogglePublic,
  onPopoverChange,
}: ResumeListCardProps) {
  return (
    <Card
      hoverable
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ display: 'flex', padding: 16, gap: 16 }}>
        {/* 左侧：缩略图预览 */}
        <div
          style={{ flexShrink: 0, cursor: 'pointer' }}
          onClick={() => onEdit(resume.id)}
        >
          <ResumeMiniPreview
            content={resume.content}
            modulesConfig={resume.modules_config}
            modulesOrder={resume.modules_order || DEFAULT_MODULES_ORDER}
            template={resume.template || 'classic'}
            profile={profile ?? undefined}
            width={120}
          />
        </div>

        {/* 右侧：信息与操作 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* 顶部：名称 + 标签 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <Text
              strong
              ellipsis
              style={{ fontSize: 15, cursor: 'pointer', flex: 1, minWidth: 0 }}
              onClick={() => onEdit(resume.id)}
            >
              {resume.name}
            </Text>
            {showPublic && resume.is_public && <Tag color="blue" style={{ flexShrink: 0 }}>已公开</Tag>}
          </div>

          <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
            更新于 {formatDate(resume.updated_at, 'YYYY-MM-DD HH:mm')}
          </Text>

          {/* 底部：操作按钮 */}
          <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onRename(resume.id, resume.name)}
            />
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => onDuplicate(resume.id)}
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
                <span>
                  <Button
                    type="text"
                    size="small"
                    icon={resume.is_public ? <LockOutlined /> : <GlobalOutlined />}
                  />
                </span>
              </Popover>
            )}
            <Button
              type="text"
              size="small"
              icon={<PrinterOutlined />}
              loading={exportingId === resume.id}
              onClick={() => onPrint(resume.id)}
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(resume.id, resume.name)}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
