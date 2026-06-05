/**
 * 公共 BasicInfoHeader 组件
 *
 * 统一处理联系信息、额外信息、求职意向、图标、头像/姓名布局。
 * 通过 variant 支持 centered / left / sidebar 三种布局变体。
 */

import type { CSSProperties } from 'react'
import type { BasicInfoHeaderProps } from '../types'
import { getContactIcon, getExtraFieldIcon, getIntentionIcon } from './icon-mappers'
import { makeIconStyle, makeTextItemStyle } from './basic-info-header-styles'

/**
 * 简历模板公共基础信息头部渲染组件。
 *
 * @example 经典居中（带底部分割线）
 * ```tsx
 * <StandardBasicInfoHeader variant="centered" showBottomBorder primaryColor={color} ... />
 * ```
 *
 * @example 侧边栏（白字，不渲染姓名和头像）
 * ```tsx
 * <StandardBasicInfoHeader variant="sidebar" showName={false} showAvatar={false} ... />
 * ```
 */
export function StandardBasicInfoHeader({
  basicInfo,
  primaryColor,
  contactItems,
  extraDisplayItems = [],
  fieldIcons,
  intentionItems,
  // 布局变体
  variant = 'centered',
  // 字号
  nameFontSize = '2.2em',
  contactFontSize = '14px',
  intentionFontSize = '14px',
  // 颜色
  iconColor,
  iconFontSize = '0.85em',
  iconMarginRight,
  textColor = '#555',
  intentionColor = '#666',
  // 意图模式
  intentionMode,
  centerIntentionMode = 'spaced',
  blackWhiteIntentionMode = 'items',
  // 显隐控制
  showBottomBorder = false,
  showName = true,
  showAvatar = true,
  avatarLeft = false,
  showEmptyContactRow = false,
  // 样式覆盖
  avatarStyle: avatarStyleProp,
  containerStyle: containerStyleProp,
  itemStyle: itemStyleProp,
}: BasicInfoHeaderProps) {
  if (!basicInfo) return null

  // 统一意图模式：优先使用新 intentionMode，回退到旧 prop
  const resolvedIntentionMode = intentionMode
    || (variant === 'left' ? blackWhiteIntentionMode : centerIntentionMode)

  const resolvedIconColor = iconColor || primaryColor

  // ── 样式 ──
  const iconStyle = makeIconStyle(resolvedIconColor, iconMarginRight ?? 5, iconFontSize)
  const textItemStyle = makeTextItemStyle(contactFontSize, textColor, itemStyleProp)

  const avatarStyle: CSSProperties = variant === 'sidebar'
    ? { width: 90, height: 90, objectFit: 'cover', borderRadius: '50%', ...avatarStyleProp }
    : { width: 88, height: 106, objectFit: 'cover', flexShrink: 0, ...avatarStyleProp }

  // 联系信息行布局
  const isCentered = variant === 'centered' || variant === 'sidebar'
  const rowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: isCentered ? 'center' : 'flex-start',
    flexWrap: 'wrap',
    gap: variant === 'sidebar' ? 8 : 12,
    marginBottom: variant === 'left' ? 2 : 4,
  }

  // ── 容器样式 ──
  const outerStyle: CSSProperties = variant === 'centered'
    ? {
        textAlign: 'center',
        marginBottom: 4,
        paddingBottom: 14,
        ...(showBottomBorder ? { borderBottom: `2px solid ${primaryColor}` } : {}),
        ...containerStyleProp,
      }
    : variant === 'sidebar'
      ? { marginBottom: 16, textAlign: 'center', ...containerStyleProp }
      : { ...containerStyleProp }

  const innerFlexStyle: CSSProperties = variant !== 'sidebar'
    ? { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 }
    : {}

  const nameAreaStyle: CSSProperties = variant !== 'sidebar'
    ? { flex: 1, minWidth: 0 }
    : {}

  // ── 渲染：联系信息 ──
  function renderContactItems() {
    if (contactItems.length === 0 && !showEmptyContactRow) return null
    if (contactItems.length === 0 && showEmptyContactRow) {
      return <div style={rowStyle} />
    }
    if (variant === 'sidebar') {
      return (
        <div style={{ marginBottom: 8 }}>
          {contactItems.map((item) => (
            <div key={item.field} style={{ ...textItemStyle, justifyContent: 'center', marginBottom: 4 }}>
              <span style={iconStyle}>{getContactIcon(item.field)}</span>
              {item.value}
            </div>
          ))}
        </div>
      )
    }
    return (
      <div style={rowStyle}>
        {contactItems.map((item) => (
          <span key={item.field} style={textItemStyle}>
            <span style={iconStyle}>{getContactIcon(item.field)}</span>
            {item.value}
          </span>
        ))}
      </div>
    )
  }

  // ── 渲染：额外信息 ──
  function renderExtraItems() {
    if (extraDisplayItems.length === 0) return null
    if (variant === 'sidebar') {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {extraDisplayItems.map((item) => {
            const showIcon = !fieldIcons || item.field in fieldIcons
            return (
              <span key={item.field} style={textItemStyle}>
                {showIcon && <span style={iconStyle}>{getExtraFieldIcon(item.field, item.value)}</span>}
                {item.value}
              </span>
            )
          })}
        </div>
      )
    }
    return (
      <div style={rowStyle}>
        {extraDisplayItems.map((item) => {
          const showIcon = !fieldIcons || item.field in fieldIcons
          return (
            <span key={item.field} style={textItemStyle}>
              {showIcon && <span style={iconStyle}>{getExtraFieldIcon(item.field, item.value)}</span>}
              {item.value}
            </span>
          )
        })}
      </div>
    )
  }

  // ── 渲染：求职意向 ──
  function renderIntentionItems() {
    if (intentionItems.length === 0) return null

    // sidebar：每项独立行
    if (variant === 'sidebar') {
      return (
        <div>
          {intentionItems.map((item) => (
            <div
              key={item.field}
              style={{ ...textItemStyle, justifyContent: 'center', fontSize: intentionFontSize, marginBottom: 4 }}
            >
              <span style={iconStyle}>{getIntentionIcon(item.icon)}</span>
              {item.value}
            </div>
          ))}
        </div>
      )
    }

    // joined：所有项在一行
    if (resolvedIntentionMode === 'joined') {
      return (
        <div style={{ fontSize: intentionFontSize, color: intentionColor, marginTop: 4 }}>
          {intentionItems.map((item) => (
            <span key={item.field} style={{ ...textItemStyle, marginRight: 12 }}>
              <span style={iconStyle}>{getIntentionIcon(item.icon)}</span>
              {item.value}
            </span>
          ))}
        </div>
      )
    }

    // spaced：居中 flex 换行
    if (resolvedIntentionMode === 'spaced') {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: intentionFontSize,
            color: intentionColor,
            marginTop: 4,
          }}
        >
          {intentionItems.map((item) => (
            <span key={item.field} style={textItemStyle}>
              <span style={iconStyle}>{getIntentionIcon(item.icon)}</span>
              {item.value}
            </span>
          ))}
        </div>
      )
    }

    // single：只显示第一项
    if (resolvedIntentionMode === 'single') {
      return (
        <div style={{ fontSize: intentionFontSize, color: intentionColor }}>
          {intentionItems[0].value}
        </div>
      )
    }

    // items：左对齐 flex 换行（black-white 默认）
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 2 }}>
        {intentionItems.map((item) => (
          <span
            key={item.field}
            style={{ ...textItemStyle, fontSize: intentionFontSize, color: intentionColor }}
          >
            <span style={iconStyle}>{getIntentionIcon(item.icon)}</span>
            {item.value}
          </span>
        ))}
      </div>
    )
  }

  const avatarNode = showAvatar && basicInfo.avatar && (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={basicInfo.avatar} alt="" style={avatarStyle} />
  )
  const contentNode = (
    <div style={nameAreaStyle}>
      {showName && (
        <div
          style={{
            fontSize: nameFontSize,
            fontWeight: 'bold',
            color: primaryColor,
            marginBottom: 6,
          }}
        >
          {basicInfo.name || '您的姓名'}
        </div>
      )}
      {renderContactItems()}
      {renderExtraItems()}
      {renderIntentionItems()}
    </div>
  )

  // ── 组装 ──
  return (
    <div style={outerStyle}>
      <div style={innerFlexStyle}>
        {avatarLeft && avatarNode}
        {contentNode}
        {!avatarLeft && avatarNode}
      </div>
    </div>
  )
}
