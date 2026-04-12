'use client'

import type React from 'react'
import { cn } from '@/lib/utils'
import {
  onyxContainerSizeVariants,
  type OnyxButtonType,
  type OnyxContainerSizeVariant,
  type OnyxExtremaSizeVariant,
  onyxWidthVariants,
  type OnyxRoundingVariant
} from '@/components/onyx/onyx-types'

type InteractiveContainerRoundingVariant = Extract<OnyxRoundingVariant, 'md' | 'sm' | 'xs'>

const interactiveContainerRoundingVariants: Record<InteractiveContainerRoundingVariant, string> = {
  md: 'rounded-12',
  sm: 'rounded-08',
  xs: 'rounded-04'
}

type InteractiveContainerSharedProps = {
  border?: boolean
  roundingVariant?: InteractiveContainerRoundingVariant
  widthVariant?: OnyxExtremaSizeVariant
  heightVariant?: OnyxContainerSizeVariant
}

type OnyxInteractiveContainerAnchorProps = InteractiveContainerSharedProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'ref' | 'type'> & {
    href?: string
    ref?: React.Ref<HTMLAnchorElement>
    type?: undefined
  }

type OnyxInteractiveContainerButtonProps = InteractiveContainerSharedProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'href' | 'ref'> & {
    href?: undefined
    ref?: React.Ref<HTMLButtonElement>
    type: OnyxButtonType
  }

type OnyxInteractiveContainerDivProps = InteractiveContainerSharedProps &
  Omit<React.HTMLAttributes<HTMLDivElement>, 'ref'> & {
    href?: undefined
    ref?: React.Ref<HTMLDivElement>
    type?: undefined
  }

export type OnyxInteractiveContainerV2Props =
  | OnyxInteractiveContainerAnchorProps
  | OnyxInteractiveContainerButtonProps
  | OnyxInteractiveContainerDivProps

export function OnyxInteractiveContainerV2({
  border,
  roundingVariant = 'md',
  widthVariant = 'fit',
  heightVariant = 'lg',
  ...props
}: OnyxInteractiveContainerV2Props) {
  const { height, minWidth, padding } = onyxContainerSizeVariants[heightVariant]
  const resolveSharedProps = (className?: string, style?: React.CSSProperties) => ({
    className: cn(
      'interactive-container',
      interactiveContainerRoundingVariants[roundingVariant],
      height,
      minWidth,
      padding,
      onyxWidthVariants[widthVariant],
      className
    ),
    'data-border': border ? 'true' : undefined,
    style
  })

  if ('type' in props && props.type) {
    const { ref, type, className, style, ...rest } = props as OnyxInteractiveContainerButtonProps
    const ariaDisabled = (rest as Record<string, unknown>)['aria-disabled']
    const nativeDisabled = ariaDisabled === true || ariaDisabled === 'true' || undefined

    return (
      <button
        disabled={nativeDisabled}
        ref={ref}
        type={type}
        {...rest}
        {...resolveSharedProps(className, style)}
      />
    )
  }

  if ('href' in props) {
    const { ref, className, style, ...rest } = props as OnyxInteractiveContainerAnchorProps
    return (
      <a
        ref={ref}
        {...rest}
        {...resolveSharedProps(className, style)}
      />
    )
  }

  const { ref, className, style, ...rest } = props as OnyxInteractiveContainerDivProps

  return <div ref={ref} {...rest} {...resolveSharedProps(className, style)} />
}
