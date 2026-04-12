'use client'

import type React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'
import { guardPortalClick } from '@/components/onyx/onyx-interactive-helpers'
import type { OnyxButtonType } from '@/components/onyx/onyx-types'

type InteractiveStatelessVariant = 'default' | 'action' | 'danger'
type InteractiveStatelessProminence = 'primary' | 'secondary' | 'tertiary' | 'internal'
type InteractiveStatelessInteraction = 'rest' | 'hover' | 'active'

type OnyxInteractiveStatelessV2Props = React.HTMLAttributes<HTMLElement> & {
  disabled?: boolean
  group?: string
  href?: string
  interaction?: InteractiveStatelessInteraction
  prominence?: InteractiveStatelessProminence
  ref?: React.Ref<HTMLElement>
  target?: string
  type?: OnyxButtonType
  variant?: InteractiveStatelessVariant
}

export function OnyxInteractiveStatelessV2({
  disabled,
  group,
  href,
  interaction = 'rest',
  prominence = 'primary',
  ref,
  target,
  type,
  variant = 'default',
  ...props
}: OnyxInteractiveStatelessV2Props) {
  const classes = cn(
    'interactive',
    !props.onClick && !href && !type && '!cursor-default !select-auto',
    group
  )

  const dataAttrs = {
    'data-disabled': disabled ? 'true' : undefined,
    'data-interactive-prominence': prominence,
    'data-interactive-variant': variant,
    'data-interaction': interaction !== 'rest' ? interaction : undefined,
    'aria-disabled': disabled || undefined
  }

  const { onClick, ...slotProps } = props

  const linkAttrs = href
    ? {
        href: disabled ? undefined : href,
        rel: target === '_blank' ? 'noopener noreferrer' : undefined,
        target
      }
    : {}

  return (
    <Slot
      ref={ref}
      className={classes}
      onClick={
        disabled
          ? href
            ? (event: React.MouseEvent) => event.preventDefault()
            : undefined
          : guardPortalClick(onClick)
      }
      {...dataAttrs}
      {...linkAttrs}
      {...slotProps}
    />
  )
}
