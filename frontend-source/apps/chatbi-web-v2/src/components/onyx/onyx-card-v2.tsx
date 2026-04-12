'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type OnyxCardV2Props = HTMLAttributes<HTMLDivElement> & {
  background?: 'none' | 'light' | 'heavy'
  border?: 'none' | 'dashed' | 'solid'
  children?: ReactNode
  padding?: 'fit' | '2xs' | 'xs' | 'sm' | 'md' | 'lg'
  rounding?: 'xs' | 'sm' | 'md' | 'lg'
}

const paddingVariants: Record<NonNullable<OnyxCardV2Props['padding']>, string> = {
  fit: 'p-0',
  '2xs': 'p-0.5',
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6'
}

const roundingVariants: Record<NonNullable<OnyxCardV2Props['rounding']>, string> = {
  xs: 'rounded-04',
  sm: 'rounded-08',
  md: 'rounded-12',
  lg: 'rounded-16'
}

export function OnyxCardV2({
  background = 'light',
  border = 'none',
  children,
  className,
  padding = 'md',
  rounding = 'md',
  ...rest
}: OnyxCardV2Props) {
  return (
    <div
      {...rest}
      className={cn('opal-card', paddingVariants[padding], roundingVariants[rounding], className)}
      data-background={background}
      data-border={border}
    >
      {children}
    </div>
  )
}
