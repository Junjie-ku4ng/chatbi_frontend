'use client'

type GraphV2ToolbarProps = {
  dimensions: Array<{ id: string; key: string; label: string }>
  sourceDimension: string
  targetDimension: string
  neighborCenterNodeKey: string
  busy: boolean
  hasMore: boolean
  onSourceDimensionChange: (value: string) => void
  onTargetDimensionChange: (value: string) => void
  onNeighborCenterChange: (value: string) => void
  onCreateDraft: () => void
  onLoadMore: () => void
  onExpandNeighbors: () => void
}

export function GraphV2Toolbar(props: GraphV2ToolbarProps) {
  return (
    <section className="semantic-graph-toolbar">
      <div className="semantic-graph-toolbar-row">
        <select
          data-testid="semantic-graph-source-dimension"
          aria-label="Graph source dimension"
          value={props.sourceDimension}
          onChange={event => props.onSourceDimensionChange(event.target.value)}
          className="semantic-graph-toolbar-select"
        >
          <option value="">Source dimension</option>
          {props.dimensions.map(node => (
            <option key={`source-${node.id}`} value={node.key}>
              {node.label}
            </option>
          ))}
        </select>
        <select
          data-testid="semantic-graph-target-dimension"
          aria-label="Graph target dimension"
          value={props.targetDimension}
          onChange={event => props.onTargetDimensionChange(event.target.value)}
          className="semantic-graph-toolbar-select"
        >
          <option value="">Target dimension</option>
          {props.dimensions.map(node => (
            <option key={`target-${node.id}`} value={node.key}>
              {node.label}
            </option>
          ))}
        </select>
        <button
          data-testid="semantic-graph-create-relation"
          type="button"
          className="badge badge-ok semantic-graph-toolbar-action"
          disabled={props.busy || !props.sourceDimension || !props.targetDimension}
          onClick={props.onCreateDraft}
        >
          Create relation draft
        </button>
      </div>

      <div className="semantic-graph-toolbar-row">
        <select
          data-testid="semantic-graph-neighbor-center"
          aria-label="Graph neighbor center"
          value={props.neighborCenterNodeKey}
          onChange={event => props.onNeighborCenterChange(event.target.value)}
          className="semantic-graph-toolbar-select semantic-graph-toolbar-select-wide"
        >
          <option value="">Neighbor center</option>
          {props.dimensions.map(node => (
            <option key={`neighbor-${node.id}`} value={node.key}>
              {node.label}
            </option>
          ))}
        </select>
        <button
          data-testid="semantic-graph-expand-neighbors"
          type="button"
          className="badge badge-warn semantic-graph-toolbar-action"
          disabled={props.busy || !props.neighborCenterNodeKey}
          onClick={props.onExpandNeighbors}
        >
          Expand neighbors
        </button>
        <button
          data-testid="semantic-graph-load-more"
          type="button"
          className="badge badge-warn semantic-graph-toolbar-action"
          disabled={props.busy || !props.hasMore}
          onClick={props.onLoadMore}
        >
          Load more
        </button>
      </div>
    </section>
  )
}
