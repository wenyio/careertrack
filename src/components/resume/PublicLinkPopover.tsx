/**
 * 公开链接 Popover 内容组件
 *
 * 编辑页工具栏和简历列表页共用：
 * - Switch 开关控制是否公开
 * - 公开后显示链接、二维码、复制按钮
 * - 未公开时显示 slug 输入框 + 临时预览链接
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Input, Switch, Typography, App, Divider } from 'antd'
import { CopyOutlined, CheckOutlined, LinkOutlined } from '@ant-design/icons'
import QRCode from 'qrcode'
import { getPreviewToken } from '@/services/resume'
import { useI18n } from '@/i18n'

const { Text } = Typography

interface PublicLinkPopoverProps {
  isPublic: boolean
  publicSlug: string | null
  resumeId: string
  resumeName: string
  onTogglePublic: (isPublic: boolean, slug?: string) => void
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/(^-|-$)/g, '') || ''
}

export default function PublicLinkPopover({ isPublic, publicSlug, resumeId, resumeName, onTogglePublic }: PublicLinkPopoverProps) {
  const { message } = App.useApp()
  const { t } = useI18n()
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  // slug 编辑状态：用户手动修改后锁定，不再跟随 resumeName 自动更新
  const defaultSlug = nameToSlug(resumeName)
  const [slugInput, setSlugInput] = useState(defaultSlug)
  const [slugTouched, setSlugTouched] = useState(false)
  const displayedSlug = slugTouched ? slugInput : defaultSlug
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewCopied, setPreviewCopied] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const publicUrl = publicSlug ? `${origin}/resume/${publicSlug}` : ''

  // 生成二维码
  useEffect(() => {
    if (isPublic && publicUrl) {
      QRCode.toDataURL(publicUrl, { width: 120, margin: 1 }).then(setQrDataUrl)
    }
  }, [isPublic, publicUrl])

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        // 降级
      }
    }
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '-9999px'
      textarea.setAttribute('readonly', '')
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      // Clipboard API 的兼容降级，供不支持 navigator.clipboard 的旧浏览器使用。
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    } catch {
      return false
    }
  }

  const handleCopyLink = async () => {
    if (!publicUrl) return
    const success = await copyToClipboard(publicUrl)
    if (success) {
      setCopied(true)
      message.success(t('publicLink.linkCopied'))
      setTimeout(() => setCopied(false), 2000)
    } else {
      message.error(t('publicLink.copyFailed'))
    }
  }

  const handleCopyPreview = async () => {
    if (!previewUrl) return
    const success = await copyToClipboard(previewUrl)
    if (success) {
      setPreviewCopied(true)
      message.success(t('publicLink.previewCopied'))
      setTimeout(() => setPreviewCopied(false), 2000)
    } else {
      message.error(t('publicLink.copyFailed'))
    }
  }

  const handleGeneratePreview = useCallback(async () => {
    setPreviewLoading(true)
    try {
      const result = await getPreviewToken(resumeId)
      setPreviewUrl(`${origin}${result.preview_url}`)
    } catch {
      message.error(t('publicLink.generateFailed'))
    } finally {
      setPreviewLoading(false)
    }
  }, [resumeId, origin, message, t])

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onTogglePublic(false)
      return
    }
    if (publicSlug) {
      onTogglePublic(true)
      return
    }
    const slug = displayedSlug.trim() || nameToSlug(resumeName)
    if (slug) {
      onTogglePublic(true, slug)
    }
  }

  return (
    <div style={{ width: 340, padding: '4px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong>{t('publicLink.title')}</Text>
        <Switch size="small" checked={isPublic} disabled={!isPublic && !publicSlug && !displayedSlug.trim()} onChange={handleToggle} />
      </div>

      {isPublic && publicUrl ? (
        <div>
          <div style={{
            padding: '8px 10px',
            backgroundColor: '#f5f5f5',
            borderRadius: 6,
            fontSize: 12,
            color: '#666',
            wordBreak: 'break-all',
            lineHeight: 1.5,
            marginBottom: 14,
          }}>
            {publicUrl}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {qrDataUrl && (
              /* eslint-disable-next-line @next/next/no-img-element -- generated QR data URL */
              <img src={qrDataUrl} alt={t('publicLink.qrAlt')} style={{ width: 90, height: 90, borderRadius: 4 }} />
            )}
            <div style={{ flex: 1, paddingTop: 2 }}>
              <Button
                size="small"
                icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                onClick={handleCopyLink}
                style={{ marginBottom: 8 }}
              >
                {copied ? t('publicLink.copied') : t('publicLink.copyLink')}
              </Button>
              <div style={{ fontSize: 11, color: '#999', lineHeight: 1.5 }}>
                {t('publicLink.shareHint')}
              </div>
            </div>
          </div>
        </div>
      ) : !publicSlug ? (
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 1.5 }}>
            {t('publicLink.enableHint')}
          </div>
          <div style={{ display: 'flex', gap: 0 }}>
            <Input
              size="small"
              value={`${origin}/resume/`}
              disabled
              style={{ width: '66.67%', minWidth: 0, backgroundColor: '#f5f5f5', borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
            />
            <Input
              size="small"
              value={displayedSlug}
              onChange={(e) => { setSlugInput(e.target.value); setSlugTouched(true) }}
              placeholder="your-resume-name"
              style={{ flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
            />
          </div>
        </div>
      ) : (
        <div>
          <div style={{
            padding: '8px 10px',
            backgroundColor: '#f5f5f5',
            borderRadius: 6,
            fontSize: 12,
            color: '#666',
            wordBreak: 'break-all',
            lineHeight: 1.5,
          }}>
            {publicUrl}
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 8, lineHeight: 1.5 }}>
            {t('publicLink.reenableHint')}
          </div>
        </div>
      )}

      {/* 未公开时显示临时预览链接 */}
      {!isPublic && (
        <>
          <Divider style={{ margin: '14px 0 12px' }} />
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8, lineHeight: 1.5 }}>
              {t('publicLink.temporaryPreview')}
            </div>
            {previewUrl ? (
              <>
                <div style={{
                  padding: '8px 10px',
                  backgroundColor: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#333',
                  wordBreak: 'break-all',
                  lineHeight: 1.5,
                  marginBottom: 8,
                }}>
                  {previewUrl}
                </div>
                <Button
                  size="small"
                  icon={previewCopied ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={handleCopyPreview}
                >
                  {previewCopied ? t('publicLink.copied') : t('publicLink.copyLink')}
                </Button>
              </>
            ) : (
              <Button
                size="small"
                icon={<LinkOutlined />}
                loading={previewLoading}
                onClick={handleGeneratePreview}
              >
                {t('publicLink.generatePreview')}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
