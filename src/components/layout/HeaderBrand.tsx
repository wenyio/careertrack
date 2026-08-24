/**
 * Shared brand mark for application headers.
 */

'use client'

import BrandMark from './BrandMark'
import { useI18n } from '@/i18n'

interface HeaderBrandProps {
  onClick?: () => void
  ariaLabel?: string
}

export default function HeaderBrand({
  onClick,
  ariaLabel,
}: HeaderBrandProps) {
  const { t } = useI18n()

  return (
    <>
      <button
        type="button"
        className="header-brand"
        onClick={onClick}
        aria-label={ariaLabel || t('nav.backToResumes')}
      >
        <BrandMark className="header-brand-mark" />
        <span className="header-brand-text">{t('common.brandShort')}</span>
      </button>

      <style jsx global>{`
        .header-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          border: 0;
          padding: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          line-height: 1;
          white-space: nowrap;
        }

        .header-brand-text {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
      `}</style>
    </>
  )
}
