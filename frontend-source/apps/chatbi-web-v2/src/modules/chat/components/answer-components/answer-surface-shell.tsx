'use client'

import type { ReactNode } from 'react'
import { OnyxDonorCardV2 } from '@/components/onyx-donor/onyx-donor-card-v2'
import { AnswerEvidenceDrawer } from './answer-evidence-drawer'
import { AnswerSlicerPanel } from './answer-slicer-panel'
import { AnswerSortTopPanel } from './answer-sort-top-panel'
import type { AnswerComponentPayload, AnswerSurfaceView } from './types'
import { AnswerSurfaceToolbar } from './answer-surface-toolbar'
import {
  buildAnswerSurfaceOpenAnalysisHref,
  resolveAnswerSurfaceQueryLogId,
  resolveAnswerSurfaceTraceKey
} from './interactive-actions'
import { useAnswerSurfaceState } from './use-answer-surface-state'

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function asRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(asRecord(item)))
    : []
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function resolveSortTopState(payload: AnswerComponentPayload, draftPatch: Record<string, unknown>) {
  const overrideSort = asRecord(draftPatch.sort)
  const currentSort = payload.interaction?.sort?.current
  return {
    sortBy:
      asString(overrideSort?.by) ??
      currentSort?.by ??
      payload.interaction?.sort?.metrics?.[0] ??
      '',
    sortDir:
      overrideSort?.dir === 'ASC' || overrideSort?.dir === 'DESC'
        ? overrideSort.dir
        : currentSort?.dir === 'ASC'
          ? 'ASC'
          : 'DESC',
    topN:
      typeof draftPatch.topN === 'number'
        ? Math.floor(draftPatch.topN)
        : typeof payload.interaction?.ranking?.currentLimit === 'number'
          ? payload.interaction.ranking.currentLimit
          : undefined
  } as const
}

function resolveSlicerState(payload: AnswerComponentPayload, draftPatch: Record<string, unknown>) {
  const overrideFilters = asRecordArray(draftPatch.filters)
  const appliedFilters = overrideFilters.length > 0 ? overrideFilters : asRecordArray(payload.interaction?.slicers?.applied)
  const firstFilter = appliedFilters[0]
  return {
    dimension:
      asString(draftPatch.focusDimension) ??
      asString(firstFilter?.dimension) ??
      payload.interaction?.slicers?.dimensions?.[0] ??
      '',
    member:
      (Array.isArray(firstFilter?.members) && typeof firstFilter.members[0] === 'string' ? firstFilter.members[0] : undefined) ??
      asString(firstFilter?.member) ??
      ''
  }
}

function renderActivePanel(
  payload: AnswerComponentPayload,
  draftPatch: Record<string, unknown>,
  activePanel: 'sort' | 'top' | 'slicer' | 'explain' | null,
  onUpdateDraftPatch: (nextPatch: Record<string, unknown>) => void
) {
  if (activePanel === 'sort' || activePanel === 'top') {
    const resolved = resolveSortTopState(payload, draftPatch)
    return (
      <AnswerSortTopPanel
        metrics={payload.interaction?.sort?.metrics ?? []}
        sortBy={resolved.sortBy}
        sortDir={resolved.sortDir}
        topN={resolved.topN}
        presets={payload.interaction?.ranking?.presets ?? []}
        onChange={next => onUpdateDraftPatch(next)}
      />
    )
  }

  if (activePanel === 'slicer') {
    const resolved = resolveSlicerState(payload, draftPatch)
    return (
      <AnswerSlicerPanel
        dimensions={payload.interaction?.slicers?.dimensions ?? []}
        dimension={resolved.dimension}
        member={resolved.member}
        onChange={next => onUpdateDraftPatch(next)}
      />
    )
  }

  if (activePanel === 'explain') {
    return <AnswerEvidenceDrawer payload={payload} draftPatch={draftPatch} />
  }

  return null
}

export function AnswerSurfaceShell(props: {
  type: AnswerSurfaceView
  payload: AnswerComponentPayload
  renderBody: (viewMode: AnswerSurfaceView) => ReactNode
  draftPatch?: Record<string, unknown>
  onDraftPatchChange?: (nextPatch: Record<string, unknown>) => void
  onOpenExplorer?: () => void
  openExplorerHref?: string
  onOpenAnalysis?: () => void
  onExplore?: () => void
  onOpenCanvas?: () => void
  onAddToStory?: () => void
  onApplyPrompt?: (prompt: string) => void
}) {
  const state = useAnswerSurfaceState({
    type: props.type,
    payload: props.payload,
    draftPatch: props.draftPatch,
    onDraftPatchChange: props.onDraftPatchChange
  })
  const openAnalysisHref = buildAnswerSurfaceOpenAnalysisHref(props.payload, {
    patch: state.draftPatch
  })
  const queryLogId = resolveAnswerSurfaceQueryLogId(props.payload)
  const traceKey = resolveAnswerSurfaceTraceKey(props.payload)

  const handleExplore = props.onExplore
    ? props.onExplore
    : props.onApplyPrompt
      ? () => {
          props.onApplyPrompt?.('请继续探索当前结果，并优先从新的维度、异常点或趋势变化展开。')
        }
      : undefined

  const surface = (
    <OnyxDonorCardV2
      className="chat-assistant-answer-surface nx-shell-panel onyx-donor-answer-surface onyx-native-donor-answer-surface-card"
      data-testid="answer-surface-shell-card"
      padding="md"
      variant="secondary"
    >
      <div className="onyx-native-donor-answer-surface-stack" data-testid="answer-surface-shell-stack">
        <AnswerSurfaceToolbar
          interaction={props.payload.interaction}
          availableViews={state.availableViews}
          viewMode={state.viewMode}
          activePanel={state.activePanel}
          onSelectView={state.setViewMode}
          onTogglePanel={state.togglePanel}
          openExplorerHref={props.openExplorerHref}
          onOpenExplorer={props.onOpenExplorer}
          openAnalysisHref={openAnalysisHref}
          onOpenAnalysis={props.onOpenAnalysis}
          onExplore={handleExplore}
          onOpenCanvas={props.onOpenCanvas}
          onAddToStory={props.onAddToStory}
          onFullscreen={state.openFullscreen}
        />
        {queryLogId || traceKey ? (
          <div
            className="chat-assistant-answer-surface-meta nx-shell-meta-row onyx-donor-answer-surface-meta"
            data-testid="answer-surface-meta"
          >
            <div className="onyx-donor-answer-surface-meta-shell" data-testid="answer-surface-meta-shell">
              {queryLogId ? (
                <span data-testid="answer-surface-query-log-id" className="onyx-donor-answer-surface-meta-chip">
                  <span data-testid="answer-surface-query-log-id-label" className="onyx-donor-answer-surface-meta-label">
                    查询日志：
                  </span>{' '}
                  <span data-testid="answer-surface-query-log-id-value" className="onyx-donor-answer-surface-meta-value">
                    {queryLogId}
                  </span>
                </span>
              ) : null}
              {traceKey ? (
                <span data-testid="answer-surface-trace-key" className="onyx-donor-answer-surface-meta-chip">
                  <span data-testid="answer-surface-trace-key-label" className="onyx-donor-answer-surface-meta-label">
                    追踪：
                  </span>{' '}
                  <span data-testid="answer-surface-trace-key-value" className="onyx-donor-answer-surface-meta-value">
                    {traceKey}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
        {renderActivePanel(props.payload, state.draftPatch, state.activePanel, state.updateDraftPatch)}
        <div className="onyx-donor-answer-surface-body-shell" data-testid="answer-surface-body-shell">
          <div
            className={`onyx-donor-answer-surface-body onyx-donor-answer-surface-body-${state.viewMode}`}
            data-testid={`answer-surface-body-${state.viewMode}`}
          >
            {props.renderBody(state.viewMode)}
          </div>
        </div>
      </div>
    </OnyxDonorCardV2>
  )

  if (!state.isFullscreen) {
    return surface
  }

  return (
    <div
      className="chat-assistant-answer-surface-dialog onyx-donor-answer-surface-dialog"
      data-testid="answer-surface-fullscreen-dialog"
      role="dialog"
      aria-modal="true"
    >
      <div className="chat-assistant-answer-surface-dialog-bar onyx-donor-answer-surface-dialog-bar">
        <button
          type="button"
          data-testid="answer-surface-fullscreen-close"
          className="chat-assistant-answer-action onyx-donor-answer-surface-action"
          onClick={state.closeFullscreen}
        >
          关闭
        </button>
      </div>
      {surface}
    </div>
  )
}
