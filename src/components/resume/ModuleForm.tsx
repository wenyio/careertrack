/**
 * 模块表单组件
 *
 * 渲染所有已启用的模块，每个模块可折叠。
 * 模块标题 hover 时显示编辑、上移、下移、删除图标。
 * 支持自定义模块名称。
 */

'use client'

import { useState } from 'react'
import { Collapse, Tooltip, Input, Modal } from 'antd'
import {
  EditOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { ResumeModuleType, ResumeContent, ModulesConfig, BasicInfoDisplayConfig } from '@/types/resume'
import type { Profile } from '@/types/profile'
import { getResolvedModuleTitle } from '@/utils/module-title'
import BasicInfoForm from './modules/BasicInfoForm'
import EducationForm from './modules/EducationForm'
import SkillsForm from './modules/SkillsForm'
import WorkExperienceForm from './modules/WorkExperienceForm'
import ProjectsForm from './modules/ProjectsForm'
import PortfolioForm from './modules/PortfolioForm'
import AwardsForm from './modules/AwardsForm'
import OtherExperienceForm from './modules/OtherExperienceForm'
import ResearchForm from './modules/ResearchForm'
import SummaryForm from './modules/SummaryForm'

interface ModuleFormProps {
  modulesOrder: ResumeModuleType[]
  modulesConfig: ModulesConfig
  expandedModules: Set<ResumeModuleType>
  content: ResumeContent
  profile?: Profile
  onChange: (module: ResumeModuleType, value: unknown) => void
  onExpand: (modules: Set<ResumeModuleType>) => void
  /** 基本信息展示配置变更 */
  onDisplayConfigChange?: (config: BasicInfoDisplayConfig) => void
  /** 模块重命名 */
  onRenameModule?: (module: ResumeModuleType, name: string) => void
  /** 模块移动 */
  onMoveModule?: (module: ResumeModuleType, direction: 'up' | 'down') => void
  /** 模块删除（禁用） */
  onDeleteModule?: (module: ResumeModuleType) => void
}

/** 渲染单个模块的表单内容 */
function renderModuleForm(
  module: ResumeModuleType,
  content: ResumeContent,
  profile: Profile | undefined,
  onChange: (module: ResumeModuleType, value: unknown) => void,
  onDisplayConfigChange?: (config: BasicInfoDisplayConfig) => void,
) {
  switch (module) {
    case 'basic_info':
      return (
        <BasicInfoForm
          value={content.basic_info}
          onChange={(value) => onChange(module, value)}
          displayConfig={content.basic_info_display}
          onDisplayConfigChange={onDisplayConfigChange}
          importValue={profile?.basic_info}
        />
      )
    case 'education':
      return (
        <EducationForm
          value={content.education}
          defaultValue={profile?.education}
          onChange={(value) => onChange(module, value)}
          mode="resume"
        />
      )
    case 'skills':
      return (
        <SkillsForm
          value={content.skills}
          defaultValue={profile?.skills}
          onChange={(value) => onChange(module, value)}
          mode="resume"
        />
      )
    case 'work_experience':
      return (
        <WorkExperienceForm
          value={content.work_experience}
          defaultValue={profile?.work_experience}
          onChange={(value) => onChange(module, value)}
          mode="resume"
        />
      )
    case 'projects':
      return (
        <ProjectsForm
          value={content.projects}
          defaultValue={profile?.projects}
          onChange={(value) => onChange(module, value)}
          mode="resume"
        />
      )
    case 'portfolio':
      return (
        <PortfolioForm
          value={content.portfolio}
          defaultValue={profile?.portfolio}
          onChange={(value) => onChange(module, value)}
          mode="resume"
        />
      )
    case 'awards':
      return (
        <AwardsForm
          value={content.awards}
          defaultValue={profile?.awards}
          onChange={(value) => onChange(module, value)}
          mode="resume"
        />
      )
    case 'other_experience':
      return (
        <OtherExperienceForm
          value={content.other_experience}
          defaultValue={profile?.other_experience}
          onChange={(value) => onChange(module, value)}
          mode="resume"
        />
      )
    case 'research':
      return (
        <ResearchForm
          value={content.research}
          defaultValue={profile?.research}
          onChange={(value) => onChange(module, value)}
          mode="resume"
        />
      )
    case 'summary':
      return (
        <SummaryForm
          value={content.summary}
          onChange={(value) => onChange(module, value)}
          importValue={profile?.summary}
        />
      )
    default:
      return <div>未知模块</div>
  }
}

/** 模块标题（含 hover 操作图标） */
function ModuleTitleLabel({
  module,
  content,
  canMoveUp,
  canMoveDown,
  onRename,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  module: ResumeModuleType
  content: ResumeContent
  canMoveUp: boolean
  canMoveDown: boolean
  onRename: (name: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  const title = getResolvedModuleTitle(module, content)

  const handleOpenRename = () => {
    setRenameValue(title)
    setRenameModalOpen(true)
  }

  const handleConfirmRename = () => {
    onRename(renameValue.trim())
    setRenameModalOpen(false)
  }

  const iconStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#999',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: 2,
    transition: 'color 0.15s',
  }

  return (
    <>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span>{title}</span>
        {hovered && module !== 'basic_info' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="编辑名称">
              <EditOutlined style={iconStyle} onClick={handleOpenRename} />
            </Tooltip>
            {canMoveUp && (
              <Tooltip title="上移">
                <ArrowUpOutlined style={iconStyle} onClick={onMoveUp} />
              </Tooltip>
            )}
            {canMoveDown && (
              <Tooltip title="下移">
                <ArrowDownOutlined style={iconStyle} onClick={onMoveDown} />
              </Tooltip>
            )}
            <Tooltip title="删除模块">
              <DeleteOutlined style={{ ...iconStyle, color: '#ff4d4f' }} onClick={onDelete} />
            </Tooltip>
          </div>
        )}
      </div>

      <Modal
        title="重命名模块"
        open={renameModalOpen}
        onOk={handleConfirmRename}
        onCancel={() => setRenameModalOpen(false)}
        okText="确认"
        cancelText="取消"
      >
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          placeholder="请输入模块名称"
          onPressEnter={handleConfirmRename}
        />
      </Modal>
    </>
  )
}

export default function ModuleForm({
  modulesOrder,
  modulesConfig,
  expandedModules,
  content,
  profile,
  onChange,
  onExpand,
  onDisplayConfigChange,
  onRenameModule,
  onMoveModule,
  onDeleteModule,
}: ModuleFormProps) {
  // 只显示已启用的模块
  const enabledModules = modulesOrder.filter((m) => modulesConfig[m])

  // Collapse 的 activeKey
  const activeKeys = enabledModules.filter((m) => expandedModules.has(m))

  const items = enabledModules.map((module) => {
    const enabledIdx = enabledModules.indexOf(module)
    return {
      key: module,
      label: (
        <ModuleTitleLabel
          module={module}
          content={content}
          canMoveUp={enabledIdx > 0}
          canMoveDown={enabledIdx < enabledModules.length - 1}
          onRename={(name) => onRenameModule?.(module, name)}
          onMoveUp={() => onMoveModule?.(module, 'up')}
          onMoveDown={() => onMoveModule?.(module, 'down')}
          onDelete={() => onDeleteModule?.(module)}
        />
      ),
      children: renderModuleForm(module, content, profile, onChange, onDisplayConfigChange),
      id: `module-panel-${module}`,
    }
  })

  return (
    <Collapse
      activeKey={activeKeys}
      onChange={(keys) => {
        const keyArray = Array.isArray(keys) ? keys : [keys]
        const newExpanded = new Set(keyArray as ResumeModuleType[])
        onExpand(newExpanded)
      }}
      style={{ backgroundColor: 'transparent', border: 'none' }}
      items={items}
    />
  )
}
