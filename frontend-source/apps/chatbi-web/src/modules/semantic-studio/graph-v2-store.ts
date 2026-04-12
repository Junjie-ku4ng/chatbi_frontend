import type { SemanticEditorGraphMeta, SemanticEditorGraphPage, SemanticEditorGraphState, SemanticRelationEdge } from './api'

export type SemanticGraphWindowState = {
  graph: SemanticEditorGraphState
  meta?: SemanticEditorGraphMeta
}

export function createSemanticGraphWindowState(
  graph?: SemanticEditorGraphState,
  meta?: SemanticEditorGraphMeta
): SemanticGraphWindowState {
  return {
    graph: {
      nodes: graph?.nodes ?? [],
      edges: graph?.edges ?? [],
      constraints: graph?.constraints
    },
    meta
  }
}

export function mergeSemanticGraphWindowState(
  current: SemanticGraphWindowState | null,
  incoming: Pick<SemanticEditorGraphPage, 'graph' | 'meta'>
): SemanticGraphWindowState {
  if (!current) {
    return createSemanticGraphWindowState(incoming.graph, incoming.meta)
  }
  const nodeMap = new Map<string, SemanticEditorGraphState['nodes'][number]>()
  for (const node of current.graph.nodes) {
    nodeMap.set(node.id, node)
  }
  for (const node of incoming.graph.nodes) {
    nodeMap.set(node.id, node)
  }
  const edgeMap = new Map<string, SemanticEditorGraphState['edges'][number]>()
  for (const edge of current.graph.edges) {
    edgeMap.set(edge.id, edge)
  }
  for (const edge of incoming.graph.edges) {
    edgeMap.set(edge.id, edge)
  }
  return {
    graph: {
      nodes: [...nodeMap.values()],
      edges: [...edgeMap.values()],
      constraints: incoming.graph.constraints ?? current.graph.constraints
    },
    meta: incoming.meta
  }
}

export function hasSemanticGraphMore(meta?: SemanticEditorGraphMeta | null) {
  if (!meta) return false
  return typeof meta.nextNodeOffset === 'number' || typeof meta.nextEdgeOffset === 'number'
}

function ensureDimensionNode(
  nodeMap: Map<string, SemanticEditorGraphState['nodes'][number]>,
  dimension: string
) {
  const nodeId = `dimension:${dimension}`
  if (nodeMap.has(nodeId)) {
    return nodeId
  }
  nodeMap.set(nodeId, {
    id: nodeId,
    key: dimension,
    label: dimension,
    nodeType: 'dimension'
  })
  return nodeId
}

export function upsertSemanticGraphRelation(
  current: SemanticGraphWindowState | null,
  relation: SemanticRelationEdge
): SemanticGraphWindowState {
  const base = current ?? createSemanticGraphWindowState()
  const nodeMap = new Map<string, SemanticEditorGraphState['nodes'][number]>()
  for (const node of base.graph.nodes) {
    nodeMap.set(node.id, node)
  }
  const sourceNodeId = ensureDimensionNode(nodeMap, relation.sourceDimension)
  const targetNodeId = ensureDimensionNode(nodeMap, relation.targetDimension)

  const edgeMap = new Map<string, SemanticEditorGraphState['edges'][number]>()
  for (const edge of base.graph.edges) {
    edgeMap.set(edge.id, edge)
  }
  edgeMap.set(relation.id, {
    ...relation,
    sourceNodeId,
    targetNodeId
  })

  return {
    graph: {
      nodes: [...nodeMap.values()],
      edges: [...edgeMap.values()],
      constraints: base.graph.constraints
    },
    meta: base.meta
  }
}

export function applySemanticGraphRelations(
  current: SemanticGraphWindowState | null,
  relations: SemanticRelationEdge[]
): SemanticGraphWindowState {
  const seed = current ?? createSemanticGraphWindowState()
  return relations.reduce((state, relation) => upsertSemanticGraphRelation(state, relation), seed)
}
