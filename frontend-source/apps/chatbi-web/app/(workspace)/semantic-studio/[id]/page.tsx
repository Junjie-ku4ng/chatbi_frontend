'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'next/navigation'
import {
  applySemanticRelationTemplate,
  createSemanticSyncDeleteConfirmation,
  createSemanticSyncRun,
  applySemanticEditorOperations,
  createSemanticRelationTemplate,
  getDataSourcePACubeMetadata,
  getSemanticSyncProfile,
  listDataSourcePACubes,
  getSemanticEditorGraphNeighbors,
  getSemanticEditorGraphPage,
  getSemanticEditorImpact,
  listSemanticSyncRuns,
  listSemanticRelationTemplates,
  listSemanticRelationTimeline,
  previewSemanticSync,
  publishSemanticEditorModel,
  resolveGateBlockers,
  resolveGateBlockerDetails,
  SemanticEditorImpactSummary,
  PaCubeMetadataProfile,
  SemanticPublishGateBlockerDetail,
  SemanticSyncPreview,
  SemanticSyncProfile,
  retrySemanticSyncRun,
  type SemanticEditorOperationRecord,
  type SemanticRelationEdge,
  getSemanticEditorState,
  onboardSemanticModelFromPA,
  type SemanticEditorGraphMeta,
  type SemanticEditorGraphState,
  listSemanticEditorOperations,
  previewSemanticEditorDraft,
  SemanticEditorOperationInput,
  SemanticEditorPreviewResult,
  SemanticEditorValidationResult,
  updateSemanticRelationTemplate,
  updateSemanticSyncProfile,
  validateSemanticEditorDraft
} from '@/modules/semantic-studio/api'
import { buildDataModelReleaseHref } from '@/modules/data-model-release/route-href'
import { GraphCanvas } from '@/modules/semantic-studio/graph-canvas'
import { GraphV2Canvas } from '@/modules/semantic-studio/graph-v2-canvas'
import {
  applySemanticGraphRelations,
  createSemanticGraphWindowState,
  hasSemanticGraphMore,
  mergeSemanticGraphWindowState,
  upsertSemanticGraphRelation,
  type SemanticGraphWindowState
} from '@/modules/semantic-studio/graph-v2-store'
import { ImpactGatePanel } from '@/modules/semantic-studio/impact-gate-panel'
import { RelationPanel, type RelationDraftInput } from '@/modules/semantic-studio/relation-panel'
import { RelationTemplateDrawer } from '@/modules/semantic-studio/relation-template-drawer'
import { RelationTimeline } from '@/modules/semantic-studio/relation-timeline'
import { formatPublishErrorStatus } from '@/modules/semantic-studio/status-message'
import { SyncPreviewPanel } from '@/modules/semantic-studio/sync-preview-panel'
import { SyncRunTimeline } from '@/modules/semantic-studio/sync-run-timeline'
import { SyncDeleteConfirmDialog } from '@/modules/semantic-studio/sync-delete-confirm-dialog'
import { OnboardFromPADrawer } from '@/modules/semantic-studio/onboard-from-pa-drawer'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

const TARGET_TYPES = ['measure', 'dimension', 'hierarchy', 'relation', 'member'] as const
const OPERATION_TYPES = ['add', 'update', 'remove'] as const

export default function SemanticStudioDetailPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const modelId = params.id
  const graphV2FlagEnabled = process.env.NEXT_PUBLIC_SEMANTIC_STUDIO_GRAPH_V2 === 'true'
  const graphV2Allowlist = parseModelAllowlist(process.env.NEXT_PUBLIC_SEMANTIC_STUDIO_GRAPH_V2_ALLOWLIST)
  const graphV2AllowedForModel = graphV2Allowlist.length === 0 || graphV2Allowlist.includes(modelId)
  const graphV2ForcedInDev = searchParams.get('graphV2') === '1' && process.env.NODE_ENV !== 'production'
  const graphV2Enabled = (graphV2FlagEnabled && graphV2AllowedForModel) || graphV2ForcedInDev
  const syncV1FlagEnabled = process.env.NEXT_PUBLIC_SEMANTIC_SYNC_V1 === 'true'
  const syncV1Allowlist = parseModelAllowlist(process.env.NEXT_PUBLIC_SEMANTIC_SYNC_ALLOWLIST)
  const syncV1Enabled = syncV1FlagEnabled && (syncV1Allowlist.length === 0 || syncV1Allowlist.includes(modelId))

  const [draftKeyInput, setDraftKeyInput] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<SemanticEditorValidationResult | null>(null)
  const [previewResult, setPreviewResult] = useState<SemanticEditorPreviewResult | null>(null)
  const [impactResult, setImpactResult] = useState<SemanticEditorImpactSummary | null>(null)
  const [gateBlockers, setGateBlockers] = useState<string[]>([])
  const [gateBlockerDetails, setGateBlockerDetails] = useState<SemanticPublishGateBlockerDetail[]>([])
  const [selectedRelationId, setSelectedRelationId] = useState<string>('')
  const [timelineFilters, setTimelineFilters] = useState<{ relationId?: string; actor?: string }>({})
  const [relationDraft, setRelationDraft] = useState<RelationDraftInput>({
    id: '',
    sourceDimension: '',
    sourceKey: '',
    targetDimension: '',
    targetKey: '',
    joinType: 'inner',
    cardinality: '1:n',
    active: true,
    label: '',
    optionsText: '{}'
  })
  const [entitySearch, setEntitySearch] = useState('')
  const [selectedEntityType, setSelectedEntityType] = useState<'measure' | 'dimension' | 'hierarchy'>('measure')
  const [selectedEntityKey, setSelectedEntityKey] = useState('')

  const [measureOperationType, setMeasureOperationType] = useState<(typeof OPERATION_TYPES)[number]>('add')
  const [measureCode, setMeasureCode] = useState('')
  const [measureName, setMeasureName] = useState('')
  const [measureType, setMeasureType] = useState('')
  const [measureUnit, setMeasureUnit] = useState('')
  const [measureFormula, setMeasureFormula] = useState('')
  const [measureDescription, setMeasureDescription] = useState('')
  const [measureAliases, setMeasureAliases] = useState('')

  const [dimensionOperationType, setDimensionOperationType] = useState<(typeof OPERATION_TYPES)[number]>('add')
  const [dimensionName, setDimensionName] = useState('')
  const [dimensionCaption, setDimensionCaption] = useState('')
  const [dimensionDescription, setDimensionDescription] = useState('')
  const [dimensionLevels, setDimensionLevels] = useState('')

  const [hierarchyOperationType, setHierarchyOperationType] = useState<(typeof OPERATION_TYPES)[number]>('add')
  const [hierarchyDimension, setHierarchyDimension] = useState('')
  const [hierarchyName, setHierarchyName] = useState('')
  const [hierarchyCaption, setHierarchyCaption] = useState('')
  const [hierarchyLevels, setHierarchyLevels] = useState('')

  const [targetType, setTargetType] = useState<(typeof TARGET_TYPES)[number]>('measure')
  const [operationType, setOperationType] = useState<(typeof OPERATION_TYPES)[number]>('add')
  const [targetKey, setTargetKey] = useState('')
  const [payloadText, setPayloadText] = useState('{}')
  const [graphWindowState, setGraphWindowState] = useState<SemanticGraphWindowState | null>(null)
  const [syncProfileDraft, setSyncProfileDraft] = useState<Partial<SemanticSyncProfile>>({})
  const [syncPreviewResult, setSyncPreviewResult] = useState<SemanticSyncPreview | null>(null)
  const [syncDeleteDialogOpen, setSyncDeleteDialogOpen] = useState(false)
  const [syncDeleteConfirmationToken, setSyncDeleteConfirmationToken] = useState<string | null>(null)
  const [syncDeleteConfirmationExpiresAt, setSyncDeleteConfirmationExpiresAt] = useState<string | null>(null)
  const [onboardDrawerOpen, setOnboardDrawerOpen] = useState(false)
  const [onboardDataSourceId, setOnboardDataSourceId] = useState('')
  const [onboardQuery, setOnboardQuery] = useState('')
  const [onboardCubes, setOnboardCubes] = useState<Array<{ name: string; dimensions: string[] }>>([])
  const [onboardSelectedCube, setOnboardSelectedCube] = useState<string>('')
  const [onboardMetadata, setOnboardMetadata] = useState<PaCubeMetadataProfile | null>(null)

  const stateQuery = useQuery({
    queryKey: ['semantic-studio-state', modelId, graphV2Enabled ? 'auto-graph' : 'full-graph'],
    enabled: Boolean(modelId),
    queryFn: () =>
      getSemanticEditorState(
        modelId,
        graphV2Enabled
          ? {
              graphMode: 'auto'
            }
          : {}
      )
  })

  const operationsQuery = useQuery({
    queryKey: ['semantic-studio-operations', modelId],
    enabled: Boolean(modelId),
    queryFn: () => listSemanticEditorOperations(modelId, { limit: 50, offset: 0 })
  })

  const relationTemplatesQuery = useQuery({
    queryKey: ['semantic-studio-relation-templates', modelId],
    enabled: Boolean(modelId),
    queryFn: () => listSemanticRelationTemplates(modelId, { status: 'active', limit: 50, offset: 0 })
  })

  const relationTimelineQuery = useQuery({
    queryKey: ['semantic-studio-relation-timeline', modelId, timelineFilters.relationId ?? '', timelineFilters.actor ?? ''],
    enabled: Boolean(modelId),
    queryFn: () =>
      listSemanticRelationTimeline(modelId, {
        relationId: timelineFilters.relationId,
        actor: timelineFilters.actor,
        limit: 30,
        offset: 0
      })
  })

  const syncProfileQueryKey = ['semantic-sync-profile', modelId] as const
  const syncProfileQuery = useQuery({
    queryKey: syncProfileQueryKey,
    enabled: Boolean(modelId) && syncV1Enabled,
    queryFn: () => getSemanticSyncProfile(modelId)
  })
  const canonicalReleaseHref = buildDataModelReleaseHref({
    dataSourceId: searchParams.get('dataSourceId') ?? syncProfileQuery.data?.paDataSourceId ?? null,
    draftId: searchParams.get('draftId'),
    modelId,
    deploymentId: searchParams.get('deploymentId')
  })

  const syncRunsQuery = useQuery({
    queryKey: ['semantic-sync-runs', modelId],
    enabled: Boolean(modelId) && syncV1Enabled,
    queryFn: () => listSemanticSyncRuns(modelId, { limit: 20, offset: 0 })
  })

  const catalog = stateQuery.data?.catalog
  const operations = operationsQuery.data?.items ?? []
  const relationTemplates = relationTemplatesQuery.data?.items ?? []
  const relationTimeline = relationTimelineQuery.data?.items ?? []
  const entityItems = useMemo(
    () => [
      ...(catalog?.measures.map(item => ({ type: 'measure' as const, key: item.code, label: item.name })) ?? []),
      ...(catalog?.dimensions.map(item => ({ type: 'dimension' as const, key: item.name, label: item.caption ?? item.name })) ?? []),
      ...(catalog?.hierarchies.map(item => ({
        type: 'hierarchy' as const,
        key: `${item.dimension}:${item.name}`,
        label: `${item.dimension} / ${item.name}`
      })) ?? [])
    ],
    [catalog]
  )
  const filteredEntityItems = useMemo(() => {
    const keyword = entitySearch.trim().toLowerCase()
    if (!keyword) return entityItems
    return entityItems.filter(item => `${item.type} ${item.key} ${item.label}`.toLowerCase().includes(keyword))
  }, [entityItems, entitySearch])
  const lastFailedOperation = useMemo(
    () => operations.find(operation => operation.status === 'failed') ?? null,
    [operations]
  )

  const measureOperationOptions = catalog?.operationHints?.measure ?? OPERATION_TYPES
  const dimensionOperationOptions = catalog?.operationHints?.dimension ?? OPERATION_TYPES
  const hierarchyOperationOptions = catalog?.operationHints?.hierarchy ?? OPERATION_TYPES
  const resolvedDraftKey = useMemo(() => {
    if (draftKeyInput.trim() !== '') return draftKeyInput.trim()
    return stateQuery.data?.draftKey ?? undefined
  }, [draftKeyInput, stateQuery.data?.draftKey])
  const graphForView = useMemo<SemanticEditorGraphState | undefined>(() => {
    if (graphV2Enabled) {
      return graphWindowState?.graph ?? stateQuery.data?.graph
    }
    return stateQuery.data?.graph
  }, [graphV2Enabled, graphWindowState?.graph, stateQuery.data?.graph])
  const graphMetaForView = useMemo<SemanticEditorGraphMeta | undefined>(() => {
    if (graphV2Enabled) {
      return graphWindowState?.meta ?? stateQuery.data?.graphMeta
    }
    return stateQuery.data?.graphMeta
  }, [graphV2Enabled, graphWindowState?.meta, stateQuery.data?.graphMeta])
  const relationEdges = useMemo<SemanticRelationEdge[]>(
    () => (graphForView?.edges ?? stateQuery.data?.catalog?.relations ?? []) as SemanticRelationEdge[],
    [graphForView?.edges, stateQuery.data?.catalog?.relations]
  )
  const relationFieldSpecs = useMemo(
    () => stateQuery.data?.catalog?.relationFieldSpecs ?? stateQuery.data?.catalog?.fieldSpecs?.relation ?? [],
    [stateQuery.data?.catalog?.fieldSpecs?.relation, stateQuery.data?.catalog?.relationFieldSpecs]
  )
  const relationIssues = useMemo(
    () => (validationResult?.issues ?? []).filter(issue => issue.scope === 'relation' || issue.fieldPath.includes('relations')),
    [validationResult?.issues]
  )
  const dimensionNames = useMemo(
    () => stateQuery.data?.catalog?.dimensions.map(item => item.name) ?? [],
    [stateQuery.data?.catalog?.dimensions]
  )

  useEffect(() => {
    if (!catalog) return
    if (!measureCode) {
      const firstMeasure = catalog.measures[0]
      setMeasureCode(firstMeasure?.code ?? 'NEW_MEASURE')
      setMeasureName(firstMeasure?.name ?? 'New Measure')
      setMeasureType(firstMeasure?.type ?? '')
      setMeasureUnit(firstMeasure?.unit ?? '')
      setMeasureFormula(firstMeasure?.formula ?? '')
      setMeasureDescription(firstMeasure?.description ?? '')
      setMeasureAliases((firstMeasure?.aliases ?? []).join(', '))
    }
    if (!dimensionName) {
      const firstDimension = catalog.dimensions[0]
      setDimensionName(firstDimension?.name ?? 'NewDimension')
      setDimensionCaption(firstDimension?.caption ?? firstDimension?.name ?? 'New Dimension')
      setDimensionDescription(firstDimension?.description ?? '')
      setDimensionLevels((firstDimension?.levels ?? []).join(', '))
    }
    if (!hierarchyName) {
      const firstHierarchy = catalog.hierarchies[0]
      const firstDimensionName = firstHierarchy?.dimension ?? catalog.dimensions[0]?.name ?? ''
      setHierarchyDimension(firstDimensionName)
      setHierarchyName(firstHierarchy?.name ?? 'DefaultHierarchy')
      setHierarchyCaption(firstHierarchy?.caption ?? firstHierarchy?.name ?? 'Default Hierarchy')
      setHierarchyLevels((firstHierarchy?.levels ?? []).join(', '))
    } else if (!hierarchyDimension) {
      setHierarchyDimension(catalog.dimensions[0]?.name ?? '')
    }
  }, [catalog, dimensionName, hierarchyDimension, hierarchyName, measureCode])

  useEffect(() => {
    if (!catalog || selectedEntityKey) return
    if (catalog.measures[0]) {
      setSelectedEntityType('measure')
      setSelectedEntityKey(catalog.measures[0].code)
      return
    }
    if (catalog.dimensions[0]) {
      setSelectedEntityType('dimension')
      setSelectedEntityKey(catalog.dimensions[0].name)
      return
    }
    if (catalog.hierarchies[0]) {
      setSelectedEntityType('hierarchy')
      setSelectedEntityKey(`${catalog.hierarchies[0].dimension}:${catalog.hierarchies[0].name}`)
    }
  }, [catalog, selectedEntityKey])

  useEffect(() => {
    if (!catalog || !selectedEntityKey) return
    if (selectedEntityType === 'measure') {
      const selected = catalog.measures.find(item => item.code === selectedEntityKey)
      if (!selected) return
      setMeasureCode(selected.code)
      setMeasureName(selected.name)
      setMeasureDescription(selected.description ?? '')
      setMeasureFormula(selected.formula ?? '')
      setMeasureUnit(selected.unit ?? '')
      setMeasureType(selected.type ?? '')
      setMeasureAliases((selected.aliases ?? []).join(', '))
      return
    }
    if (selectedEntityType === 'dimension') {
      const selected = catalog.dimensions.find(item => item.name === selectedEntityKey)
      if (!selected) return
      setDimensionName(selected.name)
      setDimensionCaption(selected.caption ?? selected.name)
      setDimensionDescription(selected.description ?? '')
      setDimensionLevels((selected.levels ?? []).join(', '))
      return
    }
    const [dimension, hierarchy] = selectedEntityKey.split(':')
    if (!dimension || !hierarchy) return
    const selected = catalog.hierarchies.find(item => item.dimension === dimension && item.name === hierarchy)
    if (!selected) return
    setHierarchyDimension(selected.dimension)
    setHierarchyName(selected.name)
    setHierarchyCaption(selected.caption ?? selected.name)
    setHierarchyLevels((selected.levels ?? []).join(', '))
  }, [catalog, selectedEntityKey, selectedEntityType])

  useEffect(() => {
    if (relationEdges.length === 0) {
      setSelectedRelationId('')
      if (dimensionNames.length >= 2) {
        setRelationDraft(prev => ({
          ...prev,
          sourceDimension: prev.sourceDimension || dimensionNames[0],
          targetDimension: prev.targetDimension || dimensionNames[1],
          sourceKey: prev.sourceKey || 'id',
          targetKey: prev.targetKey || 'id'
        }))
      }
      return
    }
    if (!selectedRelationId || !relationEdges.some(edge => edge.id === selectedRelationId)) {
      setSelectedRelationId(relationEdges[0]?.id ?? '')
    }
  }, [dimensionNames, relationEdges, selectedRelationId])

  useEffect(() => {
    if (!selectedRelationId) return
    const selectedRelation = relationEdges.find(edge => edge.id === selectedRelationId)
    if (!selectedRelation) return
    setRelationDraft({
      id: selectedRelation.id,
      sourceDimension: selectedRelation.sourceDimension,
      sourceKey: selectedRelation.sourceKey,
      targetDimension: selectedRelation.targetDimension,
      targetKey: selectedRelation.targetKey,
      joinType: selectedRelation.joinType,
      cardinality: selectedRelation.cardinality,
      active: selectedRelation.active,
      label: selectedRelation.label ?? '',
      optionsText: JSON.stringify(selectedRelation.options ?? {}, null, 2)
    })
  }, [relationEdges, selectedRelationId])

  useEffect(() => {
    if (!syncProfileQuery.data) return
    setSyncProfileDraft({
      mode: syncProfileQuery.data.mode,
      enabled: syncProfileQuery.data.enabled,
      paDataSourceId: syncProfileQuery.data.paDataSourceId,
      targetCube: syncProfileQuery.data.targetCube,
      deletePolicy: syncProfileQuery.data.deletePolicy
    })
    if (!onboardDataSourceId && syncProfileQuery.data.paDataSourceId) {
      setOnboardDataSourceId(syncProfileQuery.data.paDataSourceId)
    }
  }, [onboardDataSourceId, syncProfileQuery.data])

  const onboardDataSourceLocked = Boolean(syncProfileQuery.data?.paDataSourceId?.trim())

  const applyMutation = useMutation({
    mutationFn: async (operation: SemanticEditorOperationInput) =>
      applySemanticEditorOperations(modelId, {
        draftKey: resolvedDraftKey,
        operations: [operation]
      }),
    onSuccess: async (payload, operation) => {
      if (Array.isArray(payload.issues) && payload.issues.length > 0) {
        setStatus(`Applied with ${payload.issues.length} issue(s)`)
      } else {
        setStatus('Operation applied')
      }
      await stateQuery.refetch()
      await operationsQuery.refetch()
      await relationTimelineQuery.refetch()
      if (graphV2Enabled && operation.targetType === 'relation' && operation.operationType !== 'remove') {
        const relation = operation.payload as SemanticRelationEdge
        if (relation?.id) {
          setGraphWindowState(prev => upsertSemanticGraphRelation(prev, relation))
        }
      }
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Apply operation failed')
    }
  })

  const validateMutation = useMutation({
    mutationFn: async () =>
      validateSemanticEditorDraft(modelId, {
        draftKey: resolvedDraftKey
      }),
    onSuccess: payload => {
      setValidationResult(payload)
      setStatus('Validation completed')
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Validation failed')
    }
  })

  const previewMutation = useMutation({
    mutationFn: async () =>
      previewSemanticEditorDraft(modelId, {
        draftKey: resolvedDraftKey
      }),
    onSuccess: payload => {
      setPreviewResult(payload)
      if (payload.preview.impact) {
        setImpactResult(payload.preview.impact)
      }
      setStatus('Preview generated')
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Preview failed')
    }
  })

  const impactMutation = useMutation({
    mutationFn: async (options?: { silent?: boolean }) =>
      getSemanticEditorImpact(modelId, {
        draftKey: resolvedDraftKey,
        windowHours: 168
      }),
    onSuccess: (payload, options) => {
      setImpactResult(payload)
      if (!options?.silent) {
        setStatus('Impact refreshed')
      }
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Impact query failed')
    }
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      const schemaVersion = Number(stateQuery.data?.model?.schemaVersion ?? 1)
      return publishSemanticEditorModel(modelId, schemaVersion, {
        syncDeleteConfirmationToken: syncDeleteConfirmationToken ?? undefined
      })
    },
    onSuccess: async () => {
      setGateBlockers([])
      setGateBlockerDetails([])
      setStatus('Publish succeeded')
      await stateQuery.refetch()
      await operationsQuery.refetch()
      await impactMutation.mutateAsync({ silent: true })
      await relationTimelineQuery.refetch()
      if (syncV1Enabled) {
        await syncRunsQuery.refetch()
        await syncProfileQuery.refetch()
      }
    },
    onError: error => {
      const payload = (error as any)?.details?.payload ?? (error as any)?.details ?? {}
      const blockers = resolveGateBlockers(payload)
      const details = resolveGateBlockerDetails(payload)
      setGateBlockers(blockers)
      setGateBlockerDetails(details)
      if (blockers.length > 0) {
        setStatus(`Publish blocked: ${blockers.join(', ')}`)
      } else {
        setStatus(formatPublishErrorStatus(error))
      }
    }
  })

  const createRelationTemplateMutation = useMutation({
    mutationFn: async (input: { name: string; description?: string; relations: SemanticRelationEdge[] }) =>
      createSemanticRelationTemplate(modelId, input),
    onSuccess: async () => {
      setStatus('Relation template created')
      await relationTemplatesQuery.refetch()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Create relation template failed')
    }
  })

  const updateRelationTemplateMutation = useMutation({
    mutationFn: async (input: {
      templateId: string
      name?: string
      description?: string
      status?: 'active' | 'disabled'
    }) =>
      updateSemanticRelationTemplate(modelId, input.templateId, {
        name: input.name,
        description: input.description,
        status: input.status
      }),
    onSuccess: async () => {
      setStatus('Relation template updated')
      await relationTemplatesQuery.refetch()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Update relation template failed')
    }
  })

  const applyRelationTemplateMutation = useMutation({
    mutationFn: async (input: { templateId: string; mode: 'append' | 'replace' }) =>
      applySemanticRelationTemplate(modelId, input.templateId, {
        mode: input.mode,
        draftKey: resolvedDraftKey
      }),
    onSuccess: async payload => {
      const nextDraftKey = payload.draft?.draftKey ?? payload.draftKey
      if (nextDraftKey) {
        setDraftKeyInput(nextDraftKey)
      }
      setStatus(`Template applied (${payload.mode})`)
      await stateQuery.refetch()
      await operationsQuery.refetch()
      await relationTimelineQuery.refetch()
      await impactMutation.mutateAsync({ silent: true })
      if (graphV2Enabled && payload.template?.relations?.length) {
        setGraphWindowState(prev => applySemanticGraphRelations(prev, payload.template.relations))
      }
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Apply relation template failed')
    }
  })

  const loadGraphWindowMutation = useMutation({
    mutationFn: async () => {
      const meta = graphMetaForView
      const nextNodeOffset = meta?.nextNodeOffset ?? 0
      const nextEdgeOffset = meta?.nextEdgeOffset ?? 0
      return getSemanticEditorGraphPage(modelId, {
        draftKey: resolvedDraftKey,
        mode: 'window',
        nodeLimit: meta?.nodeLimit ?? 80,
        edgeLimit: meta?.edgeLimit ?? 160,
        nodeOffset: nextNodeOffset,
        edgeOffset: nextEdgeOffset
      })
    },
    onSuccess: payload => {
      setGraphWindowState(prev => mergeSemanticGraphWindowState(prev, payload))
      setStatus('Graph window loaded')
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Load graph window failed')
    }
  })

  const loadGraphNeighborsMutation = useMutation({
    mutationFn: async (centerNodeKey: string) =>
      getSemanticEditorGraphNeighbors(modelId, {
        draftKey: resolvedDraftKey,
        centerNodeKey,
        hops: 1,
        edgeLimit: 1000
      }),
    onSuccess: payload => {
      setGraphWindowState(prev => mergeSemanticGraphWindowState(prev, payload))
      setStatus('Graph neighbors expanded')
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Expand graph neighbors failed')
    }
  })

  const syncProfileMutation = useMutation({
    mutationFn: async () =>
      updateSemanticSyncProfile(modelId, {
        mode: (syncProfileDraft.mode as SemanticSyncProfile['mode']) ?? undefined,
        enabled: typeof syncProfileDraft.enabled === 'boolean' ? syncProfileDraft.enabled : undefined,
        paDataSourceId: syncProfileDraft.paDataSourceId,
        targetCube: syncProfileDraft.targetCube,
        deletePolicy: syncProfileDraft.deletePolicy as SemanticSyncProfile['deletePolicy'] | undefined
      }),
    onSuccess: async payload => {
      queryClient.setQueryData(syncProfileQueryKey, payload)
      setSyncProfileDraft({
        mode: payload.mode,
        enabled: payload.enabled,
        paDataSourceId: payload.paDataSourceId,
        targetCube: payload.targetCube,
        deletePolicy: payload.deletePolicy
      })
      if (payload.paDataSourceId) {
        setOnboardDataSourceId(payload.paDataSourceId)
      }
      await syncProfileQuery.refetch()
      setStatus(`Sync profile updated: ${payload.mode}`)
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Update sync profile failed')
    }
  })

  const syncPreviewMutation = useMutation({
    mutationFn: async () =>
      previewSemanticSync(modelId, {
        schemaVersion: Number(stateQuery.data?.model?.schemaVersion ?? 1)
      }),
    onSuccess: payload => {
      setSyncPreviewResult(payload)
      setStatus('Sync preview refreshed')
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Sync preview failed')
    }
  })

  const syncRunMutation = useMutation({
    mutationFn: async () =>
      createSemanticSyncRun(modelId, {
        wait: true,
        schemaVersion: Number(stateQuery.data?.model?.schemaVersion ?? 1),
        deleteConfirmationToken: syncDeleteConfirmationToken ?? undefined,
        metadata: {
          previewDigest: syncPreviewResult?.previewDigest,
          previewSummary: syncPreviewResult?.summary,
          mode: syncProfileQuery.data?.mode
        }
      }),
    onSuccess: async payload => {
      setStatus(`Sync run ${payload.status ?? 'completed'} (${payload.id ?? '-'})`)
      await syncRunsQuery.refetch()
      await syncProfileQuery.refetch()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Run sync failed')
    }
  })

  const retrySyncMutation = useMutation({
    mutationFn: async (runId: string) =>
      retrySemanticSyncRun(modelId, runId, {
        deleteConfirmationToken: syncDeleteConfirmationToken ?? undefined
      }),
    onSuccess: async payload => {
      setStatus(`Retry run ${payload.id ?? '-'} => ${payload.status ?? 'unknown'}`)
      await syncRunsQuery.refetch()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Retry sync run failed')
    }
  })

  const syncDeleteConfirmationMutation = useMutation({
    mutationFn: async () =>
      createSemanticSyncDeleteConfirmation(modelId, {
        schemaVersion: Number(stateQuery.data?.model?.schemaVersion ?? 1),
        previewDigest: syncPreviewResult?.previewDigest ?? ''
      }),
    onSuccess: payload => {
      setSyncDeleteConfirmationToken(payload.token)
      setSyncDeleteConfirmationExpiresAt(payload.expiresAt)
      setStatus('Delete confirmation token generated')
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Generate delete confirmation failed')
    }
  })

  const listPACubesMutation = useMutation({
    mutationFn: async () =>
      listDataSourcePACubes(onboardDataSourceId.trim(), {
        query: onboardQuery.trim() || undefined,
        limit: 50
      }),
    onSuccess: payload => {
      setOnboardCubes(payload.items ?? [])
      setStatus(`Loaded ${payload.items?.length ?? 0} cube(s)`)
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Load PA cubes failed')
    }
  })

  const cubeMetadataMutation = useMutation({
    mutationFn: async () => getDataSourcePACubeMetadata(onboardDataSourceId.trim(), onboardSelectedCube),
    onSuccess: payload => {
      setOnboardMetadata(payload)
      setStatus(`Loaded metadata for ${payload.cube}`)
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Load PA cube metadata failed')
    }
  })

  const onboardModelMutation = useMutation({
    mutationFn: async () =>
      onboardSemanticModelFromPA({
        dataSourceId: onboardDataSourceId.trim(),
        cube: onboardSelectedCube,
        name: `Onboarded ${onboardSelectedCube}`
      }),
    onSuccess: payload => {
      const needsReview = (payload.metadata.synthesizedLevels?.length ?? 0) > 0
      setStatus(
        needsReview
          ? `Onboarded model ${payload.model.id}. Review synthesized level semantics in Data Model Release before publish.`
          : `Onboarded model ${payload.model.id}`
      )
      setOnboardDrawerOpen(false)
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Onboard from PA failed')
    }
  })

  useEffect(() => {
    if (!graphV2Enabled || !modelId) return
    if (!stateQuery.data) return
    setGraphWindowState(
      createSemanticGraphWindowState(
        stateQuery.data.graph,
        stateQuery.data.graphMeta
      )
    )
    impactMutation.mutate({ silent: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphV2Enabled, modelId, resolvedDraftKey, stateQuery.data])

  async function submitOperation(operation: SemanticEditorOperationInput) {
    if (!operation.targetKey.trim()) {
      setStatus('Target key is required')
      return
    }
    await applyMutation.mutateAsync(operation)
  }

  async function retryFailedOperation(operation: SemanticEditorOperationRecord | null) {
    if (!operation) {
      setStatus('No failed operation to retry')
      return
    }
    const normalizedType =
      OPERATION_TYPES.includes(operation.operationType as (typeof OPERATION_TYPES)[number])
        ? (operation.operationType as (typeof OPERATION_TYPES)[number])
        : 'update'
    await submitOperation({
      operationType: normalizedType,
      targetType: operation.targetType,
      targetKey: operation.targetKey,
      payload: operation.payload ?? {}
    })
  }

  async function applyRelationDraft(operationType?: 'add' | 'update') {
    const relationId = relationDraft.id.trim()
    if (!relationId) {
      setStatus('Relation id is required')
      return
    }
    let options: Record<string, unknown> = {}
    try {
      options = parseJson(relationDraft.optionsText)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Invalid relation options JSON')
      return
    }
    const exists = relationEdges.some(edge => edge.id === relationId)
    const nextOperation = operationType ?? (exists ? 'update' : 'add')
    await submitOperation({
      operationType: nextOperation,
      targetType: 'relation',
      targetKey: relationId,
      payload: {
        id: relationId,
        sourceDimension: relationDraft.sourceDimension.trim(),
        sourceKey: relationDraft.sourceKey.trim(),
        targetDimension: relationDraft.targetDimension.trim(),
        targetKey: relationDraft.targetKey.trim(),
        joinType: relationDraft.joinType,
        cardinality: relationDraft.cardinality,
        active: relationDraft.active,
        label: relationDraft.label.trim() || undefined,
        options
      }
    })
    setSelectedRelationId(relationId)
    await impactMutation.mutateAsync({ silent: true })
  }

  async function removeRelationDraft() {
    const relationId = relationDraft.id.trim()
    if (!relationId) {
      setStatus('Select relation to remove')
      return
    }
    await submitOperation({
      operationType: 'remove',
      targetType: 'relation',
      targetKey: relationId,
      payload: {
        id: relationId
      }
    })
    setSelectedRelationId('')
    await impactMutation.mutateAsync({ silent: true })
  }

  function focusFirstRelationIssue() {
    const issue = relationIssues[0]
    if (!issue) {
      setStatus('No relation issue to focus')
      return
    }
    const relationIndex = parseRelationIndex(issue.fieldPath)
    if (relationIndex < 0) {
      setStatus('Relation issue located, open relation panel to inspect')
      return
    }
    const relation = relationEdges[relationIndex]
    if (!relation) {
      setStatus('Relation issue located, relation missing from current graph')
      return
    }
    setSelectedRelationId(relation.id)
    setStatus(`Focused relation ${relation.id}`)
  }

  function createRelationDraftFromGraph(input: { sourceDimension: string; targetDimension: string }) {
    const relationId = buildRelationId(input.sourceDimension, input.targetDimension)
    setRelationDraft({
      id: relationId,
      sourceDimension: input.sourceDimension,
      sourceKey: 'id',
      targetDimension: input.targetDimension,
      targetKey: 'id',
      joinType: 'inner',
      cardinality: '1:n',
      active: true,
      label: `${input.sourceDimension} -> ${input.targetDimension}`,
      optionsText: '{}'
    })
    setSelectedRelationId('')
    setStatus(`Prepared relation draft ${relationId}`)
  }

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section className="semantic-detail-stack">
        <header className="card semantic-detail-hero semantic-detail-hero-v2">
          <div className="semantic-detail-hero-glow" />
          <div className="semantic-detail-hero-gridline" />
          <div className="semantic-detail-hero-row">
            <h1 className="semantic-detail-title">Semantic Studio · {modelId}</h1>
            <div className="semantic-detail-link-row">
              <Link className="badge badge-warn" href="/semantic-studio">
                Back to studio
              </Link>
              <Link className="badge badge-ok" href={`/models/${modelId}`}>
                Model governance
              </Link>
              {syncV1Enabled ? (
                <button
                  type="button"
                  className="badge badge-warn semantic-detail-badge-btn"
                  data-testid="semantic-sync-open-onboard"
                  onClick={() => setOnboardDrawerOpen(open => !open)}
                >
                  {onboardDrawerOpen ? 'Close onboarding' : 'Onboard from PA'}
                </button>
              ) : null}
            </div>
          </div>
          <div className="semantic-detail-badge-row">
            <span className="badge badge-ok">draftKey: {resolvedDraftKey ?? '-'}</span>
            <span className="badge badge-warn">ops: {operations.length}</span>
            <span className={graphV2Enabled ? 'badge badge-ok' : 'badge badge-warn'}>
              graph-v2: {graphV2Enabled ? 'on' : 'off'}
            </span>
            <span className={syncV1Enabled ? 'badge badge-ok' : 'badge badge-warn'}>
              semantic-sync: {syncV1Enabled ? 'on' : 'off'}
            </span>
            {syncDeleteConfirmationToken ? (
              <span className="badge badge-ok">delete-token: ready</span>
            ) : null}
          </div>
          <div className="semantic-detail-telemetry-strip">
            <span className="badge badge-ok">entities: {entityItems.length}</span>
            <span className="badge badge-warn">relations: {relationEdges.length}</span>
            <span className="badge badge-ok">blockers: {gateBlockers.length || impactResult?.blockers?.length || 0}</span>
          </div>
          <div className="semantic-detail-toolbar-row">
            <input
              className="semantic-detail-input semantic-detail-input-wide"
              data-testid="semantic-studio-draft-key"
              value={draftKeyInput}
              onChange={event => setDraftKeyInput(event.target.value)}
              placeholder="Draft key (optional)"
            />
            <button
              data-testid="semantic-studio-validate"
              type="button"
              className="badge badge-warn semantic-detail-badge-btn"
              disabled={validateMutation.isPending}
              onClick={() => validateMutation.mutate()}
            >
              {validateMutation.isPending ? 'Validating...' : 'Validate draft'}
            </button>
            <button
              data-testid="semantic-studio-preview"
              type="button"
              className="badge badge-warn semantic-detail-badge-btn"
              disabled={previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              {previewMutation.isPending ? 'Previewing...' : 'Preview changes'}
            </button>
          </div>
          {status ? (
            <span className="badge badge-warn semantic-detail-fit" data-testid="semantic-studio-status">
              {status}
            </span>
          ) : null}
          {lastFailedOperation ? (
            <button
              type="button"
              data-testid="semantic-studio-retry-failed"
              className="badge badge-danger semantic-detail-badge-btn semantic-detail-fit"
              onClick={() => retryFailedOperation(lastFailedOperation)}
            >
              Retry failed: {lastFailedOperation.targetType}:{lastFailedOperation.targetKey}
            </button>
          ) : null}
        </header>

        <LoadablePanel
          loading={stateQuery.isLoading}
          error={stateQuery.error}
          empty={!stateQuery.data}
          loadingLabel="Loading semantic editor state..."
          emptyLabel="Semantic Studio model state not found."
          retry={() => {
            void stateQuery.refetch()
          }}
        >
          <section className="card semantic-detail-focus-grid">
            <article className="semantic-detail-panel">
              <strong>Entity explorer</strong>
              <input
                className="semantic-detail-input"
                data-testid="semantic-studio-entity-search"
                value={entitySearch}
                onChange={event => setEntitySearch(event.target.value)}
                placeholder="Search entities"
              />
              <div className="semantic-detail-entity-list">
                {filteredEntityItems.length === 0 ? (
                  <span className="semantic-detail-muted">No entity matched.</span>
                ) : (
                  filteredEntityItems.map(item => (
                    <button
                      key={`${item.type}-${item.key}`}
                      type="button"
                      data-testid={`semantic-studio-entity-${item.type}-${item.key}`}
                      className={
                        item.type === selectedEntityType && item.key === selectedEntityKey
                          ? 'badge badge-ok semantic-detail-badge-btn semantic-detail-align-left'
                          : 'badge badge-warn semantic-detail-badge-btn semantic-detail-align-left'
                      }
                      onClick={() => {
                        setSelectedEntityType(item.type)
                        setSelectedEntityKey(item.key)
                      }}
                    >
                      [{item.type}] {item.label}
                    </button>
                  ))
                )}
              </div>
            </article>
            <article className="semantic-detail-panel">
              <strong>Editor focus</strong>
              <div className="semantic-detail-badge-row">
                {(['measure', 'dimension', 'hierarchy'] as const).map(item => (
                  <button
                    key={item}
                    type="button"
                    className={
                      item === selectedEntityType
                        ? 'badge badge-ok semantic-detail-badge-btn'
                        : 'badge badge-warn semantic-detail-badge-btn'
                    }
                    onClick={() => setSelectedEntityType(item)}
                  >
                    {item}
                  </button>
                ))}
                {selectedEntityKey ? <span className="badge badge-warn">{selectedEntityKey}</span> : null}
              </div>
              <span className="semantic-detail-muted semantic-detail-mini">
                Operations: {(catalog?.operationHints?.[selectedEntityType] ?? OPERATION_TYPES).join(', ')}
              </span>
              <div className="semantic-detail-table-wrap">
                <table data-testid="semantic-studio-field-specs" className="semantic-detail-table semantic-detail-mini">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Type</th>
                      <th>Required</th>
                      <th>Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(catalog?.fieldSpecs?.[selectedEntityType] ?? []).map(spec => (
                      <tr key={`${selectedEntityType}-${spec.field}`}>
                        <td>{spec.field}</td>
                        <td>{spec.type}</td>
                        <td>{spec.required ? 'yes' : 'no'}</td>
                        <td>{spec.example ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <section className="semantic-detail-main-grid">
            {graphV2Enabled ? (
              <GraphV2Canvas
                graph={graphForView}
                meta={graphMetaForView}
                selectedRelationId={selectedRelationId}
                busy={loadGraphWindowMutation.isPending || loadGraphNeighborsMutation.isPending}
                onSelectRelation={relationId => setSelectedRelationId(relationId)}
                onCreateRelationDraft={createRelationDraftFromGraph}
                onLoadMore={() => {
                  if (!hasSemanticGraphMore(graphMetaForView)) {
                    setStatus('No more graph pages to load')
                    return
                  }
                  loadGraphWindowMutation.mutate()
                }}
                onExpandNeighbors={centerNodeKey => loadGraphNeighborsMutation.mutate(centerNodeKey)}
              />
            ) : (
              <GraphCanvas
                graph={graphForView}
                selectedRelationId={selectedRelationId}
                onSelectRelation={relationId => setSelectedRelationId(relationId)}
                onCreateRelationDraft={createRelationDraftFromGraph}
              />
            )}
            <RelationPanel
              draft={relationDraft}
              existing={relationEdges.some(edge => edge.id === relationDraft.id)}
              dimensions={dimensionNames}
              fieldSpecs={relationFieldSpecs}
              issues={relationIssues}
              busy={applyMutation.isPending}
              onChange={patch => setRelationDraft(prev => ({ ...prev, ...patch }))}
              onApply={() => applyRelationDraft()}
              onRemove={removeRelationDraft}
              onValidate={() => validateMutation.mutate()}
            />
            <ImpactGatePanel
              impact={impactResult}
              previewImpact={previewResult?.preview.impact ?? null}
              gateBlockers={gateBlockers}
              gateBlockerDetails={gateBlockerDetails}
              busy={impactMutation.isPending || validateMutation.isPending}
              publishBusy={publishMutation.isPending}
              onRefreshImpact={() => impactMutation.mutate({ silent: false })}
              onPublish={() => publishMutation.mutate()}
              onValidate={() => validateMutation.mutate()}
              onFocusRelationIssue={focusFirstRelationIssue}
            />
            <RelationTemplateDrawer
              templates={relationTemplates}
              relationSource={relationEdges}
              busy={
                relationTemplatesQuery.isLoading ||
                createRelationTemplateMutation.isPending ||
                updateRelationTemplateMutation.isPending ||
                applyRelationTemplateMutation.isPending
              }
              onRefresh={() => relationTemplatesQuery.refetch()}
              onCreate={async input => {
                await createRelationTemplateMutation.mutateAsync(input)
              }}
              onUpdate={async (templateId, input) => {
                await updateRelationTemplateMutation.mutateAsync({
                  templateId,
                  ...input
                })
              }}
              onApply={async (templateId, mode) => {
                await applyRelationTemplateMutation.mutateAsync({ templateId, mode })
              }}
            />
            <RelationTimeline
              items={relationTimeline}
              total={relationTimelineQuery.data?.total ?? relationTimeline.length}
              limit={relationTimelineQuery.data?.limit ?? relationTimeline.length}
              offset={relationTimelineQuery.data?.offset ?? 0}
              busy={relationTimelineQuery.isLoading}
              onFilter={filters => {
                setTimelineFilters(filters)
                setStatus('Relation timeline filter updated')
              }}
              onRefresh={() => relationTimelineQuery.refetch()}
            />
            {syncV1Enabled ? (
              <SyncPreviewPanel
                profile={syncProfileQuery.data}
                preview={syncPreviewResult}
                busy={
                  syncPreviewMutation.isPending ||
                  syncRunMutation.isPending ||
                  syncDeleteConfirmationMutation.isPending ||
                  syncProfileMutation.isPending
                }
                canonicalReleaseHref={canonicalReleaseHref}
                onRefresh={() => syncPreviewMutation.mutate()}
                onRunSync={() => syncRunMutation.mutate()}
                onRequestDeleteConfirmation={() => setSyncDeleteDialogOpen(true)}
              />
            ) : null}
            {syncV1Enabled ? (
              <SyncRunTimeline
                runs={syncRunsQuery.data?.items ?? []}
                total={syncRunsQuery.data?.total ?? 0}
                busy={syncRunsQuery.isLoading || retrySyncMutation.isPending}
                canonicalReleaseHref={canonicalReleaseHref}
                onRefresh={() => syncRunsQuery.refetch()}
                onRetry={runId => retrySyncMutation.mutate(runId)}
              />
            ) : null}
          </section>

          {syncV1Enabled ? (
            <section className="semantic-detail-section-stack">
              <section className="card semantic-detail-card">
                <strong>Sync profile</strong>
                <div className="semantic-detail-form-grid">
                  <label className="semantic-detail-label">
                    <span className="semantic-detail-mini">Mode</span>
                    <select
                      className="semantic-detail-input semantic-detail-select"
                      data-testid="semantic-sync-profile-mode"
                      value={(syncProfileDraft.mode as string | undefined) ?? 'managed_sync'}
                      onChange={event => setSyncProfileDraft(prev => ({ ...prev, mode: event.target.value as SemanticSyncProfile['mode'] }))}
                    >
                      <option value="managed_sync">managed_sync</option>
                      <option value="readonly_binding">readonly_binding</option>
                    </select>
                  </label>
                  <label className="semantic-detail-label">
                    <span className="semantic-detail-mini">PA data source</span>
                    <input
                      className="semantic-detail-input"
                      data-testid="semantic-sync-profile-datasource"
                      value={syncProfileDraft.paDataSourceId ?? ''}
                      onChange={event => setSyncProfileDraft(prev => ({ ...prev, paDataSourceId: event.target.value }))}
                      placeholder="data source id"
                    />
                  </label>
                  <label className="semantic-detail-label">
                    <span className="semantic-detail-mini">Target cube</span>
                    <input
                      className="semantic-detail-input"
                      data-testid="semantic-sync-profile-target-cube"
                      value={syncProfileDraft.targetCube ?? ''}
                      onChange={event => setSyncProfileDraft(prev => ({ ...prev, targetCube: event.target.value }))}
                      placeholder="target cube"
                    />
                  </label>
                  <label className="semantic-detail-label">
                    <span className="semantic-detail-mini">Delete policy</span>
                    <select
                      className="semantic-detail-input semantic-detail-select"
                      data-testid="semantic-sync-profile-delete-policy"
                      value={(syncProfileDraft.deletePolicy as string | undefined) ?? 'hard_delete'}
                      onChange={event =>
                        setSyncProfileDraft(prev => ({
                          ...prev,
                          deletePolicy: event.target.value as SemanticSyncProfile['deletePolicy']
                        }))
                      }
                    >
                      <option value="hard_delete">hard_delete</option>
                      <option value="soft_delete">soft_delete</option>
                      <option value="no_delete">no_delete</option>
                    </select>
                  </label>
                  <label className="semantic-detail-check">
                    <input
                      data-testid="semantic-sync-profile-enabled"
                      type="checkbox"
                      checked={syncProfileDraft.enabled !== false}
                      onChange={event => setSyncProfileDraft(prev => ({ ...prev, enabled: event.target.checked }))}
                    />
                    <span className="semantic-detail-mini">sync enabled</span>
                  </label>
                </div>
                <div className="semantic-detail-badge-row">
                  <button
                    type="button"
                    className="badge badge-ok semantic-detail-badge-btn"
                    data-testid="semantic-sync-profile-save"
                    disabled={syncProfileMutation.isPending}
                    onClick={() => syncProfileMutation.mutate()}
                  >
                    {syncProfileMutation.isPending ? 'Saving...' : 'Save sync profile'}
                  </button>
                  <button
                    type="button"
                    className="badge badge-warn semantic-detail-badge-btn"
                    data-testid="semantic-sync-profile-refresh"
                    onClick={() => syncProfileQuery.refetch()}
                  >
                    Refresh
                  </button>
                </div>
                <span className="semantic-detail-muted semantic-detail-mini">
                  Relation edges will be materialized to PA metadata cube <strong>PA_CHATBI_RELATIONS</strong> when enabled.
                </span>
              </section>
              <SyncDeleteConfirmDialog
                open={syncDeleteDialogOpen}
                previewDigest={syncPreviewResult?.previewDigest}
                schemaVersion={Number(stateQuery.data?.model?.schemaVersion ?? 1)}
                token={syncDeleteConfirmationToken ?? undefined}
                expiresAt={syncDeleteConfirmationExpiresAt ?? undefined}
                busy={syncDeleteConfirmationMutation.isPending}
                onGenerate={() => syncDeleteConfirmationMutation.mutate()}
                onClose={() => setSyncDeleteDialogOpen(false)}
              />
              <OnboardFromPADrawer
                open={onboardDrawerOpen}
                dataSourceId={onboardDataSourceId}
                query={onboardQuery}
                cubes={onboardCubes}
                cubeBusy={listPACubesMutation.isPending}
                cubeError={listPACubesMutation.error}
                selectedCube={onboardSelectedCube}
                metadata={onboardMetadata}
                metadataBusy={cubeMetadataMutation.isPending}
                metadataError={cubeMetadataMutation.error}
                onboardingBusy={onboardModelMutation.isPending}
                reviewHref={canonicalReleaseHref}
                onClose={() => setOnboardDrawerOpen(false)}
                onChangeDataSourceId={onboardDataSourceLocked ? undefined : setOnboardDataSourceId}
                onChangeQuery={setOnboardQuery}
                onSearch={() => listPACubesMutation.mutate()}
                onSelectCube={cube => {
                  setOnboardSelectedCube(cube)
                  setOnboardMetadata(null)
                }}
                onLoadMetadata={() => cubeMetadataMutation.mutate()}
                onOnboard={() => onboardModelMutation.mutate()}
              />
            </section>
          ) : null}

          <section className="semantic-detail-editor-grid">
            <article
              className={`card semantic-detail-card semantic-detail-panel-toggle ${selectedEntityType === 'measure' ? '' : 'is-hidden'}`}
              data-testid="semantic-studio-measure-panel"
            >
              <strong>Measure editor</strong>
              <form
                data-testid="semantic-studio-measure-form"
                onSubmit={async (event: FormEvent) => {
                  event.preventDefault()
                  await submitOperation({
                    operationType: measureOperationType,
                    targetType: 'measure',
                    targetKey: measureCode.trim(),
                    payload: {
                      code: measureCode.trim(),
                      name: measureName.trim(),
                      description: measureDescription.trim() || undefined,
                      formula: measureFormula.trim() || undefined,
                      unit: measureUnit.trim() || undefined,
                      type: measureType.trim() || undefined,
                      aliases: splitCsv(measureAliases)
                    }
                  })
                }}
                className="semantic-detail-form"
              >
                <div className="semantic-detail-row">
                  <select
                    className="semantic-detail-input semantic-detail-select"
                    aria-label="Measure operation type"
                    value={measureOperationType}
                    onChange={event => setMeasureOperationType(event.target.value as (typeof OPERATION_TYPES)[number])}
                  >
                    {measureOperationOptions.map(item => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <select
                    className="semantic-detail-input semantic-detail-select semantic-detail-grow"
                    aria-label="Measure selector"
                    value={measureCode}
                    onChange={event => {
                      const nextCode = event.target.value
                      const selected = catalog?.measures.find(item => item.code === nextCode)
                      setMeasureCode(nextCode)
                      setMeasureName(selected?.name ?? nextCode)
                      setMeasureDescription(selected?.description ?? '')
                      setMeasureFormula(selected?.formula ?? '')
                      setMeasureUnit(selected?.unit ?? '')
                      setMeasureType(selected?.type ?? '')
                      setMeasureAliases((selected?.aliases ?? []).join(', '))
                    }}
                  >
                    {catalog?.measures.map(item => (
                      <option key={item.code} value={item.code}>
                        {item.code}
                      </option>
                    ))}
                    {!catalog?.measures.find(item => item.code === measureCode) && measureCode ? (
                      <option value={measureCode}>{measureCode}</option>
                    ) : null}
                  </select>
                </div>
                <input
                  className="semantic-detail-input"
                  data-testid="semantic-studio-measure-code"
                  value={measureCode}
                  onChange={event => setMeasureCode(event.target.value)}
                  placeholder="Measure code"
                />
                <input
                  className="semantic-detail-input"
                  value={measureName}
                  onChange={event => setMeasureName(event.target.value)}
                  placeholder="Measure name"
                />
                <div className="semantic-detail-row-wrap">
                  <input
                    className="semantic-detail-input semantic-detail-grow semantic-detail-min"
                    value={measureType}
                    onChange={event => setMeasureType(event.target.value)}
                    placeholder="Type"
                  />
                  <input
                    className="semantic-detail-input semantic-detail-grow semantic-detail-min"
                    value={measureUnit}
                    onChange={event => setMeasureUnit(event.target.value)}
                    placeholder="Unit"
                  />
                </div>
                <input
                  className="semantic-detail-input"
                  value={measureFormula}
                  onChange={event => setMeasureFormula(event.target.value)}
                  placeholder="Formula"
                />
                <input
                  className="semantic-detail-input"
                  value={measureAliases}
                  onChange={event => setMeasureAliases(event.target.value)}
                  placeholder="Aliases (comma separated)"
                />
                <textarea
                  className="semantic-detail-input semantic-detail-textarea"
                  value={measureDescription}
                  onChange={event => setMeasureDescription(event.target.value)}
                  placeholder="Description"
                  rows={3}
                />
                <button
                  data-testid="semantic-studio-measure-apply"
                  className="badge badge-ok semantic-detail-badge-btn"
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending ? 'Applying...' : 'Apply measure'}
                </button>
              </form>
            </article>

            <article
              className={`card semantic-detail-card semantic-detail-panel-toggle ${selectedEntityType === 'dimension' ? '' : 'is-hidden'}`}
              data-testid="semantic-studio-dimension-panel"
            >
              <strong>Dimension editor</strong>
              <form
                data-testid="semantic-studio-dimension-form"
                onSubmit={async (event: FormEvent) => {
                  event.preventDefault()
                  await submitOperation({
                    operationType: dimensionOperationType,
                    targetType: 'dimension',
                    targetKey: dimensionName.trim(),
                    payload: {
                      name: dimensionName.trim(),
                      caption: dimensionCaption.trim(),
                      description: dimensionDescription.trim() || undefined,
                      levels: splitCsv(dimensionLevels)
                    }
                  })
                }}
                className="semantic-detail-form"
              >
                <div className="semantic-detail-row">
                  <select
                    className="semantic-detail-input semantic-detail-select"
                    aria-label="Dimension operation type"
                    value={dimensionOperationType}
                    onChange={event => setDimensionOperationType(event.target.value as (typeof OPERATION_TYPES)[number])}
                  >
                    {dimensionOperationOptions.map(item => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <select
                    className="semantic-detail-input semantic-detail-select semantic-detail-grow"
                    aria-label="Dimension selector"
                    value={dimensionName}
                    onChange={event => {
                      const nextName = event.target.value
                      const selected = catalog?.dimensions.find(item => item.name === nextName)
                      setDimensionName(nextName)
                      setDimensionCaption(selected?.caption ?? nextName)
                      setDimensionDescription(selected?.description ?? '')
                      setDimensionLevels((selected?.levels ?? []).join(', '))
                    }}
                  >
                    {catalog?.dimensions.map(item => (
                      <option key={item.name} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                    {!catalog?.dimensions.find(item => item.name === dimensionName) && dimensionName ? (
                      <option value={dimensionName}>{dimensionName}</option>
                    ) : null}
                  </select>
                </div>
                <input
                  className="semantic-detail-input"
                  data-testid="semantic-studio-dimension-name"
                  value={dimensionName}
                  onChange={event => setDimensionName(event.target.value)}
                  placeholder="Dimension name"
                />
                <input
                  className="semantic-detail-input"
                  value={dimensionCaption}
                  onChange={event => setDimensionCaption(event.target.value)}
                  placeholder="Dimension caption"
                />
                <input
                  className="semantic-detail-input"
                  value={dimensionLevels}
                  onChange={event => setDimensionLevels(event.target.value)}
                  placeholder="Levels (comma separated)"
                />
                <textarea
                  className="semantic-detail-input semantic-detail-textarea"
                  value={dimensionDescription}
                  onChange={event => setDimensionDescription(event.target.value)}
                  placeholder="Description"
                  rows={3}
                />
                <button
                  data-testid="semantic-studio-dimension-apply"
                  className="badge badge-ok semantic-detail-badge-btn"
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending ? 'Applying...' : 'Apply dimension'}
                </button>
              </form>
            </article>

            <article
              className={`card semantic-detail-card semantic-detail-panel-toggle ${selectedEntityType === 'hierarchy' ? '' : 'is-hidden'}`}
              data-testid="semantic-studio-hierarchy-panel"
            >
              <strong>Hierarchy editor</strong>
              <form
                data-testid="semantic-studio-hierarchy-form"
                onSubmit={async (event: FormEvent) => {
                  event.preventDefault()
                  await submitOperation({
                    operationType: hierarchyOperationType,
                    targetType: 'hierarchy',
                    targetKey: hierarchyName.trim(),
                    payload: {
                      dimension: hierarchyDimension.trim(),
                      name: hierarchyName.trim(),
                      caption: hierarchyCaption.trim(),
                      levels: splitCsv(hierarchyLevels)
                    }
                  })
                }}
                className="semantic-detail-form"
              >
                <div className="semantic-detail-row">
                  <select
                    className="semantic-detail-input semantic-detail-select"
                    aria-label="Hierarchy operation type"
                    value={hierarchyOperationType}
                    onChange={event => setHierarchyOperationType(event.target.value as (typeof OPERATION_TYPES)[number])}
                  >
                    {hierarchyOperationOptions.map(item => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <select
                    className="semantic-detail-input semantic-detail-select semantic-detail-grow"
                    data-testid="semantic-studio-hierarchy-dimension"
                    aria-label="Hierarchy dimension selector"
                    value={hierarchyDimension}
                    onChange={event => setHierarchyDimension(event.target.value)}
                  >
                    {catalog?.dimensions.map(item => (
                      <option key={item.name} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                    {!catalog?.dimensions.find(item => item.name === hierarchyDimension) && hierarchyDimension ? (
                      <option value={hierarchyDimension}>{hierarchyDimension}</option>
                    ) : null}
                  </select>
                </div>
                <input
                  className="semantic-detail-input"
                  data-testid="semantic-studio-hierarchy-name"
                  value={hierarchyName}
                  onChange={event => setHierarchyName(event.target.value)}
                  placeholder="Hierarchy name"
                />
                <input
                  className="semantic-detail-input"
                  value={hierarchyCaption}
                  onChange={event => setHierarchyCaption(event.target.value)}
                  placeholder="Hierarchy caption"
                />
                <input
                  className="semantic-detail-input"
                  value={hierarchyLevels}
                  onChange={event => setHierarchyLevels(event.target.value)}
                  placeholder="Levels (comma separated)"
                />
                <button
                  data-testid="semantic-studio-hierarchy-apply"
                  className="badge badge-ok semantic-detail-badge-btn"
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending ? 'Applying...' : 'Apply hierarchy'}
                </button>
              </form>
            </article>
          </section>

          <section className="card semantic-detail-card">
            <strong>Validation issues</strong>
            {validationResult ? (
              <>
                <div className="semantic-detail-badge-row">
                  <span className="badge badge-ok">status: {validationResult.status}</span>
                  <span className="badge badge-warn">issues: {validationResult.issues.length}</span>
                </div>
                {validationResult.issues.length === 0 ? (
                  <span className="semantic-detail-muted">No validation issues.</span>
                ) : (
                  <div className="semantic-detail-table-wrap">
                    <table data-testid="semantic-studio-validation-table" className="semantic-detail-table semantic-detail-mini">
                      <thead>
                        <tr>
                          <th>Scope</th>
                          <th>Field</th>
                          <th>Severity</th>
                          <th>Code</th>
                          <th>Message</th>
                          <th>Suggestion</th>
                          <th>Retryable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.issues.map((issue, index) => (
                          <tr key={`${issue.fieldPath}-${issue.code}-${index}`}>
                            <td>{issue.scope ?? '-'}</td>
                            <td>{issue.fieldPath}</td>
                            <td>{issue.severity}</td>
                            <td>{issue.code}</td>
                            <td>{issue.message}</td>
                            <td>{issue.suggestion ?? '-'}</td>
                            <td>
                              {issue.retryable === undefined ? '-' : issue.retryable ? 'yes' : 'no'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <span className="semantic-detail-muted">Run validation to see structured issues.</span>
            )}
          </section>

          <section className="card semantic-detail-card">
            <strong>Preview changes</strong>
            {previewResult ? (
              <>
                <div className="semantic-detail-badge-row">
                  <span className="badge badge-warn" data-testid="semantic-studio-preview-risk">
                    risk: {previewResult.preview.riskLevel ?? 'low'}
                  </span>
                  <span className="badge badge-ok">
                    added: {previewResult.preview.summary?.added ?? 0}
                  </span>
                  <span className="badge badge-ok">
                    updated: {previewResult.preview.summary?.updated ?? 0}
                  </span>
                  <span className="badge badge-danger">
                    removed: {previewResult.preview.summary?.removed ?? 0}
                  </span>
                </div>
                {previewResult.preview.changes.length === 0 ? (
                  <span className="semantic-detail-muted">No changes detected.</span>
                ) : (
                  <div className="semantic-detail-table-wrap">
                    <table data-testid="semantic-studio-preview-table" className="semantic-detail-table semantic-detail-mini">
                      <thead>
                        <tr>
                          <th>Target</th>
                          <th>Action</th>
                          <th>Changed fields</th>
                          <th>Before</th>
                          <th>After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewResult.preview.changes.map((change, index) => (
                          <tr key={`${change.targetType}-${change.targetKey}-${index}`}>
                            <td>
                              {change.targetType}:{change.targetKey}
                            </td>
                            <td>{change.action}</td>
                            <td>
                              {Array.isArray(change.changedFields) && change.changedFields.length > 0 ? change.changedFields.join(', ') : '-'}
                            </td>
                            <td className="semantic-detail-mono">
                              {change.before ? JSON.stringify(change.before) : '-'}
                            </td>
                            <td className="semantic-detail-mono">
                              {change.after ? JSON.stringify(change.after) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <span className="semantic-detail-muted">Generate preview to inspect structured changes.</span>
            )}
          </section>

          <section className="card semantic-detail-card">
            <strong>Recent operations</strong>
            {operations.length === 0 ? (
              <span className="semantic-detail-muted">No operations recorded.</span>
            ) : (
              <div className="semantic-detail-table-wrap">
                <table data-testid="semantic-studio-operations-table" className="semantic-detail-table semantic-detail-mini">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Target</th>
                      <th>Status</th>
                      <th>Actor</th>
                      <th>At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map(operation => (
                      <tr key={operation.id}>
                        <td>{operation.operationType}</td>
                        <td>
                          {operation.targetType}:{operation.targetKey}
                        </td>
                        <td>{operation.status}</td>
                        <td>{operation.createdBy ?? '-'}</td>
                        <td>{operation.createdAt ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <details className="card semantic-detail-card">
            <summary className="semantic-detail-summary">Advanced JSON</summary>
            <form
              data-testid="semantic-studio-operation-form"
              onSubmit={async (event: FormEvent) => {
                event.preventDefault()
                await submitOperation({
                  operationType,
                  targetType,
                  targetKey: targetKey.trim(),
                  payload: parseJson(payloadText)
                })
              }}
              className="semantic-detail-form"
            >
              <div className="semantic-detail-row-wrap">
                <select
                  className="semantic-detail-input semantic-detail-select"
                  data-testid="semantic-studio-target-type"
                  aria-label="Advanced target type"
                  value={targetType}
                  onChange={event => setTargetType(event.target.value as (typeof TARGET_TYPES)[number])}
                >
                  {TARGET_TYPES.map(item => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  className="semantic-detail-input semantic-detail-select"
                  data-testid="semantic-studio-operation-type"
                  aria-label="Advanced operation type"
                  value={operationType}
                  onChange={event => setOperationType(event.target.value as (typeof OPERATION_TYPES)[number])}
                >
                  {OPERATION_TYPES.map(item => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <input
                  className="semantic-detail-input semantic-detail-grow semantic-detail-wide"
                  data-testid="semantic-studio-target-key"
                  value={targetKey}
                  onChange={event => setTargetKey(event.target.value)}
                  placeholder="Target key"
                />
              </div>
              <textarea
                className="semantic-detail-input semantic-detail-textarea semantic-detail-mono"
                data-testid="semantic-studio-payload"
                value={payloadText}
                onChange={event => setPayloadText(event.target.value)}
                rows={6}
              />
              <button
                data-testid="semantic-studio-apply"
                className="badge badge-ok semantic-detail-badge-btn semantic-detail-fit"
                disabled={applyMutation.isPending}
              >
                {applyMutation.isPending ? 'Applying...' : 'Apply operation'}
              </button>
            </form>
          </details>
        </LoadablePanel>
      </section>
    </AccessGuard>
  )
}

function splitCsv(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function parseRelationIndex(fieldPath: string) {
  const matched = fieldPath.match(/relations\[(\d+)\]/)
  if (!matched?.[1]) return -1
  const index = Number(matched[1])
  return Number.isFinite(index) ? index : -1
}

function buildRelationId(sourceDimension: string, targetDimension: string) {
  const source = sourceDimension.trim().replace(/\s+/g, '_').toUpperCase()
  const target = targetDimension.trim().replace(/\s+/g, '_').toUpperCase()
  const suffix = Date.now().toString(36).slice(-6)
  return `REL_${source}_${target}_${suffix}`
}

function parseJson(raw: string) {
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>
  } catch (error) {
    throw new Error(error instanceof Error ? `Invalid JSON: ${error.message}` : 'Invalid JSON')
  }
}

function parseModelAllowlist(raw: string | undefined) {
  if (!raw) return []
  return raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}
