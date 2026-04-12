'use client'

import type { ReactNode } from 'react'
import { OnyxDonorCardV2 } from './onyx-donor-card-v2'

export type OnyxDonorDocumentCardV2Props = {
  icon: ReactNode
  title: string
  eyebrow?: string
  meta?: string
  body?: string
  className?: string
  testId?: string
}

export function OnyxDonorDocumentCardV2({
  body,
  className,
  eyebrow,
  icon,
  meta,
  testId,
  title
}: OnyxDonorDocumentCardV2Props) {
  return (
    <OnyxDonorCardV2
      className={['onyx-native-donor-document-card', className].filter(Boolean).join(' ')}
      data-testid={testId ?? 'onyx-native-donor-document-card'}
      padding="none"
      variant="primary"
    >
      <div className="onyx-native-donor-document-card-button">
        <div className="onyx-native-donor-document-card-head">
          <span className="onyx-native-donor-document-card-icon">{icon}</span>
          <div className="onyx-native-donor-document-card-title-wrap">
            <div className="onyx-native-donor-document-card-title">{title}</div>
            {eyebrow ? <div className="onyx-native-donor-document-card-eyebrow">{eyebrow}</div> : null}
          </div>
        </div>
        {body || meta ? (
          <div className="onyx-native-donor-document-card-copy">
            {meta ? <div className="onyx-native-donor-document-card-meta">{meta}</div> : null}
            {body ? <div className="onyx-native-donor-document-card-body">{body}</div> : null}
          </div>
        ) : null}
      </div>
    </OnyxDonorCardV2>
  )
}
