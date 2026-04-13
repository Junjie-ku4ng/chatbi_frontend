'use client'

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
  AnswerSurfaceShell,
  AnswerSurfaceViewSwitch,
  buildAnswerSurfaceOpenAnalysisHref,
  ChartAnswerComponent,
  KpiAnswerComponent,
  saveAnswerSurfaceToStory,
  StorySaveDialog,
  TableAnswerComponent,
  type AnswerComponentPayload,
  type AnswerSurfaceView
} from '@/lib/chat-runtime-bridge'
import { OnyxDonorCardV2 } from './onyx-donor/onyx-donor-card-v2'

type ISlicer = {
  dimension?: unknown
  members?: unknown[]
} & Record<string, unknown>

function formatSurfaceKind(type: AnswerSurfaceView, payload: AnswerComponentPayload) {
  const views = Array.isArray(payload.interaction?.availableViews) ? payload.interaction.availableViews : []
  if (views.includes('chart') && views.includes('table')) {
    return '图表 / 表格分析'
  }

  if (type === 'kpi') {
    return 'KPI 分析'
  }
  if (type === 'chart') {
    return '图表分析'
  }
  if (type === 'table') {
    return '表格分析'
  }
  return `${type} 分析`
}

function isAnswerSurfaceView(value: unknown): value is AnswerSurfaceView {
  return value === 'table' || value === 'chart' || value === 'kpi'
}

function resolveAvailableViews(type: AnswerSurfaceView, payload: AnswerComponentPayload) {
  const interactionViews = Array.isArray(payload.interaction?.availableViews)
    ? payload.interaction.availableViews.filter(isAnswerSurfaceView)
    : []
  const views = interactionViews.length > 0 ? interactionViews : [type]

  if (!views.includes(type)) {
    views.unshift(type)
  }

  return Array.from(new Set(views))
}

function resolveDefaultView(type: AnswerSurfaceView, payload: AnswerComponentPayload, availableViews: AnswerSurfaceView[]) {
  const configuredDefault = payload.interaction?.defaultView
  if (isAnswerSurfaceView(configuredDefault) && availableViews.includes(configuredDefault)) {
    return configuredDefault
  }
  if (availableViews.includes(type)) {
    return type
  }
  return availableViews[0] ?? type
}

function asStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map(item => item.trim())
    : []
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function buildContextTokens(payload: AnswerComponentPayload) {
  const tokens: string[] = []
  const handoff = payload.analysisHandoff

  if (typeof handoff?.cube === 'string' && handoff.cube.trim()) {
    tokens.push(handoff.cube.trim())
  }

  for (const code of asStringList(handoff?.metricCodes)) {
    tokens.push(code)
  }

  for (const code of asStringList(handoff?.dimensionCodes)) {
    tokens.push(code)
  }

  return Array.from(new Set(tokens)).slice(0, 4)
}

function buildAppliedDraftSummary(draftPatch: Record<string, unknown>) {
  const tokens: string[] = []

  if (typeof draftPatch.topN === 'number' && Number.isFinite(draftPatch.topN)) {
    tokens.push(`前 ${Math.floor(draftPatch.topN)}`)
  }

  const sort = asRecord(draftPatch.sort)
  if (sort) {
    const by = typeof sort.by === 'string' && sort.by.trim() ? sort.by.trim() : undefined
    const dir = sort.dir === 'ASC' || sort.dir === 'DESC' ? sort.dir : undefined
    if (by && dir) {
      tokens.push(`排序 ${by} ${dir}`)
    }
  }

  const filters = Array.isArray(draftPatch.filters) ? draftPatch.filters : []
  const firstFilter = filters.find(
    (item): item is { dimension?: unknown; members?: unknown } => Boolean(item && typeof item === 'object' && !Array.isArray(item))
  )
  if (firstFilter) {
    const dimension =
      typeof firstFilter.dimension === 'string' && firstFilter.dimension.trim() ? firstFilter.dimension.trim() : undefined
    const member =
      Array.isArray(firstFilter.members) && typeof firstFilter.members[0] === 'string' && firstFilter.members[0].trim()
        ? firstFilter.members[0].trim()
        : undefined
    if (dimension && member) {
      tokens.push(`${dimension}: ${member}`)
    }
  }

  return tokens
}

function resolveSlicerDimensionName(slicer: ISlicer) {
  const dimension = slicer.dimension as unknown
  if (typeof dimension === 'string' && dimension.trim()) {
    return dimension.trim()
  }

  if (!dimension || typeof dimension !== 'object') {
    return undefined
  }

  const record = dimension as Record<string, unknown>
  const candidates = [record.dimension, record.name, record.hierarchy, record.level]
  return candidates.find((value): value is string => typeof value === 'string' && value.trim() !== '')?.trim()
}

function resolveSlicerMembers(slicer: ISlicer) {
  const members = Array.isArray(slicer.members) ? (slicer.members as unknown[]) : []
  return members
    .map(member => {
      if (typeof member === 'string' && member.trim()) {
        return member.trim()
      }

      if (!member || typeof member !== 'object') {
        return undefined
      }

      const record = member as Record<string, unknown>
      const candidates = [record.label, record.caption, record.value, record.key]
      return candidates.find((value): value is string => typeof value === 'string' && value.trim() !== '')?.trim()
    })
    .filter((value): value is string => Boolean(value))
}

function mergeDraftPatchWithSlicers(basePatch: Record<string, unknown>, slicers: ISlicer[]) {
  const nextPatch: Record<string, unknown> = {
    ...basePatch
  }
  const filters = slicers
    .map(slicer => {
      const dimension = resolveSlicerDimensionName(slicer)
      const members = resolveSlicerMembers(slicer)
      if (!dimension || members.length === 0) {
        return null
      }

      return {
        dimension,
        op: 'IN',
        members
      }
    })
    .filter((filter): filter is { dimension: string; op: 'IN'; members: string[] } => filter !== null)

  if (filters.length > 0) {
    nextPatch.focusDimension = filters[0]?.dimension
    nextPatch.filters = filters
  } else {
    delete nextPatch.focusDimension
    nextPatch.filters = []
  }

  return nextPatch
}

function renderAnalysisBody(
  viewMode: AnswerSurfaceView,
  payload: AnswerComponentPayload,
  options?: {
    onLinkedSlicersChange?: (slicers: ISlicer[]) => void
  }
) {
  if (viewMode === 'kpi') {
    return <KpiAnswerComponent payload={payload} />
  }
  if (viewMode === 'table') {
    return <TableAnswerComponent payload={payload} />
  }
  return (
    <ChartAnswerComponent
      payload={payload}
      slicersChange={options?.onLinkedSlicersChange}
      slicersChanging={options?.onLinkedSlicersChange}
    />
  )
}

export function AnalysisComponentCardV2({
  onApplyPrompt,
  payload,
  type
}: {
  type: AnswerSurfaceView
  payload: AnswerComponentPayload
  onApplyPrompt?: (prompt: string) => void
}) {
  const [isStoryDialogOpen, setIsStoryDialogOpen] = useState(false)
  const [isExplorerOpen, setIsExplorerOpen] = useState(false)
  const [isOpeningCanvas, setIsOpeningCanvas] = useState(false)
  const [canvasStatus, setCanvasStatus] = useState<string | null>(null)
  const [appliedDraftPatch, setAppliedDraftPatch] = useState<Record<string, unknown>>({})
  const [explorerDraftPatch, setExplorerDraftPatch] = useState<Record<string, unknown>>({})
  const availableViews = useMemo(() => resolveAvailableViews(type, payload), [payload, type])
  const defaultView = useMemo(() => resolveDefaultView(type, payload, availableViews), [availableViews, payload, type])
  const [viewMode, setViewMode] = useState<AnswerSurfaceView>(defaultView)
  const title =
    (typeof payload.label === 'string' && payload.label.trim()) ||
    (typeof payload.interaction?.story?.title === 'string' && payload.interaction.story.title.trim()) ||
    '分析结果'
  const contextTokens = buildContextTokens(payload)
  const appliedDraftSummary = buildAppliedDraftSummary(appliedDraftPatch)

  useEffect(() => {
    setAppliedDraftPatch({})
    setExplorerDraftPatch({})
    setViewMode(defaultView)
  }, [defaultView, payload.queryLogId, payload.traceKey, type])

  useEffect(() => {
    if (!availableViews.includes(viewMode)) {
      setViewMode(defaultView)
    }
  }, [availableViews, defaultView, viewMode])

  function handleLinkedSlicersChange(
    applyPatch: Dispatch<SetStateAction<Record<string, unknown>>>,
    slicers: ISlicer[]
  ) {
    applyPatch(previous => mergeDraftPatchWithSlicers(previous, slicers))
  }

  async function handleOpenCanvas() {
    if (viewMode === 'kpi' || isOpeningCanvas) {
      return
    }

    setIsOpeningCanvas(true)
    setCanvasStatus(null)

    try {
      const title =
        (typeof payload.interaction?.story?.title === 'string' && payload.interaction.story.title.trim()) ||
        (typeof payload.label === 'string' && payload.label.trim()) ||
        '分析结果'

      const result = await saveAnswerSurfaceToStory({
        type: viewMode,
        payload,
        storyTitle: `${title} 画布`,
        widgetTitle: title
      })

      window.open(result.designerHref, '_blank', 'noopener,noreferrer')
      setCanvasStatus(`画布已就绪（${result.story.id}）`)
    } catch (error) {
      setCanvasStatus(error instanceof Error ? error.message : '打开画布失败')
    } finally {
      setIsOpeningCanvas(false)
    }
  }

  return (
    <>
      <div className="v2-analysis-result-shell" data-testid="analysis-component-card-v2-outer">
        <AnswerSurfaceViewSwitch
          availableViews={availableViews}
          className="v2-analysis-card-bookmark-tabs"
          viewMode={viewMode}
          onSelectView={setViewMode}
          testId="analysis-card-view-switch"
        />
        <OnyxDonorCardV2
          className="v2-analysis-card-shell onyx-donor-analysis-card-shell onyx-native-donor-analysis-card-shell"
          data-testid="analysis-component-card-v2-shell"
          padding="md"
          variant="secondary"
        >
          <section className="onyx-donor-analysis-card-shell" data-testid="analysis-component-card-v2-header">
            <div className="v2-analysis-card-head">
              <div className="v2-analysis-card-copy">
                <div className="v2-analysis-card-eyebrow" data-testid="analysis-component-card-v2-surface-kind">
                  {formatSurfaceKind(type, payload)}
                </div>
                <h3 className="v2-analysis-card-title" data-testid="analysis-component-card-v2-title">
                  {title}
                </h3>
              </div>
              {contextTokens.length > 0 ? (
                <div className="v2-analysis-card-context" data-testid="analysis-component-card-v2-context">
                  {contextTokens.map(token => (
                    <span className="v2-pill" key={token}>
                      {token}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            {appliedDraftSummary.length > 0 ? (
              <div className="v2-analysis-card-summary" data-testid="analysis-component-card-v2-draft-summary">
                {appliedDraftSummary.map(token => (
                  <span className="v2-badge" key={token}>
                    {token}
                  </span>
                ))}
              </div>
            ) : null}
            <AnswerSurfaceShell
              type={type}
              payload={payload}
              draftPatch={appliedDraftPatch}
              onDraftPatchChange={setAppliedDraftPatch}
              onApplyPrompt={onApplyPrompt}
              viewMode={viewMode}
              onSelectView={setViewMode}
              showViewSwitch={false}
              surfaceFrame="embedded"
              onOpenExplorer={
                viewMode === 'kpi'
                  ? undefined
                  : () => {
                      setExplorerDraftPatch({ ...appliedDraftPatch })
                      setIsExplorerOpen(true)
                    }
              }
              onOpenCanvas={viewMode === 'kpi' ? undefined : handleOpenCanvas}
              onAddToStory={() => {
                setIsStoryDialogOpen(true)
              }}
              renderBody={viewMode =>
                renderAnalysisBody(viewMode, payload, {
                  onLinkedSlicersChange: slicers => {
                    handleLinkedSlicersChange(setAppliedDraftPatch, slicers)
                  }
                })
              }
            />
          </section>
        </OnyxDonorCardV2>
      </div>
      {canvasStatus ? <p className="v2-analysis-status">{canvasStatus}</p> : null}
      {isExplorerOpen ? (
        <div
          className="chat-assistant-answer-surface-dialog onyx-donor-answer-surface-dialog"
          data-testid="analysis-explorer-dialog-v2"
          role="dialog"
          aria-modal="true"
        >
          <div className="chat-assistant-answer-surface-dialog-bar onyx-donor-answer-surface-dialog-bar">
            <div className="v2-analysis-explorer-bar-start">
              <strong className="v2-analysis-explorer-title">探索器</strong>
              <AnswerSurfaceViewSwitch
                availableViews={availableViews}
                viewMode={viewMode}
                onSelectView={setViewMode}
                testId="analysis-explorer-view-switch"
              />
            </div>
            <button
              type="button"
              className="chat-assistant-answer-action onyx-donor-answer-surface-action"
              onClick={() => {
                setIsExplorerOpen(false)
              }}
            >
              关闭探索器
            </button>
          </div>
          <div className="v2-analysis-explorer-shell" data-testid="analysis-explorer-shell-v2">
            <AnswerSurfaceShell
              type={type}
              payload={payload}
              draftPatch={explorerDraftPatch}
              onDraftPatchChange={setExplorerDraftPatch}
              onApplyPrompt={onApplyPrompt}
              viewMode={viewMode}
              onSelectView={setViewMode}
              showViewSwitch={false}
              surfaceFrame="embedded"
              onOpenAnalysis={() => {
                const href = buildAnswerSurfaceOpenAnalysisHref(payload, {
                  prompt: '继续探索当前结果，并优先调整维度、筛选和展示形态。',
                  analysisAction: 'open_explorer',
                  patch: explorerDraftPatch
                })
                if (href) {
                  window.open(href, '_blank', 'noopener,noreferrer')
                }
              }}
              onOpenCanvas={viewMode === 'kpi' ? undefined : handleOpenCanvas}
              onAddToStory={() => {
                setIsStoryDialogOpen(true)
              }}
              renderBody={viewMode =>
                renderAnalysisBody(viewMode, payload, {
                  onLinkedSlicersChange: slicers => {
                    handleLinkedSlicersChange(setExplorerDraftPatch, slicers)
                  }
                })
              }
            />
            <div className="v2-analysis-explorer-actions">
              <button
                type="button"
                className="chat-assistant-answer-action onyx-donor-answer-surface-action"
                onClick={() => {
                  setExplorerDraftPatch({ ...appliedDraftPatch })
                }}
              >
                重置更改
              </button>
              <button
                type="button"
                className="chat-assistant-answer-action onyx-donor-answer-surface-action"
                onClick={() => {
                  setAppliedDraftPatch({ ...explorerDraftPatch })
                  setIsExplorerOpen(false)
                }}
              >
                应用到卡片
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <StorySaveDialog
        isOpen={isStoryDialogOpen}
        type={viewMode}
        payload={payload}
        onClose={() => {
          setIsStoryDialogOpen(false)
        }}
      />
    </>
  )
}
