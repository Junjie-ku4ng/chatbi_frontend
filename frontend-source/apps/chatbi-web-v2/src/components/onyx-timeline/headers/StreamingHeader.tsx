'use client'

import React from 'react'
import { SvgArrowRightV2, SvgChevronDownV2 } from '@/components/onyx/icons'
import { OnyxTextV2 } from '@/components/onyx/onyx-text-v2'
import { useStreamingDuration } from '../hooks/useStreamingDuration'

export interface StreamingHeaderProps {
  headerText: string
  collapsible: boolean
  buttonTitle?: string
  isExpanded: boolean
  onToggle: () => void
  streamingStartTime?: number
  toolProcessingDuration?: number
}

function formatDurationSeconds(seconds: number): string {
  const totalSeconds = Math.ceil(seconds)
  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

export const StreamingHeader = React.memo(function StreamingHeader({
  headerText,
  collapsible,
  buttonTitle,
  isExpanded,
  onToggle,
  streamingStartTime,
  toolProcessingDuration
}: StreamingHeaderProps) {
  const elapsedSeconds = useStreamingDuration(
    toolProcessingDuration === undefined,
    streamingStartTime,
    toolProcessingDuration
  )
  const showElapsedTime = Boolean(isExpanded && streamingStartTime && elapsedSeconds > 0)
  const ToggleIcon = isExpanded ? SvgChevronDownV2 : SvgArrowRightV2

  return (
    <div data-testid="onyx-donor-streaming-header" className="flex items-center justify-between gap-3">
      <div className="px-[var(--timeline-header-text-padding-x)] py-[var(--timeline-header-text-padding-y)]">
        <OnyxTextV2
          as="p"
          font="main-ui-action"
          color="text-03"
          className="animate-shimmer bg-[length:200%_100%] bg-[linear-gradient(90deg,rgba(107,114,128,0.95)_10%,rgba(17,24,39,1)_40%,rgba(107,114,128,0.95)_70%)] bg-clip-text text-transparent"
        >
          {headerText}
        </OnyxTextV2>
      </div>

      {collapsible ? (
        <button
          className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white/80 px-2 text-[#4b5563] transition-colors hover:bg-white"
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={buttonTitle ?? (isExpanded ? 'Collapse timeline' : 'Expand timeline')}
        >
          {buttonTitle ? <span className="mr-1 text-[12px]">{buttonTitle}</span> : showElapsedTime ? <span className="mr-1 text-[12px]">{formatDurationSeconds(elapsedSeconds)}</span> : null}
          <ToggleIcon size={14} />
        </button>
      ) : null}
    </div>
  )
})
