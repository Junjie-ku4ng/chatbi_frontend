'use client'

import type React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'
import { guardPortalClick } from '@/components/onyx/onyx-interactive-helpers'
import type { OnyxButtonType } from '@/components/onyx/onyx-types'

type InteractiveStatefulVariant =
  | 'select-light'
  | 'select-heavy'
  | 'select-card'
  | 'select-tinted'
  | 'select-filter'
  | 'sidebar-heavy'
  | 'sidebar-light'

type InteractiveStatefulState = 'empty' | 'filled' | 'selected'
type InteractiveStatefulInteraction = 'rest' | 'hover' | 'active'

type OnyxInteractiveStatefulV2Props = React.HTMLAttributes<HTMLElement> & {
  disabled?: boolean
  group?: string
  href?: string
  interaction?: InteractiveStatefulInteraction
  ref?: React.Ref<HTMLElement>
  state?: InteractiveStatefulState
  target?: string
  type?: OnyxButtonType
  variant?: InteractiveStatefulVariant
}

export type { InteractiveStatefulVariant }

export function OnyxInteractiveStatefulV2({
  disabled,
  group,
  href,
  interaction = 'rest',
  ref,
  state = 'empty',
  target,
  type,
  variant = 'select-heavy',
  ...props
}: OnyxInteractiveStatefulV2Props) {
  const classes = cn(
    'interactive',
    !props.onClick && !href && !type && '!cursor-default !select-auto',
    group
  )

  const dataAttrs = {
    'data-disabled': disabled ? 'true' : undefined,
    'data-interactive-state': state,
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
