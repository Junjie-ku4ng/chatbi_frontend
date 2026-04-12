'use client'

import type React from 'react'
import { OnyxTextV2 } from '@/components/onyx/onyx-text-v2'
import { onyxIconWrapper } from '@/components/onyx/onyx-icon-wrapper-v2'
import { OnyxInteractiveContainerV2 } from '@/components/onyx/onyx-interactive-container-v2'
import { OnyxInteractiveStatelessV2 } from '@/components/onyx/onyx-interactive-stateless-v2'
import type { OnyxContainerSizeVariant, OnyxExtremaSizeVariant, OnyxIconComponent } from '@/components/onyx/onyx-types'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

type OnyxButtonV2SharedProps = {
  icon?: OnyxIconComponent
  children: string
  rightIcon?: OnyxIconComponent
  responsiveHideText?: boolean
  size?: OnyxContainerSizeVariant
  tooltip?: string
  width?: OnyxExtremaSizeVariant
  tooltipSide?: TooltipSide
  disabled?: boolean
  prominence?: 'primary' | 'secondary' | 'tertiary' | 'internal'
}

type OnyxButtonV2ButtonProps = OnyxButtonV2SharedProps & {
  href?: undefined
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

type OnyxButtonV2LinkProps = OnyxButtonV2SharedProps & {
  href: string
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'>

export type OnyxButtonV2Props = OnyxButtonV2ButtonProps | OnyxButtonV2LinkProps

export function OnyxButtonV2({
  icon: icon,
  children,
  rightIcon,
  size = 'lg',
  width,
  tooltip,
  tooltipSide = 'top',
  responsiveHideText = false,
  disabled,
  href,
  prominence = 'primary',
  ...buttonProps
}: OnyxButtonV2Props) {
  const isLarge = size === 'lg'
  const onClick = buttonProps.onClick as React.MouseEventHandler<HTMLElement> | undefined

  const label = responsiveHideText ? (
    <span className="hidden md:inline whitespace-nowrap">
      <OnyxTextV2 color="inherit" font={isLarge ? 'main-ui-body' : 'secondary-body'}>
        {children}
      </OnyxTextV2>
    </span>
  ) : (
    <OnyxTextV2 color="inherit" font={isLarge ? 'main-ui-body' : 'secondary-body'} nowrap>
      {children}
    </OnyxTextV2>
  )

  const containerBaseProps = {
    border: prominence === 'secondary',
    heightVariant: size,
    roundingVariant: isLarge ? 'md' : size === '2xs' ? 'xs' : 'sm',
    widthVariant: width
  } as const

  const content = (
    <div className="flex flex-row items-center gap-1">
      {onyxIconWrapper(icon, size, true)}
      {label}
      {responsiveHideText ? (
        <span className="hidden md:inline-flex">
          {onyxIconWrapper(rightIcon, size, true)}
        </span>
      ) : (
        onyxIconWrapper(rightIcon, size, true)
      )}
    </div>
  )

  const { onClick: _buttonOnClick, ...buttonContainerProps } = buttonProps as Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'children'
  >
  const { href: _linkHref, onClick: _linkOnClick, type: _linkType, ...linkContainerProps } = buttonProps as Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    'children'
  >

  const button = href ? (
    <OnyxInteractiveStatelessV2 disabled={disabled} href={href} onClick={onClick} prominence={prominence} type="button">
      <OnyxInteractiveContainerV2
        {...containerBaseProps}
        {...linkContainerProps}
        href={disabled ? undefined : href}
      >
        {content}
      </OnyxInteractiveContainerV2>
    </OnyxInteractiveStatelessV2>
  ) : (
    <OnyxInteractiveStatelessV2 disabled={disabled} onClick={onClick} prominence={prominence} type="button">
      <OnyxInteractiveContainerV2
        {...containerBaseProps}
        {...buttonContainerProps}
        type="button"
      >
        {content}
      </OnyxInteractiveContainerV2>
    </OnyxInteractiveStatelessV2>
  )

  if (!tooltip) {
    return button
  }

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{button}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="opal-tooltip" side={tooltipSide} sideOffset={4}>
          {tooltip}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
