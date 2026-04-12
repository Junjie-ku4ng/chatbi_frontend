'use client'

import { OnyxTextV2 } from '@/components/onyx/onyx-text-v2'
import { OnyxContentActionV2 } from '@/components/onyx/onyx-content-action-v2'
import { OnyxInteractiveContainerV2 } from '@/components/onyx/onyx-interactive-container-v2'
import { OnyxInteractiveStatefulV2, type InteractiveStatefulVariant } from '@/components/onyx/onyx-interactive-stateful-v2'
import type { OnyxButtonType, OnyxIconComponent } from '@/components/onyx/onyx-types'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

type OnyxSidebarTabV2Props = {
  folded?: boolean
  selected?: boolean
  variant?: Extract<InteractiveStatefulVariant, 'sidebar-light' | 'sidebar-heavy'>
  nested?: boolean
  disabled?: boolean
  onClick?: React.MouseEventHandler<HTMLElement>
  href?: string
  type?: OnyxButtonType
  icon?: OnyxIconComponent
  children?: React.ReactNode
  rightChildren?: React.ReactNode
}

export function OnyxSidebarTabV2({
  folded,
  selected,
  variant = 'sidebar-heavy',
  nested,
  disabled,
  onClick,
  href,
  type,
  icon,
  rightChildren,
  children
}: OnyxSidebarTabV2Props) {
  const Icon =
    icon ??
    (nested
      ? ((() => <div className="w-6" aria-hidden="true" />) as OnyxIconComponent)
      : null)

  const truncationSpacer = rightChildren ? <div className="w-0 group-hover/SidebarTab:w-6" /> : null

  const content = (
    <div className="relative">
      <OnyxInteractiveStatefulV2
        disabled={disabled}
        group="group/SidebarTab"
        onClick={onClick}
        state={selected ? 'selected' : 'empty'}
        type="button"
        variant={variant}
      >
        <OnyxInteractiveContainerV2 heightVariant="lg" roundingVariant="sm" type={type} widthVariant="full">
          {href && !disabled ? (
            <a className="absolute z-[99] inset-0 rounded-08" href={href} tabIndex={-1} />
          ) : null}

          {!folded && rightChildren ? (
            <div className="absolute z-[100] right-1.5 top-0 bottom-0 flex flex-col justify-center items-center pointer-events-auto">
              {rightChildren}
            </div>
          ) : null}

          {typeof children === 'string' ? (
            <OnyxContentActionV2
              icon={Icon ?? undefined}
              rightChildren={truncationSpacer}
              title={folded ? '' : children}
            />
          ) : (
            <div className="flex w-full min-w-0 flex-row items-center gap-2 px-2">
              {Icon ? (
                <div className="flex items-center justify-center p-0.5">
                  <Icon className="h-[1rem] w-[1rem] text-text-03" />
                </div>
              ) : null}
              {children}
              {truncationSpacer}
            </div>
          )}
        </OnyxInteractiveContainerV2>
      </OnyxInteractiveStatefulV2>
    </div>
  )

  if (typeof children !== 'string' || !folded) {
    return content
  }

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{content}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="opal-tooltip" side="right" sideOffset={4}>
          {children}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
