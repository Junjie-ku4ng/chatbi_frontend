'use client'

import type { AnswerSurfaceInteraction, AnswerSurfaceView } from './types'
import type { AnswerSurfacePanelKey } from './use-answer-surface-state'

function formatViewLabel(view: AnswerSurfaceView) {
  if (view === 'kpi') {
    return 'KPI'
  }
  if (view === 'chart') {
    return '图表'
  }
  if (view === 'table') {
    return '表格'
  }
  return view
}

function renderAction(
  testId: string,
  label: string,
  props: {
    href?: string
    active?: boolean
    onClick?: () => void
    variant?: 'view' | 'panel' | 'link' | 'utility'
  }
) {
  const variantClass =
    props.variant === 'view'
      ? 'onyx-donor-answer-surface-action-chip-view'
      : props.variant === 'panel'
        ? 'onyx-donor-answer-surface-action-chip-panel'
        : props.variant === 'link'
          ? 'onyx-donor-answer-surface-action-chip-link'
          : 'onyx-donor-answer-surface-action-chip-utility'

  if (props.href) {
    return (
      <a
        key={testId}
        data-testid={testId}
        className={`chat-assistant-answer-action onyx-donor-answer-surface-action onyx-donor-answer-surface-action-chip ${variantClass}`}
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
      className={`chat-assistant-answer-action onyx-donor-answer-surface-action onyx-donor-answer-surface-action-chip ${variantClass}`}
      aria-pressed={props.active}
      onClick={() => {
        props.onClick?.()
      }}
    >
      {label}
    </button>
  )
}

export function AnswerSurfaceViewSwitch(props: {
  availableViews: AnswerSurfaceView[]
  viewMode: AnswerSurfaceView
  onSelectView: (view: AnswerSurfaceView) => void
  testId?: string
  className?: string
}) {
  if (props.availableViews.length <= 1) {
    return null
  }

  return (
    <div
      className={['onyx-donor-answer-surface-view-switch onyx-donor-answer-surface-bookmark-tabs', props.className]
        .filter(Boolean)
        .join(' ')}
      data-testid={props.testId ?? 'answer-surface-view-switch'}
      role="tablist"
      aria-label="分析结果视图"
    >
      {props.availableViews.map(view => {
        const isActive = props.viewMode === view
        return (
          <button
            aria-selected={isActive}
            className="onyx-donor-answer-surface-bookmark-tab"
            data-state={isActive ? 'active' : 'inactive'}
            data-testid={`answer-surface-view-${view}`}
            key={view}
            onClick={() => props.onSelectView(view)}
            role="tab"
            type="button"
          >
            {formatViewLabel(view)}
          </button>
        )
      })}
    </div>
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
  showViewSwitch?: boolean
}) {
  const actions = [
    props.showViewSwitch === false ? null : (
      <AnswerSurfaceViewSwitch
        key="view-switch"
        availableViews={props.availableViews}
        viewMode={props.viewMode}
        onSelectView={props.onSelectView}
      />
    ),
    props.interaction?.sort?.enabled
      ? renderAction('answer-surface-sort', '排序', {
          active: props.activePanel === 'sort',
          onClick: () => props.onTogglePanel('sort'),
          variant: 'panel'
        })
      : null,
    props.interaction?.ranking?.enabled
      ? renderAction('answer-surface-top', '前 N', {
          active: props.activePanel === 'top',
          onClick: () => props.onTogglePanel('top'),
          variant: 'panel'
        })
      : null,
    props.interaction?.slicers?.enabled
      ? renderAction('answer-surface-slicer', '筛选', {
          active: props.activePanel === 'slicer',
          onClick: () => props.onTogglePanel('slicer'),
          variant: 'panel'
        })
      : null,
    props.interaction?.explain?.enabled
      ? renderAction('answer-surface-explain', '解释', {
          active: props.activePanel === 'explain',
          onClick: () => props.onTogglePanel('explain'),
          variant: 'panel'
        })
      : null,
    props.openExplorerHref || props.onOpenExplorer
      ? renderAction('answer-surface-open-explorer', '打开探索器', {
          href: props.openExplorerHref,
          onClick: props.onOpenExplorer,
          variant: 'link'
        })
      : null,
    props.openAnalysisHref || props.onOpenAnalysis
      ? renderAction('answer-surface-open-analysis', '打开分析', {
          href: props.openAnalysisHref,
          onClick: props.onOpenAnalysis,
          variant: 'link'
        })
      : null,
    props.onExplore
      ? renderAction('answer-surface-explore', '探索', {
          onClick: props.onExplore,
          variant: 'utility'
        })
      : null,
    props.onOpenCanvas
      ? renderAction('answer-surface-open-canvas', '打开画布', {
          onClick: props.onOpenCanvas,
          variant: 'utility'
        })
      : null,
    props.interaction?.story?.enabled && props.onAddToStory
      ? renderAction('answer-surface-add-to-story', '加入故事', {
          onClick: props.onAddToStory,
          variant: 'utility'
        })
      : null,
    props.interaction?.fullscreen?.enabled && props.onFullscreen
      ? renderAction('answer-surface-fullscreen', '全屏', {
          onClick: props.onFullscreen,
          variant: 'utility'
        })
      : null
  ].flat().filter(Boolean)

  if (actions.length === 0) {
    return null
  }

  return (
    <div className="chat-assistant-answer-actions onyx-donor-answer-surface-toolbar" data-testid="answer-surface-toolbar">
      <div className="onyx-donor-answer-surface-toolbar-shell" data-testid="answer-surface-toolbar-shell">
        <div className="onyx-donor-answer-surface-toolbar-row" data-testid="answer-surface-toolbar-row">
          {actions}
        </div>
      </div>
    </div>
  )
}
