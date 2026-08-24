/**
 * 富文本工具栏的独立控件
 *
 * 这些控件拥有各自的选择值、Popover 或链接输入状态；与主工具栏布局分离后，
 * 链接、颜色和排版交互可以独立维护。
 */

'use client'

import {
  Button,
  ColorPicker,
  Input,
  Modal,
  Popover,
  Select,
  Space,
  Tooltip,
} from 'antd'
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  FontColorsOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { isSafeUrl } from '@/utils/rich-text'
import { useI18n } from '@/i18n'

const FONT_SIZES = [
  '12px', '13px', '14px', '15px', '16px',
  '18px', '20px', '24px', '28px', '32px',
]
const LINE_HEIGHTS = ['1', '1.15', '1.5', '1.75', '2', '2.5', '3']
const COLORS = [
  '#000000', '#333333', '#666666', '#999999',
  '#e02020', '#e67e22', '#f6b93b', '#27ae60',
  '#2980b9', '#8e44ad', '#1677ff', '#eb2f96',
]

/** 字号选择器 */
export function FontSizeSelect({ editor }: { editor: Editor }) {
  const { t } = useI18n()
  const currentSize = editor.getAttributes('textStyle').fontSize as string | undefined

  return (
    <Tooltip title={t('resumeEditor.richText.fontSize')}>
      <Select
        aria-label={t('resumeEditor.richText.fontSizeAria')}
        value={currentSize || undefined}
        placeholder={t('resumeEditor.richText.fontSize')}
        style={{ width: 72, fontSize: 12 }}
        size="small"
        variant="borderless"
        popupMatchSelectWidth={false}
        onChange={(value: string) => {
          if (value) {
            editor.chain().focus().setFontSize(value).run()
          } else {
            editor.chain().focus().unsetFontSize().run()
          }
        }}
        allowClear
        options={FONT_SIZES.map((value) => ({ value, label: value }))}
      />
    </Tooltip>
  )
}

/** 行高选择器 */
export function LineHeightSelect({ editor }: { editor: Editor }) {
  const { t } = useI18n()
  const currentLineHeight =
    editor.getAttributes('paragraph').lineHeight
    || editor.getAttributes('listItem').lineHeight
    || undefined

  return (
    <Tooltip title={t('resumeEditor.richText.lineHeight')}>
      <Select
        aria-label={t('resumeEditor.richText.lineHeightAria')}
        value={currentLineHeight || undefined}
        placeholder={t('resumeEditor.richText.lineHeight')}
        style={{ width: 68, fontSize: 12 }}
        size="small"
        variant="borderless"
        popupMatchSelectWidth={false}
        onChange={(value: string) => {
          if (value) {
            editor.chain().focus().setLineHeight(value).run()
          } else {
            editor.chain().focus().unsetLineHeight().run()
          }
        }}
        allowClear
        options={LINE_HEIGHTS.map((value) => ({ value, label: value }))}
      />
    </Tooltip>
  )
}

/** 颜色控制 */
export function ColorControl({ editor }: { editor: Editor }) {
  const { t } = useI18n()
  const currentColor = (editor.getAttributes('textStyle').color as string) || '#000000'

  return (
    <Tooltip title={t('resumeEditor.richText.fontColor')}>
      <Popover
        trigger="click"
        placement="bottomLeft"
        arrow={false}
        content={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, width: 160 }}>
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                aria-label={t('resumeEditor.richText.colorAria', { color })}
                onClick={() => editor.chain().focus().setColor(color).run()}
                style={{
                  width: 22,
                  height: 22,
                  backgroundColor: color,
                  border: currentColor === color
                    ? '2px solid #1677ff'
                    : '1px solid #e0e0e0',
                  borderRadius: 3,
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
            <ColorPicker
              size="small"
              value={currentColor}
              onChange={(_, hex) => editor.chain().focus().setColor(hex).run()}
            />
            <button
              type="button"
              title={t('resumeEditor.richText.clearColor')}
              aria-label={t('resumeEditor.richText.clearColor')}
              onClick={() => editor.chain().focus().unsetColor().run()}
              style={{
                width: 22,
                height: 22,
                border: '1px solid #e0e0e0',
                borderRadius: 3,
                cursor: 'pointer',
                padding: 0,
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                backgroundColor: '#fff',
              }}
            >
              ✕
            </button>
          </div>
        }
      >
        <Button
          aria-label={t('resumeEditor.richText.fontColor')}
          size="small"
          type="text"
          icon={<FontColorsOutlined />}
          style={{ color: currentColor !== '#000000' ? currentColor : undefined }}
        />
      </Popover>
    </Tooltip>
  )
}

/** 链接控制 */
export function LinkControl({ editor }: { editor: Editor }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')

  const handleConfirm = useCallback(() => {
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run()
    } else {
      let finalUrl = url.trim()
      if (
        !/^https?:\/\//i.test(finalUrl)
        && !finalUrl.startsWith('mailto:')
        && !finalUrl.startsWith('tel:')
      ) {
        finalUrl = `https://${finalUrl}`
      }
      if (!isSafeUrl(finalUrl)) {
        Modal.warning({
          title: t('resumeEditor.richText.invalidLinkProtocolTitle'),
          content: t('resumeEditor.richText.invalidLinkProtocolContent'),
        })
        return
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run()
    }
    setOpen(false)
    setUrl('')
  }, [editor, t, url])

  return (
    <Space size={0}>
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger="click"
        placement="bottomLeft"
        arrow={false}
        content={
          <Space.Compact style={{ width: 260 }}>
            <Input
              aria-label={t('resumeEditor.richText.linkAddress')}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              size="small"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleConfirm()
                }
                if (event.key === 'Escape') {
                  setOpen(false)
                  setUrl('')
                }
              }}
            />
            <Button size="small" type="primary" onClick={handleConfirm}>
              {t('common.confirm')}
            </Button>
          </Space.Compact>
        }
      >
        <Tooltip title={t('resumeEditor.richText.insertEditLink')}>
          <Button
            aria-label={t('resumeEditor.richText.insertOrEditLink')}
            size="small"
            type="text"
            icon={<LinkOutlined />}
            style={editor.isActive('link')
              ? { color: '#1677ff', backgroundColor: '#e6f4ff' }
              : undefined}
          />
        </Tooltip>
      </Popover>
      <Tooltip title={t('resumeEditor.richText.removeLink')}>
        <Button
          aria-label={t('resumeEditor.richText.removeLink')}
          size="small"
          type="text"
          disabled={!editor.isActive('link')}
          onClick={() => editor.chain().focus().unsetLink().run()}
          style={{ fontSize: 11 }}
        >
          ✕
        </Button>
      </Tooltip>
    </Space>
  )
}

/** 两端对齐图标（Ant Design 无内置图标） */
function AlignJustifyIcon() {
  return (
    <span aria-hidden="true" className="anticon anticon-align-justify">
      <svg
        viewBox="0 0 1024 1024"
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M128 192h768a42.67 42.67 0 0 0 0-85.33H128a42.67 42.67 0 1 0 0 85.33zm768 213.33H128a42.67 42.67 0 0 0 0 85.34h768a42.67 42.67 0 0 0 0-85.34zM128 618.67h768a42.67 42.67 0 0 0 0-85.34H128a42.67 42.67 0 1 0 0 85.34zm768 213.33H128a42.67 42.67 0 0 0 0 85.33h768a42.67 42.67 0 0 0 0-85.33z" />
      </svg>
    </span>
  )
}

/** 对齐按钮组 */
export function AlignButtons({ editor }: { editor: Editor }) {
  const { t } = useI18n()
  const alignments = [
    { value: 'left', icon: <AlignLeftOutlined />, title: t('resumeEditor.richText.alignLeft') },
    { value: 'center', icon: <AlignCenterOutlined />, title: t('resumeEditor.richText.alignCenter') },
    { value: 'right', icon: <AlignRightOutlined />, title: t('resumeEditor.richText.alignRight') },
    { value: 'justify', icon: <AlignJustifyIcon />, title: t('resumeEditor.richText.alignJustify') },
  ] as const

  return (
    <Space size={0}>
      {alignments.map(({ value, icon, title }) => (
        <Tooltip key={value} title={title}>
          <Button
            aria-label={title}
            size="small"
            type="text"
            icon={icon}
            style={editor.isActive({ textAlign: value })
              ? { color: '#1677ff', backgroundColor: '#e6f4ff' }
              : undefined}
            onClick={() => editor.chain().focus().setTextAlign(value).run()}
          />
        </Tooltip>
      ))}
    </Space>
  )
}
