'use client'

import { CSSProperties, memo } from 'react'
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Resizable, ResizeCallback } from 're-resizable'
import { StoryWidget } from '@/modules/story/api'
import { StoryWidgetRenderer } from '@/modules/story/components/story-widget-renderer'
import { compareSortOrderThenId } from '@/modules/story/sorting'

type DesignerCanvasProps = {
  widgets: StoryWidget[]
  selectedWidgetId?: string
  disabled?: boolean
  onSelect: (widgetId: string) => void
  onReorder: (items: Array<{ widgetId: string; sortOrder: number }>) => Promise<void> | void
  onResize: (widgetId: string, layout: Record<string, unknown>) => Promise<void> | void
  onDuplicate?: (widgetId: string) => Promise<void> | void
  onDelete?: (widgetId: string) => Promise<void> | void
}

const CARD_MIN_WIDTH = 240
const CARD_MIN_HEIGHT = 160
const GRID_W = 70
const GRID_H = 60

export const DesignerCanvas = memo(function DesignerCanvas({
  widgets,
  selectedWidgetId,
  disabled,
  onSelect,
  onReorder,
  onResize,
  onDuplicate,
  onDelete
}: DesignerCanvasProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const sortedWidgets = [...widgets].sort(compareSortOrderThenId)

  async function handleDragEnd(event: DragEndEvent) {
    if (disabled) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sortedWidgets.findIndex(item => item.id === String(active.id))
    const newIndex = sortedWidgets.findIndex(item => item.id === String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(sortedWidgets, oldIndex, newIndex)
    await onReorder(
      reordered.map((item, index) => ({
        widgetId: item.id,
        sortOrder: index
      }))
    )
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <strong>Canvas</strong>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedWidgets.map(item => item.id)} strategy={rectSortingStrategy}>
          <div data-testid="story-designer-widget-list" style={{ display: 'grid', gap: 10 }}>
            {sortedWidgets.map(widget => (
              <SortableWidgetCard
                key={widget.id}
                widget={widget}
                selected={widget.id === selectedWidgetId}
                disabled={Boolean(disabled)}
                onSelect={onSelect}
                onResize={onResize}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {sortedWidgets.length === 0 ? (
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>No widget in canvas yet. Add one from the component library.</span>
      ) : null}
    </div>
  )
})

type SortableWidgetCardProps = {
  widget: StoryWidget
  selected: boolean
  disabled: boolean
  onSelect: (widgetId: string) => void
  onResize: (widgetId: string, layout: Record<string, unknown>) => Promise<void> | void
  onDuplicate?: (widgetId: string) => Promise<void> | void
  onDelete?: (widgetId: string) => Promise<void> | void
}

function SortableWidgetCard({
  widget,
  selected,
  disabled,
  onSelect,
  onResize,
  onDuplicate,
  onDelete
}: SortableWidgetCardProps) {
  const sortable = useSortable({
    id: widget.id,
    disabled
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    border: selected ? '2px solid var(--ok-bg)' : '1px solid var(--line)',
    borderRadius: 12,
    background: '#fff',
    boxShadow: sortable.isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : undefined
  }
  const layout = widget.layout ?? {}
  const width = Math.max(CARD_MIN_WIDTH, Number(layout.w ?? 6) * GRID_W)
  const height = Math.max(CARD_MIN_HEIGHT, Number(layout.h ?? 4) * GRID_H)

  const handleResizeStop: ResizeCallback = async (_event, _direction, elementRef) => {
    const nextW = Math.max(1, Math.round(elementRef.offsetWidth / GRID_W))
    const nextH = Math.max(1, Math.round(elementRef.offsetHeight / GRID_H))
    await onResize(widget.id, {
      ...layout,
      w: nextW,
      h: nextH
    })
  }

  return (
    <article
      ref={sortable.setNodeRef}
      style={style}
      data-testid={`story-designer-widget-card-${widget.id}`}
      onClick={() => onSelect(widget.id)}
    >
      <header
        {...sortable.attributes}
        {...sortable.listeners}
        data-testid={`story-designer-widget-handle-${widget.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '8px 10px',
          borderBottom: '1px solid var(--line)',
          cursor: disabled ? 'default' : 'grab'
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge badge-ok">{widget.widgetType}</span>
          <strong style={{ fontSize: 13 }}>{widget.title ?? widget.widgetKey}</strong>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            data-testid={`story-designer-widget-duplicate-${widget.id}`}
            onClick={event => {
              event.stopPropagation()
              void onDuplicate?.(widget.id)
            }}
            style={iconButtonStyle}
          >
            Duplicate
          </button>
          <button
            type="button"
            data-testid={`story-designer-widget-delete-${widget.id}`}
            onClick={event => {
              event.stopPropagation()
              void onDelete?.(widget.id)
            }}
            style={iconButtonStyle}
          >
            Delete
          </button>
        </div>
      </header>
      <Resizable
        size={{ width, height }}
        minWidth={CARD_MIN_WIDTH}
        minHeight={CARD_MIN_HEIGHT}
        enable={{ right: true, bottom: true, bottomRight: true }}
        onResizeStop={handleResizeStop}
      >
        <div style={{ padding: 10, height: '100%', overflow: 'auto' }}>
          <StoryWidgetRenderer widget={widget} />
        </div>
      </Resizable>
    </article>
  )
}

const iconButtonStyle: CSSProperties = {
  border: '1px solid var(--line)',
  borderRadius: 999,
  background: '#fff',
  padding: '2px 8px',
  fontSize: 12,
  cursor: 'pointer'
}
