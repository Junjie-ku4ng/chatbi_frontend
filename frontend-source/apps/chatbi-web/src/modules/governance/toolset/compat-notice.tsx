'use client'

import Link from 'next/link'
import { NexusBadge } from '@/modules/shared/ui/primitives'

export function ToolsetCompatNotice({
  canonicalHref,
  canonicalLabel = 'Canonical owner'
}: {
  canonicalHref?: string
  canonicalLabel?: string
}) {
  return (
    <div className="nexus-chip-row">
      <NexusBadge data-testid="toolset-compat-notice" tone="neutral">
        Compatibility surface
      </NexusBadge>
      <NexusBadge tone="warn">Historical toolset route</NexusBadge>
      {canonicalHref ? (
        <Link data-testid="toolset-canonical-owner-link" href={canonicalHref} className="badge badge-ok">
          {canonicalLabel}
        </Link>
      ) : null}
    </div>
  )
}
