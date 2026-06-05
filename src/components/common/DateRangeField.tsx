/**
 * 日期范围表单字段组件
 *
 * 封装 Ant Design DatePicker.RangePicker
 * 支持"至今"功能：勾选后结束时间设为至今
 */

'use client'

import { Form, DatePicker, Checkbox } from 'antd'
import dayjs from 'dayjs'

interface DateRangeFieldProps {
  /** 开始日期值 */
  startDate?: string
  /** 结束日期值 */
  endDate?: string
  /** 日期变更回调 */
  onChange: (startDate: string, endDate: string) => void
  /** 标签文本 */
  label?: string
  /** 占位符 */
  placeholder?: [string, string]
  /** 选择器类型 */
  picker?: 'month' | 'year' | 'week'
}

/**
 * 安全解析日期字符串为 dayjs 对象
 * 空字符串或无效日期返回 null
 */
function safeParseDate(date?: string): dayjs.Dayjs | null {
  if (!date) return null
  const d = dayjs(date)
  return d.isValid() ? d : null
}

/**
 * 日期范围表单字段
 *
 * 统一了所有日期范围选择的交互模式：
 * - 支持"至今"复选框
 * - 自动解析 dayjs 值
 * - 统一的格式化输出（YYYY-MM）
 * - 统一的占位符和样式
 */
export default function DateRangeField({
  startDate,
  endDate,
  onChange,
  label = '时间',
  placeholder = ['开始时间', '结束时间'],
  picker = 'month',
}: DateRangeFieldProps) {
  // 直接从 endDate 派生"至今"状态，无需额外 state 同步
  const isPresent = endDate === ''

  const handleStartDateChange = (date: dayjs.Dayjs | null) => {
    onChange(date ? date.format('YYYY-MM') : '', isPresent ? '' : endDate || '')
  }

  const handleEndDateChange = (date: dayjs.Dayjs | null) => {
    onChange(startDate || '', date ? date.format('YYYY-MM') : '')
  }

  const handlePresentChange = (checked: boolean) => {
    if (checked) {
      // 勾选"至今"时清空结束日期
      onChange(startDate || '', '')
    } else {
      // 取消勾选时清空结束日期，让用户重新选择
      onChange(startDate || '', '')
    }
  }

  return (
    <Form.Item label={label}>
      <div className="date-range-field" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <DatePicker
          value={safeParseDate(startDate)}
          onChange={handleStartDateChange}
          placeholder={placeholder[0]}
          style={{ flex: 1, minWidth: 100 }}
          picker={picker}
          allowClear
        />
        <span style={{ lineHeight: '32px', color: '#999' }}>~</span>
        <DatePicker
          value={isPresent ? null : safeParseDate(endDate)}
          onChange={handleEndDateChange}
          placeholder={isPresent ? '至今' : placeholder[1]}
          style={{ flex: 1, minWidth: 100 }}
          picker={picker}
          disabled={isPresent}
          allowClear
        />
        <Checkbox
          checked={isPresent}
          onChange={(e) => handlePresentChange(e.target.checked)}
          style={{ lineHeight: '32px', whiteSpace: 'nowrap' }}
        >
          至今
        </Checkbox>
      </div>
    </Form.Item>
  )
}
