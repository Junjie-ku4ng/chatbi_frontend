import React, { type ComponentType, type SVGProps } from 'react'
import { cn } from '@/lib/utils'
import { SvgArrowRightV2, SvgChevronDownV2 } from '@/components/onyx/icons'
import { OnyxTextV2 } from '@/components/onyx/onyx-text-v2'
import type { TimelineSurfaceBackground } from './TimelineSurface'

type TimelineIconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

export interface TimelineStepContentProps {
  children?: React.ReactNode
  header?: React.ReactNode
  buttonTitle?: string
  isExpanded?: boolean
  onToggle?: () => void
  collapsible?: boolean
  supportsCollapsible?: boolean
  hideHeader?: boolean
  collapsedIcon?: TimelineIconComponent
  noPaddingRight?: boolean
  surfaceBackground?: TimelineSurfaceBackground
}

function TimelineActionButton({
  isExpanded,
  onToggle,
  buttonTitle,
  CollapsedIconComponent
}: {
  isExpanded: boolean
  onToggle: () => void
  buttonTitle?: string
  CollapsedIconComponent?: TimelineIconComponent
}) {
  const Icon = isExpanded ? SvgChevronDownV2 : (CollapsedIconComponent ?? SvgArrowRightV2)

  return (
    <button
      className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white/80 px-2 text-[#4b5563] transition-colors hover:bg-white"
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-label={buttonTitle ?? (isExpanded ? 'Collapse timeline' : 'Expand timeline')}
    >
      {buttonTitle ? <span className="mr-1 text-[12px]">{buttonTitle}</span> : null}
      <Icon size={14} />
    </button>
  )
}

export function TimelineStepContent({
  children,
  header,
  buttonTitle,
  isExpanded = true,
  onToggle,
  collapsible = true,
  supportsCollapsible = false,
  hideHeader = false,
  collapsedIcon: CollapsedIconComponent,
  noPaddingRight = false,
  surfaceBackground
}: TimelineStepContentProps) {
  const showCollapseControls = collapsible && supportsCollapsible && onToggle

  return (
    <div className="flex flex-col px-1 pb-1">
      {!hideHeader && header ? (
        <div className="flex items-center justify-between h-[var(--timeline-step-header-height)] pl-1">
          <div className="w-full pt-[var(--timeline-step-top-padding)] pl-[var(--timeline-common-text-padding)]">
            <OnyxTextV2 as="p" font="main-ui-muted" color="text-04">
              {header}
            </OnyxTextV2>
          </div>

          <div className="flex h-full w-[var(--timeline-step-header-right-section-width)] items-center justify-end">
            {showCollapseControls ? (
              <TimelineActionButton
                isExpanded={isExpanded}
                onToggle={onToggle}
                buttonTitle={buttonTitle}
                CollapsedIconComponent={CollapsedIconComponent}
              />
            ) : surfaceBackground === 'error' ? (
              <div className="p-1.5 text-[#b91c1c]">!</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {children ? (
        <div
          className={cn(
            'pl-1 pb-1',
            !noPaddingRight && 'pr-[var(--timeline-step-header-right-section-width)]',
            hideHeader && 'pt-[var(--timeline-step-top-padding)]'
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

export default TimelineStepContent
