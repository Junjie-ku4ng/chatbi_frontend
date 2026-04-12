'use client'

import { ReactNode } from 'react'

export function DetailDrawer({
  title,
  open,
  onClose,
  children,
  testId
}: {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  testId?: string
}) {
  if (!open) {
    return null
  }

  return (
    <div
      data-testid={testId}
      className="nx-detail-drawer"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="nx-detail-drawer-head">
        <strong>{title}</strong>
        <button
          type="button"
          onClick={onClose}
          className="nx-detail-drawer-close"
        >
          Close
        </button>
      </div>
      <div className="nx-detail-drawer-body">{children}</div>
    </div>
  )
}
