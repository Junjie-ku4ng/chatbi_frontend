'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import {
  AnswerSurfaceShell,
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

function formatSurfaceKind(type: AnswerSurfaceView) {
  if (type === 'kpi') {
    return 'KPI surface'
  }
  return `${type.charAt(0).toUpperCase()}${type.slice(1)} surface`
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
    tokens.push(`Top ${Math.floor(draftPatch.topN)}`)
  }

  const sort = asRecord(draftPatch.sort)
  if (sort) {
    const by = typeof sort.by === 'string' && sort.by.trim() ? sort.by.trim() : undefined
    const dir = sort.dir === 'ASC' || sort.dir === 'DESC' ? sort.dir : undefined
    if (by && dir) {
      tokens.push(`Sort ${by} ${dir}`)
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
  const title =
    (typeof payload.label === 'string' && payload.label.trim()) ||
    (typeof payload.interaction?.story?.title === 'string' && payload.interaction.story.title.trim()) ||
    'Analysis result'
  const contextTokens = buildContextTokens(payload)
  const appliedDraftSummary = buildAppliedDraftSummary(appliedDraftPatch)

  useEffect(() => {
    setAppliedDraftPatch({})
    setExplorerDraftPatch({})
  }, [payload.queryLogId, payload.traceKey, type])

  function handleLinkedSlicersChange(
    applyPatch: Dispatch<SetStateAction<Record<string, unknown>>>,
    slicers: ISlicer[]
  ) {
    applyPatch(previous => mergeDraftPatchWithSlicers(previous, slicers))
  }

  async function handleOpenCanvas() {
    if (type === 'kpi' || isOpeningCanvas) {
      return
    }

    setIsOpeningCanvas(true)
    setCanvasStatus(null)

    try {
      const title =
        (typeof payload.interaction?.story?.title === 'string' && payload.interaction.story.title.trim()) ||
        (typeof payload.label === 'string' && payload.label.trim()) ||
        'Analysis result'

      const result = await saveAnswerSurfaceToStory({
        type,
        payload,
        storyTitle: `${title} canvas`,
        widgetTitle: title
      })

      window.open(result.designerHref, '_blank', 'noopener,noreferrer')
      setCanvasStatus(`Canvas ready (${result.story.id})`)
    } catch (error) {
      setCanvasStatus(error instanceof Error ? error.message : 'Canvas open failed')
    } finally {
      setIsOpeningCanvas(false)
    }
  }

  return (
    <>
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
                {formatSurfaceKind(type)}
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
            onOpenExplorer={
              type === 'kpi'
                ? undefined
                : () => {
                    setExplorerDraftPatch({ ...appliedDraftPatch })
                    setIsExplorerOpen(true)
                  }
            }
            onOpenCanvas={type === 'kpi' ? undefined : handleOpenCanvas}
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
      {canvasStatus ? <p className="v2-analysis-status">{canvasStatus}</p> : null}
      {isExplorerOpen ? (
        <div
          className="chat-assistant-answer-surface-dialog onyx-donor-answer-surface-dialog"
          data-testid="analysis-explorer-dialog-v2"
          role="dialog"
          aria-modal="true"
        >
          <div className="chat-assistant-answer-surface-dialog-bar onyx-donor-answer-surface-dialog-bar">
            <strong className="v2-analysis-explorer-title">Explorer</strong>
            <button
              type="button"
              className="chat-assistant-answer-action onyx-donor-answer-surface-action"
              onClick={() => {
                setIsExplorerOpen(false)
              }}
            >
              Close Explorer
            </button>
          </div>
          <div data-testid="analysis-explorer-shell-v2">
            <AnswerSurfaceShell
              type={type}
              payload={payload}
              draftPatch={explorerDraftPatch}
              onDraftPatchChange={setExplorerDraftPatch}
              onApplyPrompt={onApplyPrompt}
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
              onOpenCanvas={type === 'kpi' ? undefined : handleOpenCanvas}
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
                Reset changes
              </button>
              <button
                type="button"
                className="chat-assistant-answer-action onyx-donor-answer-surface-action"
                onClick={() => {
                  setAppliedDraftPatch({ ...explorerDraftPatch })
                  setIsExplorerOpen(false)
                }}
              >
                Apply to card
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <StorySaveDialog
        isOpen={isStoryDialogOpen}
        type={type}
        payload={payload}
        onClose={() => {
          setIsStoryDialogOpen(false)
        }}
      />
    </>
  )
}
