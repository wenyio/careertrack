'use client'

import { Button, Dropdown } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { useI18n } from '@/i18n'
import type { Locale } from '@/i18n'

const localeLabels: Record<Locale, string> = {
  'zh-CN': '中文',
  'en-US': 'English',
}

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <Dropdown
      menu={{
        selectedKeys: [locale],
        items: [
          { key: 'zh-CN', label: localeLabels['zh-CN'] },
          { key: 'en-US', label: localeLabels['en-US'] },
        ],
        onClick: ({ key }) => setLocale(key as Locale),
      }}
      trigger={['click']}
      placement="bottomRight"
    >
      <Button
        type="text"
        icon={<GlobalOutlined />}
        aria-label={t('locale.label')}
      >
        {locale === 'en-US' ? 'EN' : '中'}
      </Button>
    </Dropdown>
  )
}
