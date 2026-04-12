import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applySemanticRelationTemplate,
  applySemanticEditorOperations,
  createSemanticRelationTemplate,
  getSemanticEditorGraphNeighbors,
  getSemanticEditorGraphPage,
  getSemanticEditorImpact,
  getSemanticEditorState,
  listSemanticRelationTemplates,
  listSemanticRelationTimeline,
  listSemanticEditorOperations,
  publishSemanticEditorModel,
  previewSemanticEditorDraft,
  resolveGateBlockers,
  resolveGateBlockerDetails,
  updateSemanticRelationTemplate,
  validateSemanticEditorDraft
} from '@/modules/semantic-studio/api'

function mockJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload
  } as Response
}

describe('semantic studio api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests editor state endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          modelId: 'm1',
          draftKey: null,
          schemaSnapshot: {},
          catalog: {
            operationHints: { measure: ['add'], dimension: ['update'], hierarchy: ['remove'] },
            fieldSpecs: { measure: [], dimension: [], hierarchy: [] },
            measures: [],
            dimensions: [],
            hierarchies: [],
            stats: {}
          }
        }
      })
    )

    const result = await getSemanticEditorState('m1')

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/semantic-model/m1/editor/state')
    expect(result.catalog.operationHints?.measure).toEqual(['add'])
    expect(Array.isArray(result.catalog.fieldSpecs?.measure)).toBe(true)
  })

  it('serializes editor state graph query options', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          modelId: 'm1',
          draftKey: null,
          schemaSnapshot: {},
          catalog: { measures: [], dimensions: [], hierarchies: [], stats: {} },
          graph: { nodes: [], edges: [] },
          graphMeta: {
            modeApplied: 'window',
            totalNodes: 100,
            totalEdges: 200,
            returnedNodes: 50,
            returnedEdges: 80,
            truncated: true
          }
        }
      })
    )

    await getSemanticEditorState('m1', {
      graphMode: 'auto',
      graphNodeLimit: 10,
      graphEdgeLimit: 20,
      graphNodeOffset: 30,
      graphEdgeOffset: 40
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/semantic-model/m1/editor/state?')
    expect(String(url)).toContain('graphMode=auto')
    expect(String(url)).toContain('graphNodeLimit=10')
    expect(String(url)).toContain('graphEdgeLimit=20')
    expect(String(url)).toContain('graphNodeOffset=30')
    expect(String(url)).toContain('graphEdgeOffset=40')
  })

  it('serializes list editor operations pagination', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: { items: [], total: 0, limit: 20, offset: 40 }
      })
    )

    await listSemanticEditorOperations('m1', { limit: 20, offset: 40 })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/semantic-model/m1/editor/operations?')
    expect(String(url)).toContain('limit=20')
    expect(String(url)).toContain('offset=40')
  })

  it('posts editor operations payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          modelId: 'm1',
          draft: { id: 'd1', draftKey: 'draft-m1', status: 'active', schemaSnapshot: {} },
          operations: [],
          issues: []
        }
      })
    )

    await applySemanticEditorOperations('m1', {
      draftKey: 'draft-m1',
      operations: [{ operationType: 'add', targetType: 'measure', targetKey: 'Revenue', payload: { code: 'Revenue' } }]
    })

    const [, options] = fetchMock.mock.calls[0] ?? []
    expect(JSON.parse(String(options?.body))).toEqual({
      draftKey: 'draft-m1',
      operations: [{ operationType: 'add', targetType: 'measure', targetKey: 'Revenue', payload: { code: 'Revenue' } }]
    })
  })

  it('posts validate and preview payloads', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: {
            id: 'v1',
            modelId: 'm1',
            status: 'failed',
            summary: {},
            issues: [{ fieldPath: 'schemaSnapshot.measures', severity: 'error', code: 'schema_invalid', message: 'invalid', retryable: true }]
          }
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: {
            modelId: 'm1',
            preview: {
              schemaSnapshot: {},
              diff: {},
              changes: [],
              summary: { added: 0, removed: 0, updated: 0 },
              riskLevel: 'low'
            }
          }
        })
      )

    const validateResult = await validateSemanticEditorDraft('m1', { draftKey: 'draft-m1' })
    const previewResult = await previewSemanticEditorDraft('m1', { draftKey: 'draft-m1' })

    const [validateUrl, validateOptions] = fetchMock.mock.calls[0] ?? []
    const [previewUrl, previewOptions] = fetchMock.mock.calls[1] ?? []
    expect(String(validateUrl)).toContain('/semantic-model/m1/editor/validate')
    expect(JSON.parse(String(validateOptions?.body))).toEqual({ draftKey: 'draft-m1' })
    expect(String(previewUrl)).toContain('/semantic-model/m1/editor/preview')
    expect(JSON.parse(String(previewOptions?.body))).toEqual({ draftKey: 'draft-m1' })
    expect(validateResult.issues[0]?.retryable).toBe(true)
    expect(previewResult.preview.riskLevel).toBe('low')
  })

  it('requests impact summary endpoint with query params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          riskLevel: 'high',
          blockers: ['relation_cardinality_high_risk'],
          affectedQueries: 2,
          affectedStories: 1,
          affectedIndicators: 1,
          windowHours: 168
        }
      })
    )

    const result = await getSemanticEditorImpact('m1', { draftKey: 'draft-m1', windowHours: 168 })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/semantic-model/m1/editor/impact?')
    expect(String(url)).toContain('draftKey=draft-m1')
    expect(String(url)).toContain('windowHours=168')
    expect(result.riskLevel).toBe('high')
  })

  it('supports relation template create/list/update/apply endpoints', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: {
            template: {
              id: 't1',
              modelId: 'm1',
              name: 'Template',
              status: 'active',
              relations: []
            }
          }
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: {
            items: [],
            total: 0,
            limit: 20,
            offset: 0
          }
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: {
            template: {
              id: 't1',
              modelId: 'm1',
              name: 'Template updated',
              status: 'active',
              relations: []
            }
          }
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: {
            mode: 'append',
            applied: 1,
            draftKey: 'draft-m1',
            issues: []
          }
        })
      )

    await createSemanticRelationTemplate('m1', {
      name: 'Template',
      relations: []
    })
    await listSemanticRelationTemplates('m1', { status: 'active', limit: 20, offset: 0 })
    await updateSemanticRelationTemplate('m1', 't1', {
      name: 'Template updated'
    })
    await applySemanticRelationTemplate('m1', 't1', {
      mode: 'append'
    })

    const [createUrl] = fetchMock.mock.calls[0] ?? []
    const [listUrl] = fetchMock.mock.calls[1] ?? []
    const [updateUrl] = fetchMock.mock.calls[2] ?? []
    const [applyUrl] = fetchMock.mock.calls[3] ?? []
    expect(String(createUrl)).toContain('/semantic-model/m1/editor/relation-templates')
    expect(String(listUrl)).toContain('/semantic-model/m1/editor/relation-templates?')
    expect(String(listUrl)).toContain('status=active')
    expect(String(updateUrl)).toContain('/semantic-model/m1/editor/relation-templates/t1')
    expect(String(applyUrl)).toContain('/semantic-model/m1/editor/relation-templates/t1/apply')
  })

  it('serializes relation timeline query filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          items: [],
          total: 0,
          limit: 20,
          offset: 0
        }
      })
    )

    await listSemanticRelationTimeline('m1', {
      relationId: 'REL_A',
      actor: 'tester',
      limit: 20,
      offset: 5
    })

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/semantic-model/m1/editor/relations/timeline?')
    expect(String(url)).toContain('relationId=REL_A')
    expect(String(url)).toContain('actor=tester')
    expect(String(url)).toContain('limit=20')
    expect(String(url)).toContain('offset=5')
  })

  it('requests graph page and neighbors endpoints', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: {
            graph: { nodes: [], edges: [] },
            meta: {
              modeApplied: 'window',
              totalNodes: 100,
              totalEdges: 300,
              returnedNodes: 80,
              returnedEdges: 160,
              truncated: true
            }
          }
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: {
            graph: { nodes: [], edges: [] },
            meta: {
              modeApplied: 'neighbors',
              centerNodeKey: 'Region',
              hops: 1,
              totalNodes: 100,
              totalEdges: 300,
              returnedNodes: 20,
              returnedEdges: 30,
              truncated: false
            }
          }
        })
      )

    await getSemanticEditorGraphPage('m1', {
      draftKey: 'draft-m1',
      mode: 'window',
      nodeLimit: 20,
      edgeLimit: 30,
      nodeOffset: 40,
      edgeOffset: 50,
      relationStatus: 'active',
      q: 'region'
    })
    await getSemanticEditorGraphNeighbors('m1', {
      draftKey: 'draft-m1',
      centerNodeKey: 'Region',
      hops: 2,
      edgeLimit: 120
    })

    const [graphUrl] = fetchMock.mock.calls[0] ?? []
    const [neighborUrl] = fetchMock.mock.calls[1] ?? []
    expect(String(graphUrl)).toContain('/semantic-model/m1/editor/graph?')
    expect(String(graphUrl)).toContain('draftKey=draft-m1')
    expect(String(graphUrl)).toContain('mode=window')
    expect(String(graphUrl)).toContain('nodeLimit=20')
    expect(String(graphUrl)).toContain('edgeLimit=30')
    expect(String(graphUrl)).toContain('nodeOffset=40')
    expect(String(graphUrl)).toContain('edgeOffset=50')
    expect(String(graphUrl)).toContain('relationStatus=active')
    expect(String(graphUrl)).toContain('q=region')
    expect(String(neighborUrl)).toContain('/semantic-model/m1/editor/graph/neighbors?')
    expect(String(neighborUrl)).toContain('centerNodeKey=Region')
    expect(String(neighborUrl)).toContain('hops=2')
    expect(String(neighborUrl)).toContain('edgeLimit=120')
  })

  it('extracts gate blockers when publish returns blocked response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: async () => ({
        message: 'publish blocked',
        gateBlockers: ['relation_cardinality_high_risk']
      })
    } as Response)

    await expect(publishSemanticEditorModel('m1', 2)).rejects.toThrow('publish blocked')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('resolves gate blockers from common envelope shapes', () => {
    expect(resolveGateBlockers({ gateBlockers: ['a'] })).toEqual(['a'])
    expect(resolveGateBlockers({ data: { gateBlockers: ['b'] } })).toEqual(['b'])
    expect(resolveGateBlockers({ details: { gateBlockers: ['c'] } })).toEqual(['c'])
    expect(resolveGateBlockers({})).toEqual([])
  })

  it('resolves gate blocker details from common envelope shapes', () => {
    const detail = {
      code: 'relation_cycle_detected',
      severity: 'error',
      ownerHint: 'owner',
      resolutionGuide: 'guide',
      retryable: true
    }
    expect(resolveGateBlockerDetails({ gateBlockerDetails: [detail] })).toEqual([detail])
    expect(resolveGateBlockerDetails({ data: { gateBlockerDetails: [detail] } })).toEqual([detail])
    expect(resolveGateBlockerDetails({ details: { gateBlockerDetails: [detail] } })).toEqual([detail])
    expect(resolveGateBlockerDetails({})).toEqual([])
  })
})
