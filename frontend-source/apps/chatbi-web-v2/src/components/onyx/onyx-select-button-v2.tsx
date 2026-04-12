'use client'

import type React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { OnyxTextV2 } from '@/components/onyx/onyx-text-v2'
import { onyxIconWrapper } from '@/components/onyx/onyx-icon-wrapper-v2'
import { OnyxInteractiveContainerV2 } from '@/components/onyx/onyx-interactive-container-v2'
import { OnyxInteractiveStatefulV2, type InteractiveStatefulVariant } from '@/components/onyx/onyx-interactive-stateful-v2'
import type { OnyxContainerSizeVariant, OnyxExtremaSizeVariant, OnyxIconComponent } from '@/components/onyx/onyx-types'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

type OnyxSelectButtonV2Props =
  | ({
      foldable: true
      icon: OnyxIconComponent
      children: string
      rightIcon?: OnyxIconComponent
    } & SharedProps)
  | ({
      foldable?: false
      icon?: OnyxIconComponent
      children?: string
      rightIcon?: OnyxIconComponent
    } & SharedProps)

type SharedProps = {
  disabled?: boolean
  size?: OnyxContainerSizeVariant
  state?: 'empty' | 'filled' | 'selected'
  tooltip?: string
  tooltipSide?: TooltipSide
  variant?: InteractiveStatefulVariant
  width?: OnyxExtremaSizeVariant
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export function OnyxSelectButtonV2({
  icon,
  children,
  rightIcon,
  size = 'lg',
  foldable,
  width,
  tooltip,
  tooltipSide = 'top',
  disabled,
  state = 'empty',
  variant = 'select-heavy',
  ...buttonProps
}: OnyxSelectButtonV2Props) {
  const isLarge = size === 'lg'
  const { onClick, ...containerProps } = buttonProps

  const labelEl = children ? (
    <OnyxTextV2 color="inherit" font={isLarge ? 'main-ui-body' : 'secondary-body'} nowrap>
      {children}
    </OnyxTextV2>
  ) : null

  const button = (
    <OnyxInteractiveStatefulV2 disabled={disabled} onClick={onClick} state={state} type="button" variant={variant}>
      <OnyxInteractiveContainerV2
        heightVariant={size}
        roundingVariant={isLarge ? 'md' : size === '2xs' ? 'xs' : 'sm'}
        type="button"
        widthVariant={width}
        {...containerProps}
      >
        <div className={`opal-select-button${foldable ? ' interactive-foldable-host' : ''}`}>
          {onyxIconWrapper(icon, size, !foldable && Boolean(children))}
          {labelEl}
          {onyxIconWrapper(rightIcon, size, Boolean(children))}
        </div>
      </OnyxInteractiveContainerV2>
    </OnyxInteractiveStatefulV2>
  )

  const resolvedTooltip = tooltip ?? (foldable && disabled && children ? children : undefined)

  if (!resolvedTooltip) {
    return button
  }

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{button}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="opal-tooltip" side={tooltipSide} sideOffset={4}>
          <OnyxTextV2>{resolvedTooltip}</OnyxTextV2>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
