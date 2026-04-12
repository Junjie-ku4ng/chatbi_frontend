'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import {
  getAnalysisContext,
  listAnalysisHistory,
  listAnalysisSuggestions,
  previewAnalysis,
  replayAnalysisHistoryRun
} from './api'
import { AnalysisFilterBuilder, type AnalysisFilterState } from './filter-builder'
import { AnalysisTimeControls, type AnalysisTimeState } from './time-controls'
import { DerivedMetricBuilder, type DerivedMetricInput } from './derived-metric-builder'
import { AnalysisTemplateManager } from './template-manager'
import { VirtualizedList } from '@/modules/shared/lists/virtualized-list'
import { mergePagingItems, toPagingWindowState } from '@/modules/shared/paging/paging-adapter'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

export function AskAnalysisPanel(props: {
  enabled: boolean
  modelId?: string
  queryLogId?: string
  baseQueryLogId?: string
  initialDraft?: {
    prompt?: string
    patch?: Record<string, unknown>
    analysisAction?: string
  }
  onApplyFollowup: (input: {
    prompt: string
    patch: Record<string, unknown>
    analysisAction?: string
    templateId?: string
    baseQueryLogId?: string
  }) => Promise<Record<string, unknown>>
  onTemplateApplied: (payload: Record<string, unknown>) => Promise<void> | void
}) {
  const [prompt, setPrompt] = useState('继续分析')
  const [topN, setTopN] = useState('10')
  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC')
  const [filter, setFilter] = useState<AnalysisFilterState>({})
  const [time, setTime] = useState<AnalysisTimeState>({
    mode: 'last_n',
    lastN: 1
  })
  const [pivotRows, setPivotRows] = useState('')
  const [columnMode, setColumnMode] = useState<'metrics_only' | 'dimension_split'>('metrics_only')
  const [derivedMetrics, setDerivedMetrics] = useState<DerivedMetricInput[]>([])
  const [compareToRunId, setCompareToRunId] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [historyRows, setHistoryRows] = useState<any[]>([])
  const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(null)

  const enabled = props.enabled && Boolean(props.queryLogId)
  const historyQueryLogId = props.baseQueryLogId ?? props.queryLogId

  const contextQuery = useQuery({
    queryKey: ['ask-analysis-context', historyQueryLogId],
    enabled: Boolean(enabled && historyQueryLogId),
    queryFn: () => getAnalysisContext(historyQueryLogId as string)
  })

  const historyQuery = useQuery({
    queryKey: ['ask-analysis-history', historyQueryLogId],
    enabled: Boolean(enabled && historyQueryLogId),
    queryFn: () => listAnalysisHistory(historyQueryLogId as string, { limit: 50, cursor: '0' })
  })

  const sortSuggestionsQuery = useQuery({
    queryKey: ['ask-analysis-sort-suggestions', props.queryLogId],
    enabled,
    queryFn: () =>
      listAnalysisSuggestions(props.queryLogId as string, {
        kind: 'sort_metric',
        topK: 20
      })
  })

  const dimensions = useMemo(() => {
    const explain = contextQuery.data?.explain
    if (!explain || typeof explain !== 'object') return []
    const rawDimensions = Array.isArray((explain as Record<string, unknown>).dimensions)
      ? ((explain as Record<string, unknown>).dimensions as Array<Record<string, unknown>>)
      : []
    const values = rawDimensions
      .map(item => (typeof item.dimension === 'string' ? item.dimension : ''))
      .filter(item => item !== '')
    return Array.from(new Set(values))
  }, [contextQuery.data])

  const sortableMetrics = useMemo(() => {
    const fromCapabilities = Array.isArray(contextQuery.data?.capabilities?.sortableMetrics)
      ? contextQuery.data?.capabilities?.sortableMetrics ?? []
      : []
    const fromSuggestions = Array.isArray(sortSuggestionsQuery.data?.items)
      ? sortSuggestionsQuery.data.items
          .map(item => (typeof item.code === 'string' ? item.code : typeof item.label === 'string' ? item.label : ''))
          .filter(item => item !== '')
      : []
    const currentDraftSort = sortBy.trim() !== '' ? [sortBy.trim()] : []
    return Array.from(new Set([...fromCapabilities, ...fromSuggestions, ...currentDraftSort]))
  }, [contextQuery.data?.capabilities?.sortableMetrics, sortSuggestionsQuery.data?.items, sortBy])

  const patch = useMemo(() => buildAnalysisPatch({ topN, sortBy, sortDir, filter, time, pivotRows, columnMode, derivedMetrics }), [
    topN,
    sortBy,
    sortDir,
    filter,
    time,
    pivotRows,
    columnMode,
    derivedMetrics
  ])

  const previewMutation = useMutation({
    mutationFn: async () =>
      previewAnalysis(historyQueryLogId as string, {
        patch,
        prompt: prompt.trim(),
        analysisAction: 'analysis_panel_preview',
        compareToRunId: compareToRunId.trim() || undefined
      }),
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  const applyMutation = useMutation({
    mutationFn: async () =>
      props.onApplyFollowup({
        prompt: prompt.trim() || '继续分析',
        patch,
        analysisAction: 'analysis_panel_apply',
        baseQueryLogId: props.baseQueryLogId
      }),
    onSuccess: async () => {
      setStatus('Applied successfully')
      await Promise.all([contextQuery.refetch(), historyQuery.refetch()])
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  const replayMutation = useMutation({
    mutationFn: async (input: { runId: string; promptOverride?: string }) =>
      replayAnalysisHistoryRun(historyQueryLogId as string, input.runId, {
        strategy: input.promptOverride ? 'exact_with_prompt_override' : 'exact',
        promptOverride: input.promptOverride,
        analysisAction: 'analysis_panel_replay'
      }),
    onSuccess: async payload => {
      setStatus(`Replayed run ${payload.replayedFromRunId}`)
      await Promise.all([contextQuery.refetch(), historyQuery.refetch()])
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  const loadMoreHistoryMutation = useMutation({
    mutationFn: async (cursor: string) => listAnalysisHistory(historyQueryLogId as string, { limit: 50, cursor }),
    onSuccess: payload => {
      const windowed = toPagingWindowState(payload)
      setHistoryRows(current => mergePagingItems(current, windowed.items, item => String((item as any).id)))
      setHistoryNextCursor(windowed.nextCursor)
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  useEffect(() => {
    setPrompt('继续分析')
    setTopN('10')
    setSortBy('')
    setSortDir('DESC')
    setFilter({})
    setTime({
      mode: 'last_n',
      lastN: 1
    })
    setPivotRows('')
    setColumnMode('metrics_only')
    setDerivedMetrics([])
    setCompareToRunId('')
    setStatus(null)
    previewMutation.reset?.()
    replayMutation.reset?.()
  }, [historyQueryLogId])

  useEffect(() => {
    const suggestedTopN = contextQuery.data?.defaultPresets?.topN
    if (typeof suggestedTopN === 'number' && Number.isFinite(suggestedTopN) && topN.trim() === '10') {
      setTopN(String(suggestedTopN))
    }
  }, [contextQuery.data?.defaultPresets?.topN, topN])

  const analysisReady = enabled && !contextQuery.isLoading && !historyQuery.isLoading && !contextQuery.error && !historyQuery.error

  useEffect(() => {
    const payload = historyQuery.data
    if (!payload) return
    const windowed = toPagingWindowState(payload)
    setHistoryRows(windowed.items)
    setHistoryNextCursor(windowed.nextCursor)
  }, [historyQuery.data])

  useEffect(() => {
    setCompareToRunId('')
  }, [historyQueryLogId])

  useEffect(() => {
    const firstHistoryId = historyRows[0]?.id
    if (firstHistoryId && compareToRunId.trim() === '') {
      setCompareToRunId(firstHistoryId)
    }
  }, [historyRows, compareToRunId])

  useEffect(() => {
    if (!props.initialDraft) {
      return
    }
    if (typeof props.initialDraft.prompt === 'string' && props.initialDraft.prompt.trim() !== '') {
      setPrompt(props.initialDraft.prompt.trim())
    }
    applyDraftPatch(props.initialDraft.patch, {
      setTopN,
      setSortBy,
      setSortDir,
      setFilter,
      setTime,
      setPivotRows,
      setColumnMode
    })
    if (props.initialDraft.analysisAction) {
      setStatus(`Loaded ${props.initialDraft.analysisAction} draft`)
    }
  }, [props.initialDraft])

  const applyPresetBundle = (bundlePatch: Record<string, unknown>) => {
    if (typeof bundlePatch.topN === 'number') {
      setTopN(String(bundlePatch.topN))
    } else if (typeof bundlePatch.limit === 'number') {
      setTopN(String(bundlePatch.limit))
    }
    if (bundlePatch.sort && typeof bundlePatch.sort === 'object') {
      const sort = bundlePatch.sort as Record<string, unknown>
      if (typeof sort.by === 'string' && sort.by.trim() !== '') {
        setSortBy(sort.by.trim())
      }
      setSortDir(sort.dir === 'ASC' ? 'ASC' : 'DESC')
    }
    if (bundlePatch.time && typeof bundlePatch.time === 'object') {
      const nextTime = bundlePatch.time as Record<string, unknown>
      setTime({
        mode: nextTime.type === 'between' || nextTime.type === 'ytd' ? (nextTime.type as AnalysisTimeState['mode']) : 'last_n',
        lastN: typeof nextTime.lastN === 'number' ? nextTime.lastN : 1,
        compare: nextTime.compare === 'yoy' || nextTime.compare === 'mom' ? nextTime.compare : undefined
      })
    }
    if (Array.isArray(bundlePatch.filters) && bundlePatch.filters.length > 0) {
      const first = bundlePatch.filters[0] as Record<string, unknown>
      const dimension = typeof first.dimension === 'string' ? first.dimension : ''
      const member =
        Array.isArray(first.members) && first.members.length > 0 && typeof first.members[0] === 'string' ? first.members[0] : ''
      setFilter({
        dimension: dimension || undefined,
        member: member || undefined
      })
    }
  }

  if (!props.enabled) {
    return <span className="badge badge-warn">Analysis V2 disabled</span>
  }
  if (!props.queryLogId) {
    return <span className="badge badge-warn">Run a query to start analysis</span>
  }

  return (
    <section data-testid="ask-analysis-panel-v2" className="card ask-analysis-panel">
      <strong className="ask-analysis-title">Analysis Console V2</strong>
      <textarea
        data-testid="ask-analysis-prompt"
        value={prompt}
        onChange={event => setPrompt(event.target.value)}
        rows={2}
        className="ask-analysis-control ask-analysis-textarea"
      />

      {(contextQuery.data?.presetBundles ?? []).length > 0 ? (
        <section data-testid="ask-analysis-presets" className="card ask-analysis-subpanel">
          <strong className="ask-analysis-subtitle">Preset bundles</strong>
          <div className="ask-analysis-chip-row">
            {(contextQuery.data?.presetBundles ?? []).map(bundle => (
              <button
                key={bundle.id}
                type="button"
                className={`${bundle.riskLevel === 'high' ? 'badge badge-danger' : bundle.riskLevel === 'medium' ? 'badge badge-warn' : 'badge badge-ok'} ask-analysis-chip`}
                onClick={() => applyPresetBundle(bundle.patch)}
              >
                {bundle.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ask-analysis-fieldset">
        <strong className="ask-analysis-field-label">TopN / Sort</strong>
        <div className="ask-analysis-chip-row">
          <span className="badge badge-ok">
            range: {contextQuery.data?.safeRanges?.topN?.min ?? 1} - {contextQuery.data?.safeRanges?.topN?.max ?? 200}
          </span>
          {contextQuery.data?.uiCapabilities?.supportsPreview === false ? (
            <span className="badge badge-warn">Preview unavailable for current model policy.</span>
          ) : null}
        </div>
        <div className="ask-analysis-row">
          <input
            data-testid="ask-analysis-topn"
            value={topN}
            onChange={event => setTopN(event.target.value)}
            type="number"
            min={1}
            className="ask-analysis-control ask-analysis-control-number"
          />
          <select
            data-testid="ask-analysis-sortby"
            value={sortBy}
            onChange={event => setSortBy(event.target.value)}
            className="ask-analysis-control ask-analysis-control-grow"
          >
            <option value="">no sort</option>
            {sortableMetrics.map(metric => (
              <option key={metric} value={metric}>
                {metric}
              </option>
            ))}
          </select>
          <select
            data-testid="ask-analysis-sortdir"
            value={sortDir}
            onChange={event => setSortDir(event.target.value === 'ASC' ? 'ASC' : 'DESC')}
            className="ask-analysis-control"
          >
            <option value="DESC">DESC</option>
            <option value="ASC">ASC</option>
          </select>
        </div>
      </section>

      <AnalysisFilterBuilder queryLogId={props.queryLogId} dimensions={dimensions} value={filter} onChange={setFilter} />

      <AnalysisTimeControls
        value={time}
        onChange={setTime}
        presets={contextQuery.data?.capabilities?.timePresets ?? []}
        onApplyPreset={preset => {
          const patchTime =
            preset && typeof preset === 'object' && preset.patch && typeof preset.patch === 'object'
              ? ((preset.patch as Record<string, unknown>).time as Record<string, unknown> | undefined)
              : undefined
          if (!patchTime) return
          setTime({
            mode:
              patchTime.type === 'between' || patchTime.type === 'ytd'
                ? (patchTime.type as AnalysisTimeState['mode'])
                : 'last_n',
            lastN: typeof patchTime.lastN === 'number' ? patchTime.lastN : 1,
            compare: patchTime.compare === 'yoy' || patchTime.compare === 'mom' ? patchTime.compare : undefined
          })
        }}
      />

      <section className="ask-analysis-fieldset">
        <strong className="ask-analysis-field-label">Pivot</strong>
        <input
          data-testid="ask-analysis-pivot-rows"
          value={pivotRows}
          onChange={event => setPivotRows(event.target.value)}
          placeholder="row dimensions (comma separated)"
          className="ask-analysis-control"
        />
        <select
          data-testid="ask-analysis-pivot-mode"
          value={columnMode}
          onChange={event => setColumnMode(event.target.value === 'dimension_split' ? 'dimension_split' : 'metrics_only')}
          className="ask-analysis-control"
        >
          <option value="metrics_only">metrics_only</option>
          <option value="dimension_split">dimension_split</option>
        </select>
      </section>

      <DerivedMetricBuilder value={derivedMetrics} onChange={setDerivedMetrics} />

      <section className="ask-analysis-fieldset">
        <strong className="ask-analysis-field-label">Preview compare</strong>
        <select
          data-testid="ask-analysis-compare-run"
          value={compareToRunId}
          onChange={event => setCompareToRunId(event.target.value)}
          className="ask-analysis-control"
        >
          <option value="">no compare baseline</option>
          {historyRows.map(item => (
            <option key={String((item as any).id)} value={String((item as any).id)}>
              {String((item as any).id)} · {String((item as any).status ?? '')} · {String((item as any).prompt ?? '')}
            </option>
          ))}
        </select>
      </section>

      <div className="ask-analysis-actions">
        <button
          data-testid="ask-analysis-preview"
          type="button"
          className="badge badge-warn ask-analysis-chip"
          disabled={previewMutation.isPending}
          onClick={() => previewMutation.mutate()}
        >
          {previewMutation.isPending ? 'Previewing...' : 'Preview'}
        </button>
        <button
          data-testid="ask-analysis-apply"
          type="button"
          className="badge badge-ok ask-analysis-chip"
          disabled={applyMutation.isPending}
          onClick={() => applyMutation.mutate()}
        >
          {applyMutation.isPending ? 'Applying...' : 'Apply'}
        </button>
      </div>

      {previewMutation.data ? (
        <section data-testid="ask-analysis-preview-result" className="card ask-analysis-subpanel">
          <strong className="ask-analysis-subtitle">Preview</strong>
          <span className={previewMutation.data.risk === 'high' ? 'badge badge-danger' : 'badge badge-warn'}>
            risk: {previewMutation.data.risk}
          </span>
          {previewMutation.data.estimatedRowImpact ? (
            <span className="badge badge-ok">
              row impact: {previewMutation.data.estimatedRowImpact.direction ?? 'same'} (
              {previewMutation.data.estimatedRowImpact.baselineLimit ?? 0} → {previewMutation.data.estimatedRowImpact.previewLimit ?? 0})
            </span>
          ) : null}
          {(previewMutation.data.riskReasons ?? []).length > 0 ? (
            <ul className="ask-analysis-reason-list">
              {(previewMutation.data.riskReasons ?? []).map(reason => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          {previewMutation.data.comparison ? (
            <div data-testid="ask-analysis-preview-comparison" className="ask-analysis-chip-row">
              <span className="badge badge-warn">baseline: {previewMutation.data.comparison.compareToRunId ?? 'n/a'}</span>
              <span className="badge badge-ok">field delta: {previewMutation.data.comparison.changedFieldDelta ?? 0}</span>
              <span className="badge badge-ok">risk delta: {previewMutation.data.comparison.riskDelta ?? 0}</span>
              {typeof previewMutation.data.comparison.rowImpactDelta === 'number' ? (
                <span className="badge badge-ok">row delta: {previewMutation.data.comparison.rowImpactDelta}</span>
              ) : null}
            </div>
          ) : null}
          <div className="ask-analysis-preview-changes">
            {(previewMutation.data.changes ?? []).map((item, index) => (
              <div key={`change-${index}`} className="ask-analysis-preview-change">
                <strong>{String(item.field ?? 'unknown')}</strong>
                <div className="ask-analysis-muted-text">
                  {String(item.action ?? 'update')} {String(item.message ?? '')}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {contextQuery.data?.failureRecovery?.canReplayFailed && contextQuery.data?.failureRecovery?.latestFailedRunId ? (
        <section className="card ask-analysis-subpanel">
          <strong className="ask-analysis-subtitle">Failure recovery</strong>
          <span className="badge badge-warn">latest failed run: {contextQuery.data.failureRecovery.latestFailedRunId}</span>
          <button
            data-testid="ask-analysis-replay-latest-failed"
            type="button"
            className="badge badge-warn ask-analysis-chip ask-analysis-fit"
            disabled={replayMutation.isPending}
            onClick={() =>
              replayMutation.mutate({
                runId: contextQuery.data?.failureRecovery?.latestFailedRunId as string
              })
            }
          >
            Replay latest failed step
          </button>
        </section>
      ) : null}

      <section data-testid="ask-analysis-history-panel" className="card ask-analysis-subpanel">
        <strong className="ask-analysis-subtitle">History</strong>
        <LoadablePanel
          loading={historyQuery.isLoading}
          error={historyQuery.error}
          empty={historyRows.length === 0}
          loadingLabel="加载分析历史..."
          emptyLabel="暂无分析历史"
          retry={() => {
            void historyQuery.refetch()
          }}
        >
          <VirtualizedList
            items={historyRows}
            estimateSize={118}
            height={320}
            hasMore={Boolean(historyNextCursor)}
            isLoadingMore={loadMoreHistoryMutation.isPending}
            onLoadMore={() => {
              if (historyNextCursor && !loadMoreHistoryMutation.isPending) {
                loadMoreHistoryMutation.mutate(historyNextCursor)
              }
            }}
            getKey={item => String((item as any).id)}
            renderItem={item => (
              <article key={(item as any).id} className="card ask-analysis-history-item">
                <div className="ask-analysis-row ask-analysis-row-wrap">
                  <span className={(item as any).status === 'success' ? 'badge badge-ok' : 'badge badge-danger'}>{(item as any).status}</span>
                  <span className="ask-analysis-mini ask-analysis-muted-text">{(item as any).createdAt ?? 'n/a'}</span>
                  {(item as any).followupQueryLogId ? <span className="badge badge-warn">log: {(item as any).followupQueryLogId}</span> : null}
                  {(item as any).replayOfRunId ? <span className="badge badge-ok">replay of {(item as any).replayOfRunId}</span> : null}
                </div>
                <span className="ask-analysis-mini">{String((item as any).prompt ?? '')}</span>
                {(item as any).patchSummary ? (
                  <div className="ask-analysis-chip-row">
                    {typeof (item as any).patchSummary.topN === 'number' ? (
                      <span className="badge badge-ok">topN: {(item as any).patchSummary.topN}</span>
                    ) : null}
                    {(item as any).patchSummary.sortBy ? <span className="badge badge-warn">sort: {(item as any).patchSummary.sortBy}</span> : null}
                    {typeof (item as any).patchSummary.filterCount === 'number' ? (
                      <span className="badge badge-warn">filters: {(item as any).patchSummary.filterCount}</span>
                    ) : null}
                    {(item as any).patchSummary.timeType ? <span className="badge badge-warn">time: {(item as any).patchSummary.timeType}</span> : null}
                  </div>
                ) : null}
                <div className="ask-analysis-chip-row">
                  <button
                    type="button"
                    className="badge badge-ok ask-analysis-chip"
                    onClick={() => setPrompt(String((item as any).prompt ?? ''))}
                  >
                    Reuse prompt
                  </button>
                  <button
                    data-testid={`ask-analysis-replay-${(item as any).id}`}
                    type="button"
                    className="badge badge-warn ask-analysis-chip"
                    disabled={replayMutation.isPending}
                    onClick={() =>
                      replayMutation.mutate({
                        runId: String((item as any).id)
                      })
                    }
                  >
                    Replay exact step
                  </button>
                  {(item as any).status !== 'success' ? (
                    <button
                      data-testid={`ask-analysis-replay-override-${(item as any).id}`}
                      type="button"
                      className="badge badge-warn ask-analysis-chip"
                      onClick={() => {
                        replayMutation.mutate({
                          runId: String((item as any).id),
                          promptOverride: String((item as any).prompt ?? '')
                        })
                      }}
                    >
                      Replay with prompt override
                    </button>
                  ) : null}
                </div>
              </article>
            )}
          />
        </LoadablePanel>
      </section>

      {props.modelId ? (
        <AnalysisTemplateManager
          modelId={props.modelId}
          queryLogId={historyQueryLogId as string}
          currentPatch={patch}
          analysisAction="analysis_panel_template"
          onTemplateApplied={props.onTemplateApplied}
        />
      ) : null}

      {analysisReady ? (
        <span data-testid="ask-analysis-ready" className="badge badge-ok">
          ready
        </span>
      ) : null}
      {status ? <span data-testid="ask-analysis-status" className="badge badge-warn">{status}</span> : null}
    </section>
  )
}

export function buildAnalysisPatch(input: {
  topN: string
  sortBy: string
  sortDir: 'ASC' | 'DESC'
  filter: AnalysisFilterState
  time: AnalysisTimeState
  pivotRows: string
  columnMode: 'metrics_only' | 'dimension_split'
  derivedMetrics: DerivedMetricInput[]
}) {
  const patch: Record<string, unknown> = {}

  const topN = Number(input.topN)
  if (Number.isFinite(topN) && topN > 0) {
    patch.topN = Math.floor(topN)
  }

  if (input.sortBy.trim() !== '') {
    patch.sort = {
      by: input.sortBy.trim(),
      dir: input.sortDir
    }
  }

  if (input.filter.dimension && input.filter.member && input.filter.member.trim() !== '') {
    patch.filters = [
      {
        dimension: input.filter.dimension,
        ...(input.filter.hierarchy ? { hierarchy: input.filter.hierarchy } : {}),
        ...(input.filter.level ? { level: input.filter.level } : {}),
        op: 'IN',
        members: [input.filter.member.trim()],
        ...(input.filter.memberKey ? { memberHints: [input.filter.memberKey] } : {})
      }
    ]
  }

  patch.time = {
    type: input.time.mode,
    lastN: Math.max(1, Math.floor(input.time.lastN || 1)),
    compare: input.time.compare
  }

  const rowDimensions = input.pivotRows
    .split(',')
    .map(item => item.trim())
    .filter(item => item !== '')
  const derivedMetrics = input.derivedMetrics
    .filter(item => item.code.trim() !== '' && item.formula.trim() !== '')
    .map(item => ({
      code: item.code.trim(),
      formula: item.formula.trim(),
      label: item.label?.trim() || undefined
    }))
  if (rowDimensions.length > 0 || derivedMetrics.length > 0) {
    patch.analysis = {
      pivot: rowDimensions.length > 0 ? { rowDimensions, columnMode: input.columnMode } : undefined,
      derivedMetrics: derivedMetrics.length > 0 ? derivedMetrics : undefined
    }
  }

  return patch
}

function applyDraftPatch(
  patch: Record<string, unknown> | undefined,
  setters: {
    setTopN: (value: string) => void
    setSortBy: (value: string) => void
    setSortDir: (value: 'ASC' | 'DESC') => void
    setFilter: (value: AnalysisFilterState) => void
    setTime: (value: AnalysisTimeState) => void
    setPivotRows: (value: string) => void
    setColumnMode: (value: 'metrics_only' | 'dimension_split') => void
  }
) {
  if (!patch || typeof patch !== 'object') {
    return
  }
  const record = patch as Record<string, unknown>
  const topN = Number(record.topN)
  if (Number.isFinite(topN) && topN > 0) {
    setters.setTopN(String(Math.floor(topN)))
  }
  const sort = typeof record.sort === 'object' && record.sort ? (record.sort as Record<string, unknown>) : undefined
  if (typeof sort?.by === 'string' && sort.by.trim() !== '') {
    setters.setSortBy(sort.by.trim())
    setters.setSortDir(sort.dir === 'ASC' ? 'ASC' : 'DESC')
  }
  const filters = Array.isArray(record.filters) ? record.filters : []
  if (filters.length > 0 && typeof filters[0] === 'object' && filters[0]) {
    const first = filters[0] as Record<string, unknown>
    const member =
      Array.isArray(first.members) && typeof first.members[0] === 'string'
        ? first.members[0]
        : typeof first.member === 'string'
          ? first.member
          : undefined
    setters.setFilter({
      dimension: typeof first.dimension === 'string' ? first.dimension : undefined,
      member,
      memberKey:
        Array.isArray(first.memberHints) && typeof first.memberHints[0] === 'string' ? first.memberHints[0] : undefined,
      hierarchy: typeof first.hierarchy === 'string' ? first.hierarchy : undefined,
      level: typeof first.level === 'string' ? first.level : undefined
    })
  }
  const time = typeof record.time === 'object' && record.time ? (record.time as Record<string, unknown>) : undefined
  if (time) {
    setters.setTime({
      mode:
        time.type === 'between' || time.type === 'ytd'
          ? (time.type as AnalysisTimeState['mode'])
          : 'last_n',
      lastN: typeof time.lastN === 'number' ? time.lastN : 1,
      compare: time.compare === 'yoy' || time.compare === 'mom' ? time.compare : undefined
    })
  }
  const analysis = typeof record.analysis === 'object' && record.analysis ? (record.analysis as Record<string, unknown>) : undefined
  const pivot = typeof analysis?.pivot === 'object' && analysis.pivot ? (analysis.pivot as Record<string, unknown>) : undefined
  if (pivot && Array.isArray(pivot.rowDimensions)) {
    setters.setPivotRows(pivot.rowDimensions.filter((item): item is string => typeof item === 'string').join(', '))
    setters.setColumnMode(pivot.columnMode === 'dimension_split' ? 'dimension_split' : 'metrics_only')
  }
}
