/**
 * One-time recovery code disclosure.
 *
 * Recovery codes are intentionally received through props and never persisted
 * by this component. Closing the panel removes the only client-side copy.
 */

'use client'

import { Alert, Button, Space, Typography } from 'antd'
import { useI18n } from '@/i18n'

const { Text } = Typography

interface OtpRecoveryCodesPanelProps {
  codes: string[]
  onConfirmSaved: () => void
}

export default function OtpRecoveryCodesPanel({
  codes,
  onConfirmSaved,
}: OtpRecoveryCodesPanelProps) {
  const { t } = useI18n()

  return (
    <div>
      <Alert
        type="warning"
        showIcon
        title={t('security.saveRecoveryCodesNow')}
        description={t('security.recoveryCodesDescription')}
        style={{ marginBottom: 16 }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 8,
          padding: 16,
          marginBottom: 16,
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: 10,
        }}
      >
        {codes.map((code) => (
          <Text code key={code} style={{ textAlign: 'center' }}>
            {code}
          </Text>
        ))}
      </div>
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Text copyable={{ text: codes.join('\n') }}>
          {t('security.copyAllRecoveryCodes')}
        </Text>
        <Button
          type="primary"
          block
          onClick={onConfirmSaved}
          style={{ height: 42, borderRadius: 8 }}
        >
          {t('security.recoveryCodesSaved')}
        </Button>
      </Space>
    </div>
  )
}
