/**
 * 基本信息字段配置
 *
 * 定义额外字段的元数据：标签、图标、控件类型、选项等。
 * 用于 BasicInfoForm 的"更多字段"和预览展示。
 */

import type { BasicInfoExtraField, BasicInfoIconName } from '@/types/resume'
import {
  EDUCATION_LEVEL_OPTIONS,
  WORK_YEARS_OPTIONS,
  GENDER_OPTIONS,
} from '@/constants'

export type ExtraFieldKind = 'input' | 'number' | 'select' | 'month' | 'date'

export interface BasicInfoExtraFieldConfig {
  field: BasicInfoExtraField
  label: string
  kind: ExtraFieldKind
  placeholder?: string
  options?: readonly { value: string | number; label: string }[]
  /** 默认图标（展示用） */
  defaultIcon?: BasicInfoIconName
  /** 字段是否支持图标配置入口 */
  iconConfigurable?: boolean
  /** 性别特殊：男/女不同图标和颜色 */
  genderIcon?: { male: BasicInfoIconName; female: BasicInfoIconName }
}

/** 所有额外字段配置，按展示顺序排列 */
export const BASIC_INFO_EXTRA_FIELDS: BasicInfoExtraFieldConfig[] = [
  {
    field: 'education_level',
    label: '最高学历',
    kind: 'select',
    placeholder: '请选择',
    options: EDUCATION_LEVEL_OPTIONS,
    defaultIcon: 'education',
    iconConfigurable: true,
  },
  {
    field: 'age',
    label: '年龄',
    kind: 'number',
    placeholder: '请输入年龄',
    defaultIcon: 'age',
    iconConfigurable: true,
  },
  {
    field: 'work_years',
    label: '工作年限',
    kind: 'select',
    placeholder: '请选择',
    options: WORK_YEARS_OPTIONS,
    defaultIcon: 'workYears',
    iconConfigurable: true,
  },
  {
    field: 'gender',
    label: '性别',
    kind: 'select',
    placeholder: '请选择',
    options: GENDER_OPTIONS,
    defaultIcon: 'user',
    genderIcon: { male: 'man', female: 'woman' },
    iconConfigurable: true,
  },
  {
    field: 'wechat',
    label: '微信号',
    kind: 'input',
    placeholder: '请输入微信号',
    defaultIcon: 'wechat',
    iconConfigurable: true,
  },
  {
    field: 'city',
    label: '现居城市',
    kind: 'input',
    placeholder: '请输入现居城市',
    defaultIcon: 'home',
    iconConfigurable: true,
  },
  {
    field: 'github',
    label: 'GitHub',
    kind: 'input',
    placeholder: '请输入 GitHub',
    defaultIcon: 'github',
    iconConfigurable: true,
  },
  {
    field: 'website',
    label: '个人网站',
    kind: 'input',
    placeholder: '请输入个人网站',
    defaultIcon: 'website',
    iconConfigurable: true,
  },
  {
    field: 'birthday',
    label: '生日',
    kind: 'date',
    placeholder: '请选择生日',
  },
  {
    field: 'height',
    label: '身高',
    kind: 'input',
    placeholder: '例如：175cm',
  },
  {
    field: 'weight',
    label: '体重',
    kind: 'input',
    placeholder: '例如：70kg',
  },
  {
    field: 'native_place',
    label: '籍贯',
    kind: 'input',
    placeholder: '请输入籍贯',
  },
  {
    field: 'nation',
    label: '民族',
    kind: 'input',
    placeholder: '请输入民族',
  },
  {
    field: 'political_status',
    label: '政治面貌',
    kind: 'input',
    placeholder: '请输入政治面貌',
  },
  {
    field: 'marital_status',
    label: '婚姻状况',
    kind: 'input',
    placeholder: '请输入婚姻状况',
  },
]

/** 字段配置查找表 */
export const EXTRA_FIELDS_MAP = Object.fromEntries(
  BASIC_INFO_EXTRA_FIELDS.map((f) => [f.field, f]),
) as Record<BasicInfoExtraField, BasicInfoExtraFieldConfig>

/** 获取字段默认图标 */
export function getFieldDefaultIcon(field: string): BasicInfoIconName | undefined {
  return EXTRA_FIELDS_MAP[field as BasicInfoExtraField]?.defaultIcon
}
