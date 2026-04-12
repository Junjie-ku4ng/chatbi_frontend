'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ApiRequestError } from '@/lib/api-client'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import {
  applyIndicatorCandidates,
  compileSourceModelDraft,
  createSourceModelDraft,
  createPaDeployment,
  createPaLoadJob,
  createSemanticDraft,
  getAskReadiness,
  getPaDeploymentRefreshPolicy,
  getPaDeploymentReleaseDecision,
  getPaDeployment,
  getPaLoadJobItems,
  getPaLoadJobReconciliation,
  getSemanticModel,
  getSourceModelDraft,
  listSourceCatalogColumns,
  listSourceCatalogTables,
  introspectSourceModelDraft,
  listPaDeploymentLoadJobs,
  listPaDeploymentRefreshRuns,
  previewIndicatorCandidates,
  previewPaDeployment,
  type IndicatorCandidatePreview,
  type PaDeploymentRecord,
  type PaLoadJobRecord,
  type SemanticDraftResult,
  type SourceCatalogColumn,
  type SourceCatalogTable,
  type SourceModelDraft
} from '@/modules/data-model-release/api'
import { buildDataModelReleaseHref } from '@/modules/data-model-release/route-href'
import { ReleaseJourneyStepper, type ReleaseJourneyStep } from '@/modules/data-model-release/release-journey-stepper'
import { SourceModelBootstrapPanel } from '@/modules/data-model-release/source-model-bootstrap-panel'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton, NexusCard } from '@/modules/shared/ui/primitives'

function normalizeError(error: unknown) {
  if (error instanceof ApiRequestError) {
    return `${error.status}: ${error.message}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Request failed'
}

function normalizeActionError(action: string, error: unknown) {
  if (error instanceof ApiRequestError && error.status === 403) {
    return `${action} denied: ${error.message || 'Permission denied'}`
  }
  return normalizeError(error)
}

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function toRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(item => String(item)) : []
}

function formatTimestamp(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return '-'
  }
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return value
  }
  return new Date(timestamp).toLocaleString('en-CA', {
    hour12: false
  })
}

function formatLagSummary(freshness: unknown) {
  const record = toRecord(freshness)
  const lagMinutes = typeof record.lagMinutes === 'number' ? record.lagMinutes : undefined
  const budgetMinutes = typeof record.budgetMinutes === 'number' ? record.budgetMinutes : undefined
  if (lagMinutes === undefined && budgetMinutes === undefined) {
    return 'Lag -'
  }
  if (lagMinutes !== undefined && budgetMinutes !== undefined) {
    return `Lag ${lagMinutes}m / Budget ${budgetMinutes}m`
  }
  if (lagMinutes !== undefined) {
    return `Lag ${lagMinutes}m`
  }
  return `Budget ${budgetMinutes}m`
}

function statusTone(status: unknown): 'neutral' | 'ok' | 'warn' | 'danger' | 'brand' {
  const normalized = typeof status === 'string' ? status.toLowerCase() : ''
  if (['allowed', 'ready', 'released', 'succeeded', 'passed', 'active'].includes(normalized)) {
    return 'ok'
  }
  if (['blocked', 'failed', 'error', 'denied'].includes(normalized)) {
    return 'danger'
  }
  if (['running', 'pending', 'queued', 'draft'].includes(normalized)) {
    return 'warn'
  }
  if (['scheduled', 'incremental', 'full_snapshot', 'backfill'].includes(normalized)) {
    return 'brand'
  }
  return 'neutral'
}

function SummaryChips({ items }: { items: Array<{ label: string; value: string; tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'brand' }> }) {
  if (items.length === 0) {
    return null
  }
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {items.map(item => (
        <NexusBadge key={`${item.label}:${item.value}`} tone={item.tone ?? 'neutral'}>
          {item.label}: {item.value}
        </NexusBadge>
      ))}
    </div>
  )
}

function resolveSourceTableName(table: SourceCatalogTable) {
  if (typeof table.table === 'string' && table.table.trim().length > 0) {
    return table.table
  }
  const sourcePath = typeof table.sourcePath === 'string' ? table.sourcePath.trim() : ''
  if (!sourcePath) {
    return 'source_table'
  }
  const parts = sourcePath.split('.').filter(Boolean)
  return parts[parts.length - 1] ?? sourcePath
}

function replaceWorkbenchRoute(router: ReturnType<typeof useRouter>, patch: Parameters<typeof buildDataModelReleaseHref>[0]) {
  router.replace(
    buildDataModelReleaseHref(patch, {
      baseSearch: window.location.search
    })
  )
}

export default function DataModelReleasePage({
  dataSourceId,
  draftId,
  modelId,
  deploymentId
}: {
  dataSourceId?: string
  draftId?: string
  modelId?: string
  deploymentId?: string
}) {
  const resolvedDataSourceId = dataSourceId ?? ''
  const routeDraftId = draftId ?? ''
  const routeModelId = modelId ?? ''
  const routeDeploymentId = deploymentId ?? ''
  const [activeDraftId, setActiveDraftId] = useState('')
  const [activeDraftSourceId, setActiveDraftSourceId] = useState('')
  const [activeModelId, setActiveModelId] = useState('')
  const [activeModelSourceId, setActiveModelSourceId] = useState('')
  const [activeDeploymentId, setActiveDeploymentId] = useState('')
  const [activeDeploymentSourceId, setActiveDeploymentSourceId] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [introspectionResult, setIntrospectionResult] = useState<unknown>(null)
  const [compileResult, setCompileResult] = useState<unknown>(null)
  const [semanticDraft, setSemanticDraft] = useState<SemanticDraftResult | null>(null)
  const [deploymentPreview, setDeploymentPreview] = useState<unknown>(null)
  const [indicatorCandidates, setIndicatorCandidates] = useState<IndicatorCandidatePreview | null>(null)
  const [candidateApplyResult, setCandidateApplyResult] = useState<unknown>(null)
  const [deployment, setDeployment] = useState<PaDeploymentRecord | null>(null)
  const [loadJob, setLoadJob] = useState<PaLoadJobRecord | null>(null)
  const [loadItems, setLoadItems] = useState<unknown>(null)
  const [loadReconciliation, setLoadReconciliation] = useState<unknown>(null)
  const [readinessResult, setReadinessResult] = useState<unknown>(null)
  const [catalogTables, setCatalogTables] = useState<SourceCatalogTable[]>([])
  const [catalogColumns, setCatalogColumns] = useState<SourceCatalogColumn[]>([])
  const router = useRouter()
  const queryClient = useQueryClient()
  const dataSourceIdRef = useRef(resolvedDataSourceId)
  dataSourceIdRef.current = resolvedDataSourceId

  useEffect(() => {
    setCatalogTables([])
    setCatalogColumns([])
    setStatus(null)
  }, [resolvedDataSourceId])

  useEffect(() => {
    if (routeDraftId && routeDraftId === activeDraftId) {
      setActiveDraftId('')
      setActiveDraftSourceId('')
    }
  }, [activeDraftId, routeDraftId])

  useEffect(() => {
    if (routeModelId && routeModelId === activeModelId) {
      setActiveModelId('')
      setActiveModelSourceId('')
    }
  }, [activeModelId, routeModelId])

  useEffect(() => {
    if (routeDeploymentId && routeDeploymentId === activeDeploymentId) {
      setActiveDeploymentId('')
      setActiveDeploymentSourceId('')
    }
  }, [activeDeploymentId, routeDeploymentId])

  const pendingDraftId = activeDraftSourceId === resolvedDataSourceId ? activeDraftId : ''
  const pendingModelId = activeModelSourceId === resolvedDataSourceId ? activeModelId : ''
  const pendingDeploymentId = activeDeploymentSourceId === resolvedDataSourceId ? activeDeploymentId : ''
  const resolvedDraftId = pendingDraftId && pendingDraftId !== routeDraftId ? pendingDraftId : routeDraftId || pendingDraftId
  const resolvedSemanticModelId = pendingModelId && pendingModelId !== routeModelId ? pendingModelId : routeModelId || pendingModelId
  const resolvedDeploymentId =
    pendingDeploymentId && pendingDeploymentId !== routeDeploymentId ? pendingDeploymentId : routeDeploymentId || pendingDeploymentId

  useEffect(() => {
    setIntrospectionResult(null)
    setCompileResult(null)
  }, [resolvedDraftId])

  useEffect(() => {
    setIndicatorCandidates(null)
    setCandidateApplyResult(null)
    setDeploymentPreview(null)
    setReadinessResult(null)
  }, [resolvedSemanticModelId])

  useEffect(() => {
    setLoadJob(null)
    setLoadItems(null)
    setLoadReconciliation(null)
  }, [resolvedDeploymentId])

  const draftQuery = useQuery({
    queryKey: ['data-model-release-draft', resolvedDraftId],
    enabled: Boolean(resolvedDraftId),
    queryFn: () => getSourceModelDraft(resolvedDraftId)
  })

  const semanticModelQuery = useQuery({
    queryKey: ['data-model-release-semantic-model', resolvedSemanticModelId],
    enabled: Boolean(resolvedSemanticModelId),
    queryFn: () => getSemanticModel(resolvedSemanticModelId)
  })
  const deploymentQuery = useQuery({
    queryKey: ['data-model-release-deployment', resolvedDeploymentId],
    enabled: Boolean(resolvedDeploymentId),
    queryFn: () => getPaDeployment(resolvedDeploymentId)
  })

  const localSemanticModel = semanticDraft?.id === resolvedSemanticModelId ? semanticDraft : null
  const localDeployment = deployment?.id === resolvedDeploymentId ? deployment : null
  const hydratedSemanticModel = resolvedSemanticModelId ? localSemanticModel ?? semanticModelQuery.data ?? null : null
  const hydratedDeployment = resolvedDeploymentId ? localDeployment ?? deploymentQuery.data ?? null : null
  const semanticModelAvailable = Boolean(hydratedSemanticModel)
  const deploymentAvailable = Boolean(hydratedDeployment)
  const loadHistoryQuery = useQuery({
    queryKey: ['data-model-release-load-history', resolvedDeploymentId],
    enabled: Boolean(resolvedDeploymentId),
    queryFn: () => listPaDeploymentLoadJobs(resolvedDeploymentId)
  })
  const refreshPolicyQuery = useQuery({
    queryKey: ['data-model-release-refresh-policy', resolvedDeploymentId],
    enabled: Boolean(resolvedDeploymentId),
    queryFn: () => getPaDeploymentRefreshPolicy(resolvedDeploymentId)
  })
  const refreshRunsQuery = useQuery({
    queryKey: ['data-model-release-refresh-runs', resolvedDeploymentId],
    enabled: Boolean(resolvedDeploymentId),
    queryFn: () => listPaDeploymentRefreshRuns(resolvedDeploymentId)
  })
  const releaseDecisionQuery = useQuery({
    queryKey: ['data-model-release-release-decision', resolvedDeploymentId],
    enabled: Boolean(resolvedDeploymentId),
    queryFn: () => getPaDeploymentReleaseDecision(resolvedDeploymentId)
  })

  const draftSummary = useMemo(() => {
    const draft = draftQuery.data
    if (!draft) return []
    return [
      `version: ${draft.draftVersion ?? '-'}`,
      `tables: ${draft.tables?.length ?? 0}`,
      `relations: ${draft.relations?.length ?? 0}`,
      `latest introspection: ${draft.latestIntrospection?.tables ?? 0} tables / ${draft.latestIntrospection?.relations ?? 0} relations`
    ]
  }, [draftQuery.data])

  const selectedCandidateCodes = useMemo(
    () =>
      (indicatorCandidates?.candidates ?? [])
        .filter(candidate => candidate.status !== 'existing')
        .map(candidate => candidate.code),
    [indicatorCandidates]
  )
  const deploymentDiffSummary = toRecord(toRecord(deploymentPreview).deploymentDiffSummary)
  const deploymentDiffChips = useMemo(() => {
    const items: Array<{ label: string; value: string; tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'brand' }> = []
    const targetCube = typeof toRecord(deploymentPreview).targetCube === 'string' ? String(toRecord(deploymentPreview).targetCube) : undefined
    const loadMode = typeof toRecord(deploymentPreview).loadMode === 'string' ? String(toRecord(deploymentPreview).loadMode) : undefined
    if (targetCube) {
      items.push({ label: 'Cube', value: targetCube, tone: 'brand' })
    }
    if (loadMode) {
      items.push({ label: 'Load', value: loadMode, tone: 'neutral' })
    }
    if (typeof deploymentDiffSummary.createCount === 'number') {
      items.push({ label: 'Create', value: String(deploymentDiffSummary.createCount), tone: 'ok' })
    }
    if (typeof deploymentDiffSummary.updateCount === 'number') {
      items.push({ label: 'Update', value: String(deploymentDiffSummary.updateCount), tone: 'warn' })
    }
    if (typeof deploymentDiffSummary.deleteCount === 'number') {
      items.push({ label: 'Delete', value: String(deploymentDiffSummary.deleteCount), tone: 'danger' })
    }
    return items
  }, [deploymentDiffSummary.createCount, deploymentDiffSummary.deleteCount, deploymentDiffSummary.updateCount, deploymentPreview])
  const loadHistory = loadHistoryQuery.data?.items ?? []
  const refreshRuns = refreshRunsQuery.data?.items ?? []
  const releaseDecision = releaseDecisionQuery.data ?? null
  const releaseBlockers = toStringArray(releaseDecision?.blockers)
  const releaseFreshnessLabel = formatLagSummary(releaseDecision?.freshness)
  const hasRecoveredReleaseContext = Boolean(resolvedDraftId || resolvedSemanticModelId || resolvedDeploymentId)
  const hasLoadEvidence = Boolean(loadJob?.id || loadHistory.length > 0)
  const hasReadinessEvidence = Boolean(readinessResult)
  const journeySteps = useMemo<ReleaseJourneyStep[]>(
    () => [
      {
        key: 'data-source',
        label: 'Data Source',
        status: resolvedDataSourceId ? 'ready' : 'current',
        detail: resolvedDataSourceId || 'Create or select a data source.'
      },
      {
        key: 'source-model',
        label: 'Source Model',
        status: resolvedDraftId ? 'ready' : resolvedDataSourceId ? 'current' : 'blocked',
        detail: resolvedDraftId || (resolvedDataSourceId ? 'Load source catalog and create a source-model draft.' : 'Requires a data source.')
      },
      {
        key: 'semantic-draft',
        label: 'Semantic Draft',
        status: resolvedSemanticModelId ? 'ready' : resolvedDraftId ? 'current' : 'blocked',
        detail:
          resolvedSemanticModelId || (resolvedDraftId ? 'Create or restore a semantic model from the draft.' : 'Requires source-model draft context.')
      },
      {
        key: 'deployment',
        label: 'Deployment',
        status: resolvedDeploymentId ? 'ready' : resolvedSemanticModelId ? 'current' : 'blocked',
        detail:
          resolvedDeploymentId || (resolvedSemanticModelId ? 'Preview and create the PA deployment.' : 'Requires semantic model context.')
      },
      {
        key: 'load-refresh',
        label: 'Load / Refresh',
        status: hasLoadEvidence ? 'ready' : resolvedDeploymentId ? 'current' : 'blocked',
        detail: hasLoadEvidence ? `Load evidence available (${loadHistory.length || 1} run(s)).` : resolvedDeploymentId ? 'Run a load job or inspect deployment history.' : 'Requires deployment context.'
      },
      {
        key: 'ask-readiness',
        label: 'Ask Readiness',
        status: hasReadinessEvidence ? 'ready' : resolvedSemanticModelId ? 'current' : 'blocked',
        detail: hasReadinessEvidence ? 'Ask readiness has been evaluated for this route.' : resolvedSemanticModelId ? 'Run ask readiness before final cutover.' : 'Requires semantic model context.'
      }
    ],
    [hasLoadEvidence, hasReadinessEvidence, loadHistory.length, loadJob?.id, readinessResult, resolvedDataSourceId, resolvedDeploymentId, resolvedDraftId, resolvedSemanticModelId]
  )

  const introspectMutation = useMutation({
    mutationFn: () => introspectSourceModelDraft(resolvedDraftId),
    onSuccess: result => {
      setIntrospectionResult(result)
      setStatus('Source catalog introspection refreshed.')
    },
    onError: error => {
      setStatus(normalizeError(error))
    }
  })

  const compileMutation = useMutation({
    mutationFn: () => compileSourceModelDraft(resolvedDraftId),
    onSuccess: result => {
      setCompileResult(result)
      setStatus('Semantic compile preview generated.')
    },
    onError: error => {
      setStatus(normalizeError(error))
    }
  })

  const createSemanticDraftMutation = useMutation({
    mutationFn: () => createSemanticDraft(resolvedDraftId, `${draftQuery.data?.name ?? 'Source Draft'} semantic draft`),
    onSuccess: result => {
      setSemanticDraft(result)
      setActiveModelId(result.id)
      setActiveModelSourceId(resolvedDataSourceId)
      setDeployment(null)
      setActiveDeploymentId('')
      setActiveDeploymentSourceId('')
      replaceWorkbenchRoute(router, {
        dataSourceId: resolvedDataSourceId || null,
        draftId: resolvedDraftId || null,
        modelId: result.id,
        deploymentId: null
      })
      setStatus(`Semantic draft created: ${result.id}`)
    },
    onError: error => {
      setStatus(normalizeActionError('Create semantic draft', error))
    }
  })

  const bootstrapCatalogMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const [tables, columns] = await Promise.all([
        listSourceCatalogTables(sourceId),
        listSourceCatalogColumns(sourceId)
      ])
      return { sourceId, tables, columns }
    },
    onSuccess: result => {
      if (result.sourceId !== dataSourceIdRef.current) {
        return
      }
      setCatalogTables(result.tables)
      setCatalogColumns(result.columns)
      setStatus(`Loaded ${result.tables.length} source tables.`)
    },
    onError: (error, sourceId) => {
      if (sourceId !== dataSourceIdRef.current) {
        return
      }
      setStatus(normalizeError(error))
    }
  })

  const bootstrapDraftMutation = useMutation({
    mutationFn: async ({ sourceId, tables }: { sourceId: string; tables: SourceCatalogTable[] }) => {
      const draftName =
        tables.length > 0 ? `${tables[0]?.table ?? tables[0]?.sourcePath ?? 'Source'} Draft` : 'Source Draft'
      return createSourceModelDraft(sourceId, {
        name: draftName,
        tables: tables.map((table, index) => ({
          id: `table-${index + 1}`,
          sourcePath: table.sourcePath,
          tableName: resolveSourceTableName(table)
        }))
      })
    },
    onSuccess: (createdDraft, variables) => {
      if (variables.sourceId !== dataSourceIdRef.current) {
        return
      }
      setActiveDraftId(createdDraft.id)
      setActiveDraftSourceId(variables.sourceId)
      setActiveModelId('')
      setActiveModelSourceId('')
      setSemanticDraft(null)
      setActiveDeploymentId('')
      setActiveDeploymentSourceId('')
      setDeployment(null)
      replaceWorkbenchRoute(router, {
        dataSourceId: variables.sourceId || null,
        draftId: createdDraft.id,
        modelId: null,
        deploymentId: null
      })
      setStatus(`Source-model draft created: ${createdDraft.id}`)
    },
    onError: (error, variables) => {
      if (variables.sourceId !== dataSourceIdRef.current) {
        return
      }
      setStatus(normalizeError(error))
    }
  })

  const indicatorCandidatesMutation = useMutation({
    mutationFn: () => previewIndicatorCandidates(resolvedSemanticModelId),
    onSuccess: result => {
      setIndicatorCandidates(result)
      setStatus('Indicator candidates refreshed.')
    },
    onError: error => {
      setStatus(normalizeError(error))
    }
  })

  const applyIndicatorCandidatesMutation = useMutation({
    mutationFn: () => applyIndicatorCandidates(resolvedSemanticModelId, selectedCandidateCodes),
    onSuccess: result => {
      setCandidateApplyResult(result)
      setStatus('Indicator candidates applied as drafts.')
    },
    onError: error => {
      setStatus(normalizeActionError('Apply indicator candidates', error))
    }
  })

  const deploymentPreviewMutation = useMutation({
    mutationFn: () => previewPaDeployment(resolvedSemanticModelId),
    onSuccess: result => {
      setDeploymentPreview(result)
      setStatus('PA deployment preview generated.')
    },
    onError: error => {
      setStatus(normalizeError(error))
    }
  })

  const createDeploymentMutation = useMutation({
    mutationFn: () => createPaDeployment(resolvedSemanticModelId),
    onSuccess: result => {
      setDeployment(result)
      setActiveDeploymentId(result.id)
      setActiveDeploymentSourceId(resolvedDataSourceId)
      replaceWorkbenchRoute(router, {
        dataSourceId: resolvedDataSourceId || null,
        draftId: resolvedDraftId || null,
        modelId: resolvedSemanticModelId || null,
        deploymentId: result.id
      })
      setStatus(`PA deployment created: ${result.id}`)
    },
    onError: error => {
      setStatus(normalizeActionError('Create deployment', error))
    }
  })

  const createLoadJobMutation = useMutation({
    mutationFn: async () => {
      const job = await createPaLoadJob(resolvedDeploymentId)
      const [items, reconciliation] = await Promise.all([getPaLoadJobItems(job.id), getPaLoadJobReconciliation(job.id)])
      return { job, items, reconciliation }
    },
    onSuccess: result => {
      setLoadJob(result.job)
      setLoadItems(result.items)
      setLoadReconciliation(result.reconciliation)
      setStatus(`PA load job executed: ${result.job.id}`)
      void queryClient.invalidateQueries({ queryKey: ['data-model-release-load-history', resolvedDeploymentId] })
    },
    onError: error => {
      setStatus(normalizeActionError('Run load', error))
    }
  })

  const readinessMutation = useMutation({
    mutationFn: () => getAskReadiness(resolvedSemanticModelId),
    onSuccess: result => {
      setReadinessResult(result)
      setStatus('Ask readiness refreshed.')
    },
    onError: error => {
      setStatus(normalizeError(error))
    }
  })

  return (
    <BiCanonicalShell
      activeTab="data"
      title="Data Model Release"
      description="Source-model authoring, semantic compile, PA deployment preview and ask readiness in one read-mostly workbench."
    >
      <section data-testid="data-model-release-page" style={{ display: 'grid', gap: 16 }}>
        <BiCanonicalPanel
          testId="data-model-release-overview"
          title="Release Pipeline"
          description="Drive source-model draft to semantic preview, semantic draft creation, PA deployment preview and ask readiness without leaving the canonical BI workspace."
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <NexusBadge tone="brand">dataSourceId: {resolvedDataSourceId || '-'}</NexusBadge>
            <NexusBadge tone="ok">draftId: {resolvedDraftId || '-'}</NexusBadge>
            <NexusBadge tone="warn">semanticModelId: {resolvedSemanticModelId || '-'}</NexusBadge>
            <NexusBadge tone="neutral">deploymentId: {resolvedDeploymentId || '-'}</NexusBadge>
          </div>
          {status ? (
            <p data-testid="data-model-release-status" style={{ margin: '12px 0 0', color: 'var(--muted)' }}>
              {status}
            </p>
          ) : null}
        </BiCanonicalPanel>

        <ReleaseJourneyStepper steps={journeySteps} />

        {!hasRecoveredReleaseContext ? (
          resolvedDataSourceId ? (
            <SourceModelBootstrapPanel
              dataSourceId={resolvedDataSourceId}
              catalogTables={catalogTables}
              catalogColumns={catalogColumns}
              loadingCatalog={bootstrapCatalogMutation.isPending}
              creatingDraft={bootstrapDraftMutation.isPending}
              onLoadCatalog={() => bootstrapCatalogMutation.mutate(resolvedDataSourceId)}
              onCreateDraft={() =>
                bootstrapDraftMutation.mutate({
                  sourceId: resolvedDataSourceId,
                  tables: catalogTables
                })
              }
            />
          ) : (
            <NexusCard style={{ padding: 20 }}>
              <strong>Missing draftId</strong>
              <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>
                Open this route with <code>?dataSourceId=...&draftId=...</code> to inspect a source-model draft.
              </p>
            </NexusCard>
          )
        ) : (
          <>
            <NexusCard
              data-testid={draftQuery.data ? `data-model-release-draft-row-${draftQuery.data.id}` : 'data-model-release-draft-row-loading'}
              style={{ padding: 20, display: 'grid', gap: 12 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <strong style={{ fontSize: 20 }}>{draftQuery.data?.name ?? 'Loading source-model draft'}</strong>
                  <span style={{ color: 'var(--muted)' }}>Source-model draft owner for data model release.</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <NexusButton
                    data-testid="data-model-release-introspect"
                    type="button"
                    onClick={() => introspectMutation.mutate()}
                    disabled={!draftQuery.data || introspectMutation.isPending}
                  >
                    {introspectMutation.isPending ? 'Introspecting...' : 'Introspect'}
                  </NexusButton>
                  <NexusButton
                    data-testid="data-model-release-compile"
                    type="button"
                    onClick={() => compileMutation.mutate()}
                    disabled={!draftQuery.data || compileMutation.isPending}
                  >
                    {compileMutation.isPending ? 'Compiling...' : 'Compile'}
                  </NexusButton>
                  <NexusButton
                    data-testid="data-model-release-create-semantic-draft"
                    type="button"
                    onClick={() => createSemanticDraftMutation.mutate()}
                    disabled={!draftQuery.data || createSemanticDraftMutation.isPending}
                  >
                    {createSemanticDraftMutation.isPending ? 'Creating...' : 'Create semantic draft'}
                  </NexusButton>
                  <NexusButton
                    data-testid="data-model-release-preview-indicator-candidates"
                    type="button"
                    onClick={() => indicatorCandidatesMutation.mutate()}
                    disabled={!semanticModelAvailable || indicatorCandidatesMutation.isPending}
                  >
                    {indicatorCandidatesMutation.isPending ? 'Previewing candidates...' : 'Indicator candidates'}
                  </NexusButton>
                  <NexusButton
                    data-testid="data-model-release-apply-indicator-candidates"
                    type="button"
                    onClick={() => applyIndicatorCandidatesMutation.mutate()}
                    disabled={!semanticModelAvailable || selectedCandidateCodes.length === 0 || applyIndicatorCandidatesMutation.isPending}
                  >
                    {applyIndicatorCandidatesMutation.isPending ? 'Applying...' : 'Apply candidates'}
                  </NexusButton>
                  <NexusButton
                    data-testid="data-model-release-deployment-preview"
                    type="button"
                    onClick={() => deploymentPreviewMutation.mutate()}
                    disabled={!semanticModelAvailable || deploymentPreviewMutation.isPending}
                  >
                    {deploymentPreviewMutation.isPending ? 'Previewing...' : 'Deployment preview'}
                  </NexusButton>
                  <NexusButton
                    data-testid="data-model-release-create-deployment"
                    type="button"
                    onClick={() => createDeploymentMutation.mutate()}
                    disabled={!semanticModelAvailable || createDeploymentMutation.isPending}
                  >
                    {createDeploymentMutation.isPending ? 'Creating deployment...' : 'Create deployment'}
                  </NexusButton>
                  <NexusButton
                    data-testid="data-model-release-create-load-job"
                    type="button"
                    onClick={() => createLoadJobMutation.mutate()}
                    disabled={!deploymentAvailable || createLoadJobMutation.isPending}
                  >
                    {createLoadJobMutation.isPending ? 'Running load...' : 'Run load'}
                  </NexusButton>
                  <NexusButton
                    data-testid="data-model-release-readiness"
                    type="button"
                    onClick={() => readinessMutation.mutate()}
                    disabled={!semanticModelAvailable || readinessMutation.isPending}
                  >
                    {readinessMutation.isPending ? 'Checking...' : 'Ask readiness'}
                  </NexusButton>
                </div>
              </div>

              <LoadablePanel
                loading={draftQuery.isLoading}
                error={draftQuery.error}
                empty={!draftQuery.data}
                loadingLabel="Loading draft..."
                emptyLabel={resolvedDraftId ? 'Draft not found' : 'Source-model draft not linked to this entry point.'}
                retry={() => {
                  void draftQuery.refetch()
                }}
              >
                {draftSummary.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)' }}>
                    {draftSummary.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {draftQuery.data?.tables?.length ? (
                  <div data-testid="data-model-release-source-modeling-panel" style={{ display: 'grid', gap: 10 }}>
                    <strong>Source modeling</strong>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {draftQuery.data.tables.map(table => (
                        <li key={table.id ?? table.sourcePath}>
                          {table.role ?? 'table'}: {table.sourcePath ?? table.id}
                        </li>
                      ))}
                    </ul>
                    <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)' }}>
                      {(draftQuery.data.relations ?? []).map((relation, index) => (
                        <li key={`${relation.fromTableId}-${relation.toTableId}-${index}`}>
                          {relation.fromTableId} {relation.joinType ?? 'join'} {relation.toTableId}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </LoadablePanel>
            </NexusCard>

            <section style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <NexusCard data-testid="data-model-release-introspection-panel" style={{ padding: 20, display: 'grid', gap: 10 }}>
                <strong>Source introspection</strong>
                <span style={{ color: 'var(--muted)' }}>Latest relational/source-catalog inference payload.</span>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                  {introspectionResult ? prettyJson(introspectionResult) : 'Run introspection to inspect tables, columns and relation suggestions.'}
                </pre>
              </NexusCard>

              <NexusCard data-testid="data-model-release-compile-panel" style={{ padding: 20, display: 'grid', gap: 10 }}>
                <strong>Semantic compile preview</strong>
                <span style={{ color: 'var(--muted)' }}>Compiler output and provenance for semantic release.</span>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                  {compileResult ? prettyJson(compileResult) : 'Compile preview will show schemaSnapshot and sourceModel provenance.'}
                </pre>
              </NexusCard>

              <NexusCard data-testid="data-model-release-indicator-candidates-panel" style={{ padding: 20, display: 'grid', gap: 10 }}>
                <strong>Indicator candidates</strong>
                <span style={{ color: 'var(--muted)' }}>Preview and apply deterministic indicator candidates derived from semantic measures.</span>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                  {indicatorCandidates ? prettyJson(indicatorCandidates) : 'Preview indicator candidates after semantic draft creation.'}
                </pre>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                  {candidateApplyResult ? prettyJson(candidateApplyResult) : 'Apply candidates to create indicator drafts.'}
                </pre>
              </NexusCard>

              <NexusCard data-testid="data-model-release-deployment-panel" style={{ padding: 20, display: 'grid', gap: 10 }}>
                <strong>PA deployment preview</strong>
                <span data-testid="data-model-release-semantic-model-id" style={{ color: 'var(--muted)' }}>
                  {resolvedSemanticModelId || '-'}
                </span>
                {!resolvedSemanticModelId ? (
                  <pre data-testid="data-model-release-semantic-model-record" style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                    Open with modelId to restore the semantic model record.
                  </pre>
                ) : (
                  <LoadablePanel
                    loading={semanticModelQuery.isLoading}
                    error={semanticModelQuery.error}
                    empty={!hydratedSemanticModel}
                    loadingLabel="Loading semantic model record..."
                    emptyLabel="Semantic model record not found for this route."
                    retry={() => {
                      void semanticModelQuery.refetch()
                    }}
                  >
                    <pre data-testid="data-model-release-semantic-model-record" style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                      {prettyJson(hydratedSemanticModel)}
                    </pre>
                  </LoadablePanel>
                )}
                <div data-testid="data-model-release-deployment-diff-summary" style={{ display: 'grid', gap: 8 }}>
                  {deploymentDiffChips.length > 0 ? (
                    <>
                      <p style={{ margin: 0, fontWeight: 600 }}>
                        Create {typeof deploymentDiffSummary.createCount === 'number' ? deploymentDiffSummary.createCount : 0}
                        {' / '}
                        Update {typeof deploymentDiffSummary.updateCount === 'number' ? deploymentDiffSummary.updateCount : 0}
                        {' / '}
                        Delete {typeof deploymentDiffSummary.deleteCount === 'number' ? deploymentDiffSummary.deleteCount : 0}
                      </p>
                      <SummaryChips items={deploymentDiffChips} />
                    </>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>Preview PA deployment to inspect create/update/delete scope.</span>
                  )}
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                  {deploymentPreview ? prettyJson(deploymentPreview) : 'Create a semantic draft before previewing PA deployment.'}
                </pre>
                {!resolvedDeploymentId ? (
                  <pre data-testid="data-model-release-deployment-record" style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                    Create a deployment or open with deploymentId to inspect owner record and lifecycle state.
                  </pre>
                ) : (
                  <LoadablePanel
                    loading={deploymentQuery.isLoading}
                    error={deploymentQuery.error}
                    empty={!hydratedDeployment}
                    loadingLabel="Loading deployment record..."
                    emptyLabel="Deployment record not found for this route."
                    retry={() => {
                      void deploymentQuery.refetch()
                    }}
                  >
                    <pre data-testid="data-model-release-deployment-record" style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                      {prettyJson(hydratedDeployment)}
                    </pre>
                  </LoadablePanel>
                )}
              </NexusCard>

              <NexusCard data-testid="data-model-release-load-history-panel" style={{ padding: 20, display: 'grid', gap: 10 }}>
                <strong>Load history</strong>
                <span style={{ color: 'var(--muted)' }}>Deployment-scoped load status, retry count, and reconciliation truth.</span>
                {!resolvedDeploymentId ? (
                  <span style={{ color: 'var(--muted)' }}>Create a deployment to inspect load history.</span>
                ) : loadHistoryQuery.isLoading ? (
                  <span style={{ color: 'var(--muted)' }}>Loading deployment load history...</span>
                ) : loadHistoryQuery.error ? (
                  <span style={{ color: 'var(--danger)' }}>{normalizeError(loadHistoryQuery.error)}</span>
                ) : loadHistory.length === 0 ? (
                  <span style={{ color: 'var(--muted)' }}>No deployment-scoped load jobs yet.</span>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {loadHistory.map(job => (
                      <div
                        key={job.id}
                        data-testid={`data-model-release-load-history-row-${job.id}`}
                        style={{
                          display: 'grid',
                          gap: 6,
                          padding: 12,
                          borderRadius: 12,
                          border: '1px solid var(--nx-shell-surface-border)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <strong>{job.id}</strong>
                          <SummaryChips
                            items={[
                              { label: 'Status', value: job.status ?? '-', tone: statusTone(job.status) },
                              { label: 'Mode', value: job.mode ?? '-', tone: 'brand' },
                              {
                                label: 'Reconciliation',
                                value: String(toRecord(job.reconciliation).status ?? '-'),
                                tone: statusTone(toRecord(job.reconciliation).status)
                              }
                            ]}
                          />
                        </div>
                        <span style={{ color: 'var(--muted)' }}>retry {job.retryCount ?? 0}</span>
                      </div>
                    ))}
                  </div>
                )}
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                  {resolvedDeploymentId ? prettyJson(loadHistoryQuery.data) : 'Deployment load history will appear once a deployment exists.'}
                </pre>
              </NexusCard>

              <NexusCard data-testid="data-model-release-refresh-panel" style={{ padding: 20, display: 'grid', gap: 10 }}>
                <strong>Refresh policy and runs</strong>
                <span style={{ color: 'var(--muted)' }}>Cadence, incremental watermark, and deployment-scoped refresh history.</span>
                {!resolvedDeploymentId ? (
                  <span style={{ color: 'var(--muted)' }}>Create a deployment to inspect refresh policy and runs.</span>
                ) : (
                  <>
                    {refreshPolicyQuery.data ? (
                      <SummaryChips
                        items={[
                          { label: 'Mode', value: refreshPolicyQuery.data.mode ?? '-', tone: statusTone(refreshPolicyQuery.data.mode) },
                          { label: 'Cadence', value: refreshPolicyQuery.data.cadence ?? '-', tone: 'neutral' },
                          { label: 'Incremental key', value: refreshPolicyQuery.data.incrementalKey ?? '-', tone: 'brand' },
                          {
                            label: 'Watermark',
                            value: formatTimestamp(toRecord(refreshPolicyQuery.data.watermark).maxValue),
                            tone: 'neutral'
                          }
                        ]}
                      />
                    ) : refreshPolicyQuery.isLoading ? (
                      <span style={{ color: 'var(--muted)' }}>Loading refresh policy...</span>
                    ) : refreshPolicyQuery.error ? (
                      <span style={{ color: 'var(--danger)' }}>{normalizeError(refreshPolicyQuery.error)}</span>
                    ) : null}

                    {refreshRunsQuery.isLoading ? (
                      <span style={{ color: 'var(--muted)' }}>Loading refresh run history...</span>
                    ) : refreshRunsQuery.error ? (
                      <span style={{ color: 'var(--danger)' }}>{normalizeError(refreshRunsQuery.error)}</span>
                    ) : refreshRuns.length === 0 ? (
                      <span style={{ color: 'var(--muted)' }}>No refresh runs yet.</span>
                    ) : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {refreshRuns.map(run => (
                          <div
                            key={run.id}
                            data-testid={`data-model-release-refresh-run-row-${run.id}`}
                            style={{
                              display: 'grid',
                              gap: 6,
                              padding: 12,
                              borderRadius: 12,
                              border: '1px solid var(--nx-shell-surface-border)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                              <strong>{run.id}</strong>
                              <SummaryChips
                                items={[
                                  { label: 'Status', value: run.status ?? '-', tone: statusTone(run.status) },
                                  { label: 'Mode', value: run.mode ?? '-', tone: 'brand' },
                                  {
                                    label: 'Reconciliation',
                                    value: String(toRecord(run.reconciliation).status ?? '-'),
                                    tone: statusTone(toRecord(run.reconciliation).status)
                                  }
                                ]}
                              />
                            </div>
                            <span style={{ color: 'var(--muted)' }}>
                              watermark after {formatTimestamp(toRecord(run.watermarkAfter).maxValue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                  {resolvedDeploymentId
                    ? prettyJson({
                        policy: refreshPolicyQuery.data,
                        runs: refreshRunsQuery.data
                      })
                    : 'Refresh policy and run history will appear once a deployment exists.'}
                </pre>
              </NexusCard>

              <NexusCard data-testid="data-model-release-release-gate-panel" style={{ padding: 20, display: 'grid', gap: 10 }}>
                <strong>Latest release gate</strong>
                <span style={{ color: 'var(--muted)' }}>Current decision, freshness budget, and source reconciliation source-of-truth.</span>
                {!resolvedDeploymentId ? (
                  <span style={{ color: 'var(--muted)' }}>Create a deployment to inspect the latest release gate.</span>
                ) : releaseDecisionQuery.isLoading ? (
                  <span style={{ color: 'var(--muted)' }}>Loading latest release decision...</span>
                ) : releaseDecisionQuery.error ? (
                  <span style={{ color: 'var(--danger)' }}>{normalizeError(releaseDecisionQuery.error)}</span>
                ) : releaseDecision ? (
                  <>
                    <SummaryChips
                      items={[
                        { label: 'Status', value: releaseDecision.status ?? '-', tone: statusTone(releaseDecision.status) },
                        { label: 'Freshness', value: releaseFreshnessLabel, tone: 'neutral' },
                        {
                          label: 'Source',
                          value: String(toRecord(releaseDecision.sourceReconciliation).scope ?? '-'),
                          tone: 'brand'
                        }
                      ]}
                    />
                    {releaseBlockers.length > 0 ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {releaseBlockers.map(blocker => (
                          <NexusBadge key={blocker} tone="danger">
                            {blocker}
                          </NexusBadge>
                        ))}
                      </div>
                    ) : (
                      <NexusBadge tone="ok">No release blockers</NexusBadge>
                    )}
                  </>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>No release decision available yet.</span>
                )}
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                  {resolvedDeploymentId ? prettyJson(releaseDecisionQuery.data) : 'Latest release decision will appear once a deployment exists.'}
                </pre>
              </NexusCard>

              <NexusCard data-testid="data-model-release-load-panel" style={{ padding: 20, display: 'grid', gap: 10 }}>
                <strong>PA load progress</strong>
                <span style={{ color: 'var(--muted)' }}>Load job status, item progress and write summary.</span>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                  {loadJob ? prettyJson(loadJob) : 'Create a deployment and run a load job to inspect progress.'}
                </pre>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                  {loadItems ? prettyJson(loadItems) : 'Load job items will appear after runtime execution.'}
                </pre>
              </NexusCard>

              <NexusCard data-testid="data-model-release-reconciliation-panel" style={{ padding: 20, display: 'grid', gap: 10 }}>
                <strong>Reconciliation</strong>
                <span style={{ color: 'var(--muted)' }}>Release gate truth from load reconciliation and freshness checks.</span>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                  {loadReconciliation ? prettyJson(loadReconciliation) : 'Load reconciliation will appear after a load job runs.'}
                </pre>
              </NexusCard>

              <NexusCard data-testid="data-model-release-readiness-panel" style={{ padding: 20, display: 'grid', gap: 10 }}>
                <strong>Ask readiness</strong>
                <span style={{ color: 'var(--muted)' }}>Readiness and certification blockers before canonical /api/chat exposure.</span>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                  {readinessResult ? prettyJson(readinessResult) : 'Run ask readiness after semantic draft creation.'}
                </pre>
              </NexusCard>
            </section>
          </>
        )}
      </section>
    </BiCanonicalShell>
  )
}
