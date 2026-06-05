/**
 * 项目常量定义
 *
 * 集中管理枚举值、配置项等，避免魔法字符串
 */

/** 当前状态选项 */
export const CURRENT_STATUS_OPTIONS = [
  { value: '在职', label: '在职' },
  { value: '离职', label: '离职' },
  { value: '应届生', label: '应届生' },
  { value: '在校生', label: '在校生' },
] as const

/** 期望薪资选项 */
export const SALARY_OPTIONS = [
  { value: '5-10K', label: '5-10K' },
  { value: '10-15K', label: '10-15K' },
  { value: '15-20K', label: '15-20K' },
  { value: '20-30K', label: '20-30K' },
  { value: '30-50K', label: '30-50K' },
  { value: '50K+', label: '50K+' },
] as const

/** 学历选项 */
export const EDUCATION_LEVEL_OPTIONS = [
  { value: '博士', label: '博士' },
  { value: '硕士', label: '硕士' },
  { value: '本科', label: '本科' },
  { value: '大专', label: '大专' },
  { value: '高中', label: '高中' },
] as const

/** 工作年限选项 */
export const WORK_YEARS_OPTIONS = [
  { value: 0, label: '应届生' },
  { value: 1, label: '1年' },
  { value: 2, label: '2年' },
  { value: 3, label: '3年' },
  { value: 5, label: '5年' },
  { value: 10, label: '10年+' },
] as const

/** 性别选项 */
export const GENDER_OPTIONS = [
  { value: '男', label: '男' },
  { value: '女', label: '女' },
] as const

/** Cookie 配置 */
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 天

/** 自动保存延迟（毫秒） */
export const AUTO_SAVE_DELAY = 3000

/** 请求超时时间（毫秒） */
export const REQUEST_TIMEOUT = 30000
