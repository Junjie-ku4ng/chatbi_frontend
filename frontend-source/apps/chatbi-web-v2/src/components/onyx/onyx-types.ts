'use client'

import type { SVGProps } from 'react'

export type OnyxButtonType = 'submit' | 'button' | 'reset'
export type OnyxContainerSizeVariant = 'fit' | 'lg' | 'md' | 'sm' | 'xs' | '2xs'
export type OnyxExtremaSizeVariant = 'fit' | 'full'
export type OnyxRoundingVariant = 'lg' | 'md' | 'sm' | 'xs'
export type OnyxIconComponent = React.FunctionComponent<SVGProps<SVGSVGElement> & { size?: number }>

export const onyxContainerSizeVariants: Record<
  OnyxContainerSizeVariant,
  { height: string; minWidth: string; padding: string }
> = {
  fit: { height: 'h-fit', minWidth: '', padding: 'p-0' },
  lg: { height: 'h-[2.25rem]', minWidth: 'min-w-[2.25rem]', padding: 'p-2' },
  md: { height: 'h-[1.75rem]', minWidth: 'min-w-[1.75rem]', padding: 'p-1' },
  sm: { height: 'h-[1.5rem]', minWidth: 'min-w-[1.5rem]', padding: 'p-1' },
  xs: { height: 'h-[1.25rem]', minWidth: 'min-w-[1.25rem]', padding: 'p-0.5' },
  '2xs': { height: 'h-[1rem]', minWidth: 'min-w-[1rem]', padding: 'p-0.5' }
}

export const onyxWidthVariants: Record<OnyxExtremaSizeVariant, string> = {
  fit: 'w-fit',
  full: 'w-full'
}
