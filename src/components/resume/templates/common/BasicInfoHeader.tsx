/**
 * 默认居中 BasicInfoHeader
 *
 * classic、modern、minimal 模板使用的基础 header：
 * 居中姓名、联系方式行、求职意向行。
 */

import type { BasicInfoHeaderProps } from '../types'

export function DefaultBasicInfoHeader({
  basicInfo,
  primaryColor,
  styles,
  contactItems,
  extraDisplayItems = [],
  intentionItems,
  centerNameFontSize = '2.2em',
  centerIntentionMode = 'spaced',
  showEmptyContactRow = false,
}: BasicInfoHeaderProps) {
  if (!basicInfo) return null

  return (
    <div style={{ textAlign: 'center', marginBottom: 4, paddingBottom: 14, borderBottom: `2px solid ${primaryColor}` }}>
      <div style={{ fontSize: centerNameFontSize, fontWeight: 'bold', color: primaryColor, marginBottom: 6 }}>
        {basicInfo.name || '您的姓名'}
      </div>
      {(showEmptyContactRow || contactItems.length > 0) && (
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
          {contactItems.map((item) => (
            <span key={item.field} style={{ fontSize: styles.contactItem.fontSize, color: '#555' }}>
              {item.value}
            </span>
          ))}
        </div>
      )}
      {extraDisplayItems.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
          {extraDisplayItems.map((item) => (
            <span key={item.field} style={{ fontSize: styles.contactItem.fontSize, color: '#555' }}>
              {item.value}
            </span>
          ))}
        </div>
      )}
      {intentionItems.length > 0 && centerIntentionMode === 'joined' && (
        <div style={{ fontSize: styles.contactItem.fontSize, color: '#666', marginTop: 4 }}>
          {intentionItems.map((item) => item.value).join('　')}
        </div>
      )}
      {intentionItems.length > 0 && centerIntentionMode === 'spaced' && (
        <div style={{ fontSize: styles.contactItem.fontSize, color: '#666', marginTop: 4 }}>
          {intentionItems[0].value}
          {intentionItems.slice(1).map((item) => (
            <span key={item.field} style={{ marginLeft: 12 }}>{item.value}</span>
          ))}
        </div>
      )}
    </div>
  )
}
