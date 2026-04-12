'use client'

import { useMemo, useState } from 'react'
import {
  Background,
  Connection,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type OnConnect
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { SemanticEditorGraphMeta, SemanticEditorGraphState } from './api'
import { GraphV2Toolbar } from './graph-v2-toolbar'

type GraphV2CanvasProps = {
  graph?: SemanticEditorGraphState
  meta?: SemanticEditorGraphMeta
  selectedRelationId?: string
  busy?: boolean
  onSelectRelation: (relationId: string) => void
  onCreateRelationDraft: (input: { sourceDimension: string; targetDimension: string }) => void
  onLoadMore: () => void
  onExpandNeighbors: (centerNodeKey: string) => void
}

function buildNodePosition(index: number, type: string) {
  if (type === 'dimension') {
    const col = index % 4
    const row = Math.floor(index / 4)
    return {
      x: col * 220,
      y: row * 130
    }
  }
  const col = index % 5
  const row = Math.floor(index / 5)
  return {
    x: col * 180,
    y: 420 + row * 100
  }
}

export function GraphV2Canvas(props: GraphV2CanvasProps) {
  const dimensions = useMemo(
    () => (props.graph?.nodes ?? []).filter(node => node.nodeType === 'dimension'),
    [props.graph?.nodes]
  )

  const [sourceDimension, setSourceDimension] = useState('')
  const [targetDimension, setTargetDimension] = useState('')
  const [neighborCenterNodeKey, setNeighborCenterNodeKey] = useState('')

  const flowNodes = useMemo<Node[]>(() => {
    return (props.graph?.nodes ?? []).map((node, index) => ({
      id: node.id,
      position: buildNodePosition(index, node.nodeType),
      data: {
        label: node.label,
        key: node.key,
        nodeType: node.nodeType
      },
      style: {
        border: node.nodeType === 'dimension' ? '2px solid #1162d2' : '1px solid #c6d6f5',
        borderRadius: 12,
        padding: 6,
        background: node.nodeType === 'dimension' ? '#e9f1ff' : '#f9fbff',
        width: node.nodeType === 'dimension' ? 180 : 160
      }
    }))
  }, [props.graph?.nodes])

  const flowEdges = useMemo<Edge[]>(() => {
    return (props.graph?.edges ?? []).map(edge => ({
      id: edge.id,
      source: edge.sourceNodeId ?? `dimension:${edge.sourceDimension}`,
      target: edge.targetNodeId ?? `dimension:${edge.targetDimension}`,
      label: `${edge.joinType} · ${edge.cardinality}`,
      animated: edge.status === 'invalid',
      style:
        edge.id === props.selectedRelationId
          ? { stroke: '#1162d2', strokeWidth: 3 }
          : edge.status === 'invalid'
            ? { stroke: '#d97706', strokeWidth: 2 }
            : { stroke: '#64748b', strokeWidth: 2 }
    }))
  }, [props.graph?.edges, props.selectedRelationId])

  const nodeById = useMemo(() => new Map(flowNodes.map(node => [node.id, node])), [flowNodes])

  const handleConnect: OnConnect = (connection: Connection) => {
    const sourceId = connection.source
    const targetId = connection.target
    if (!sourceId || !targetId) {
      return
    }
    const sourceNode = nodeById.get(sourceId)
    const targetNode = nodeById.get(targetId)
    const sourceKey = String(sourceNode?.data?.key ?? '')
    const targetKey = String(targetNode?.data?.key ?? '')
    if (!sourceKey || !targetKey) {
      return
    }
    props.onCreateRelationDraft({ sourceDimension: sourceKey, targetDimension: targetKey })
    setSourceDimension(sourceKey)
    setTargetDimension(targetKey)
  }

  const handleEdgeClick = (_event: unknown, edge: Edge) => {
    props.onSelectRelation(edge.id)
  }

  const hasMore = Boolean(
    typeof props.meta?.nextNodeOffset === 'number' || typeof props.meta?.nextEdgeOffset === 'number'
  )

  return (
    <section className="card semantic-graph-surface" data-testid="semantic-graph-canvas">
      <div className="semantic-graph-meta">
        <strong>Join Graph V2</strong>
        <span className="badge badge-warn">nodes: {(props.graph?.nodes ?? []).length}</span>
        <span className="badge badge-warn">edges: {(props.graph?.edges ?? []).length}</span>
        <span
          className={props.meta?.modeApplied === 'window' ? 'badge badge-warn' : 'badge badge-ok'}
          data-testid="semantic-graph-mode"
        >
          mode: {props.meta?.modeApplied ?? 'full'}
        </span>
        {props.meta?.truncated ? <span className="badge badge-danger">windowed</span> : null}
      </div>

      <GraphV2Toolbar
        dimensions={dimensions.map(node => ({ id: node.id, key: node.key, label: node.label }))}
        sourceDimension={sourceDimension}
        targetDimension={targetDimension}
        neighborCenterNodeKey={neighborCenterNodeKey}
        busy={props.busy === true}
        hasMore={hasMore}
        onSourceDimensionChange={setSourceDimension}
        onTargetDimensionChange={setTargetDimension}
        onNeighborCenterChange={setNeighborCenterNodeKey}
        onCreateDraft={() => {
          props.onCreateRelationDraft({ sourceDimension, targetDimension })
        }}
        onLoadMore={props.onLoadMore}
        onExpandNeighbors={() => {
          if (!neighborCenterNodeKey) return
          props.onExpandNeighbors(neighborCenterNodeKey)
        }}
      />

      <div data-testid="semantic-graph-flow-ready" className="semantic-graph-flow-ready">
        <ReactFlow nodes={flowNodes} edges={flowEdges} onConnect={handleConnect} onEdgeClick={handleEdgeClick} fitView>
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      <div className="semantic-graph-table-wrap">
        <table className="semantic-graph-table">
          <thead>
            <tr>
              <th>Relation</th>
              <th>Join</th>
              <th>Cardinality</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(props.graph?.edges ?? []).map(edge => (
              <tr
                key={edge.id}
                data-testid={`semantic-graph-edge-${edge.id}`}
                className={`semantic-graph-table-row ${props.selectedRelationId === edge.id ? 'is-selected' : ''}`}
                onClick={() => props.onSelectRelation(edge.id)}
              >
                <td>
                  {edge.sourceDimension}.{edge.sourceKey} {'->'} {edge.targetDimension}.{edge.targetKey}
                </td>
                <td>{edge.joinType}</td>
                <td>{edge.cardinality}</td>
                <td>{edge.status ?? 'active'}</td>
              </tr>
            ))}
            {(props.graph?.edges ?? []).length === 0 ? (
              <tr>
                <td className="semantic-graph-empty" colSpan={4}>
                  No relations yet. Use the controls above or drag-connect dimension nodes.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
