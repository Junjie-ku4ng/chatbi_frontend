import React, { type ComponentType, type SVGProps } from 'react'
import { cn } from '@/lib/utils'
import { TimelineRow } from './primitives/TimelineRow'
import { TimelineSurface, type TimelineSurfaceBackground } from './primitives/TimelineSurface'
import { TimelineStepContent } from './primitives/TimelineStepContent'

type TimelineIconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

export interface StepContainerProps {
  children?: React.ReactNode
  stepIcon?: TimelineIconComponent
  header?: React.ReactNode
  buttonTitle?: string
  isExpanded?: boolean
  onToggle?: () => void
  collapsible?: boolean
  supportsCollapsible?: boolean
  isLastStep?: boolean
  isFirstStep?: boolean
  hideHeader?: boolean
  isHover?: boolean
  collapsedIcon?: TimelineIconComponent
  noPaddingRight?: boolean
  withRail?: boolean
  surfaceBackground?: TimelineSurfaceBackground
}

export function StepContainer({
  children,
  stepIcon: StepIconComponent,
  header,
  buttonTitle,
  isExpanded = true,
  onToggle,
  collapsible = true,
  supportsCollapsible = false,
  isLastStep = false,
  isFirstStep = false,
  hideHeader = false,
  isHover = false,
  collapsedIcon: CollapsedIconComponent,
  noPaddingRight = false,
  withRail = true,
  surfaceBackground
}: StepContainerProps) {
  const iconNode = StepIconComponent ? (
    <StepIconComponent
      className={cn('h-[var(--timeline-icon-size)] w-[var(--timeline-icon-size)] text-[#6b7280]', isHover && 'text-[#374151]')}
    />
  ) : null

  const content = (
    <TimelineSurface
      className="flex flex-1 flex-col"
      isHover={isHover}
      roundedBottom={isLastStep}
      background={surfaceBackground}
    >
      <TimelineStepContent
        header={header}
        buttonTitle={buttonTitle}
        isExpanded={isExpanded}
        onToggle={onToggle}
        collapsible={collapsible}
        supportsCollapsible={supportsCollapsible}
        hideHeader={hideHeader}
        collapsedIcon={CollapsedIconComponent}
        noPaddingRight={noPaddingRight}
        surfaceBackground={surfaceBackground}
      >
        {children}
      </TimelineStepContent>
    </TimelineSurface>
  )

  if (!withRail) {
    return (
      <div data-testid="onyx-donor-step-container" className="flex w-full">
        {content}
      </div>
    )
  }

  return (
    <div data-testid="onyx-donor-step-container">
      <TimelineRow
        railVariant="rail"
        icon={iconNode}
        showIcon={!hideHeader && Boolean(StepIconComponent)}
        iconRowVariant={hideHeader ? 'compact' : 'default'}
        isFirst={isFirstStep}
        isLast={isLastStep}
        isHover={isHover}
      >
        {content}
      </TimelineRow>
    </div>
  )
}

export default StepContainer
