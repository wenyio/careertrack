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
      message.success('链接已复制')
      setTimeout(() => setCopied(false), 2000)
    } else {
      message.error('复制失败，请手动复制')
    }
  }

  const handleCopyPreview = async () => {
    if (!previewUrl) return
    const success = await copyToClipboard(previewUrl)
    if (success) {
      setPreviewCopied(true)
      message.success('预览链接已复制')
      setTimeout(() => setPreviewCopied(false), 2000)
    } else {
      message.error('复制失败，请手动复制')
    }
  }

  const handleGeneratePreview = useCallback(async () => {
    setPreviewLoading(true)
    try {
      const result = await getPreviewToken(resumeId)
      setPreviewUrl(`${origin}${result.preview_url}`)
    } catch {
      message.error('生成预览链接失败')
    } finally {
      setPreviewLoading(false)
    }
  }, [resumeId, origin, message])

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
        <Text strong>公开简历</Text>
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
              <img src={qrDataUrl} alt="QR Code" style={{ width: 90, height: 90, borderRadius: 4 }} />
            )}
            <div style={{ flex: 1, paddingTop: 2 }}>
              <Button
                size="small"
                icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                onClick={handleCopyLink}
                style={{ marginBottom: 8 }}
              >
                {copied ? '已复制' : '复制链接'}
              </Button>
              <div style={{ fontSize: 11, color: '#999', lineHeight: 1.5 }}>
                分享此链接给招聘方，无需登录即可查看
              </div>
            </div>
          </div>
        </div>
      ) : !publicSlug ? (
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 1.5 }}>
            打开开关即可生成公开链接
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
            打开开关即可重新公开此简历
          </div>
        </div>
      )}

      {/* 未公开时显示临时预览链接 */}
      {!isPublic && (
        <>
          <Divider style={{ margin: '14px 0 12px' }} />
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8, lineHeight: 1.5 }}>
              临时预览链接（24 小时有效）
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
                  {previewCopied ? '已复制' : '复制链接'}
                </Button>
              </>
            ) : (
              <Button
                size="small"
                icon={<LinkOutlined />}
                loading={previewLoading}
                onClick={handleGeneratePreview}
              >
                生成临时预览链接
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
