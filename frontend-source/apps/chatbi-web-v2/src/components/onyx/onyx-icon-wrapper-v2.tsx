'use client'

import { cn } from '@/lib/utils'
import type { OnyxContainerSizeVariant, OnyxIconComponent } from '@/components/onyx/onyx-types'

const iconVariants = {
  lg: { padding: 'p-0.5', size: 1 },
  md: { padding: 'p-0.5', size: 1 },
  sm: { padding: 'p-0', size: 1 },
  xs: { padding: 'p-0.5', size: 0.75 },
  '2xs': { padding: 'p-0', size: 0.75 },
  fit: { padding: 'p-0.5', size: 1 }
} as const

export function onyxIconWrapper(
  Icon: OnyxIconComponent | undefined,
  size: OnyxContainerSizeVariant,
  includeSpacer: boolean
) {
  const { padding, size: iconSize } = iconVariants[size]

  if (Icon) {
    return (
      <div className={cn('interactive-foreground-icon', padding)}>
        <Icon
          className="shrink-0"
          style={{
            height: `${iconSize}rem`,
            width: `${iconSize}rem`
          }}
        />
      </div>
    )
  }

  if (includeSpacer) {
    return <div />
  }

  return null
}
