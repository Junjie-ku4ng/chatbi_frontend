'use client'

import type { AnswerSurfaceInteraction, AnswerSurfaceView } from './types'
import type { AnswerSurfacePanelKey } from './use-answer-surface-state'

function formatViewLabel(view: AnswerSurfaceView) {
  if (view === 'kpi') {
    return 'KPI'
  }
  return view.charAt(0).toUpperCase() + view.slice(1)
}

function renderAction(
  testId: string,
  label: string,
  props: {
    href?: string
    active?: boolean
    onClick?: () => void
  }
) {
  if (props.href) {
    return (
      <a
        key={testId}
        data-testid={testId}
        className="chat-assistant-answer-action"
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-pressed={props.active}
        onClick={() => {
          props.onClick?.()
        }}
      >
        {label}
      </a>
    )
  }

  return (
    <button
      key={testId}
      type="button"
      data-testid={testId}
      className="chat-assistant-answer-action"
      aria-pressed={props.active}
      onClick={() => {
        props.onClick?.()
      }}
    >
      {label}
    </button>
  )
}

export function AnswerSurfaceToolbar(props: {
  interaction?: AnswerSurfaceInteraction
  availableViews: AnswerSurfaceView[]
  viewMode: AnswerSurfaceView
  activePanel: AnswerSurfacePanelKey | null
  onSelectView: (view: AnswerSurfaceView) => void
  onTogglePanel: (panel: AnswerSurfacePanelKey) => void
  openExplorerHref?: string
  onOpenExplorer?: () => void
  openAnalysisHref?: string
  onOpenAnalysis?: () => void
  onExplore?: () => void
  onOpenCanvas?: () => void
  onAddToStory?: () => void
  onFullscreen?: () => void
}) {
  const actions = [
    ...props.availableViews.map(view =>
      renderAction(`answer-surface-view-${view}`, formatViewLabel(view), {
        active: props.viewMode === view,
        onClick: () => props.onSelectView(view)
      })
    ),
    props.interaction?.sort?.enabled
      ? renderAction('answer-surface-sort', 'Sort', {
          active: props.activePanel === 'sort',
          onClick: () => props.onTogglePanel('sort')
        })
      : null,
    props.interaction?.ranking?.enabled
      ? renderAction('answer-surface-top', 'Top', {
          active: props.activePanel === 'top',
          onClick: () => props.onTogglePanel('top')
        })
      : null,
    props.interaction?.slicers?.enabled
      ? renderAction('answer-surface-slicer', 'Slicer', {
          active: props.activePanel === 'slicer',
          onClick: () => props.onTogglePanel('slicer')
        })
      : null,
    props.interaction?.explain?.enabled
      ? renderAction('answer-surface-explain', 'Explain', {
          active: props.activePanel === 'explain',
          onClick: () => props.onTogglePanel('explain')
        })
      : null,
    props.openExplorerHref || props.onOpenExplorer
      ? renderAction('answer-surface-open-explorer', 'Open Explorer', {
          href: props.openExplorerHref,
          onClick: props.onOpenExplorer
        })
      : null,
    props.openAnalysisHref || props.onOpenAnalysis
      ? renderAction('answer-surface-open-analysis', 'Open Analysis', {
          href: props.openAnalysisHref,
          onClick: props.onOpenAnalysis
        })
      : null,
    props.onExplore
      ? renderAction('answer-surface-explore', 'Explore', {
          onClick: props.onExplore
        })
      : null,
    props.onOpenCanvas
      ? renderAction('answer-surface-open-canvas', 'Open Canvas', {
          onClick: props.onOpenCanvas
        })
      : null,
    props.interaction?.story?.enabled && props.onAddToStory
      ? renderAction('answer-surface-add-to-story', 'Add to Story', {
          onClick: props.onAddToStory
        })
      : null,
    props.interaction?.fullscreen?.enabled && props.onFullscreen
      ? renderAction('answer-surface-fullscreen', 'Fullscreen', {
          onClick: props.onFullscreen
        })
      : null
  ].filter(Boolean)

  if (actions.length === 0) {
    return null
  }

  return (
    <div className="chat-assistant-answer-actions" data-testid="answer-surface-toolbar">
      {actions}
    </div>
  )
}
