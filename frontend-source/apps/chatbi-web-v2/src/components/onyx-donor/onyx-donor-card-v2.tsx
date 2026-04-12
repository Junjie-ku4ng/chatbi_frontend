'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type OnyxDonorCardVariant = 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'borderless'

type OnyxDonorCardV2Props = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode
  padding?: 'none' | 'sm' | 'md'
  variant?: OnyxDonorCardVariant
  'data-testid'?: string
}

const paddingClassByVariant: Record<NonNullable<OnyxDonorCardV2Props['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4'
}

export function OnyxDonorCardV2({
  children,
  className,
  padding = 'md',
  variant = 'primary',
  ...rest
}: OnyxDonorCardV2Props) {
  return (
    <div
      {...rest}
      className={cn('onyx-native-donor-card', `onyx-native-donor-card-${variant}`, className)}
      data-testid={rest['data-testid']}
      data-variant={variant}
    >
      <div
        className={cn('onyx-native-donor-card-section onyx-native-donor-card-surface', paddingClassByVariant[padding])}
        data-testid="onyx-native-donor-card"
      >
        {children}
      </div>
    </div>
  )
}
