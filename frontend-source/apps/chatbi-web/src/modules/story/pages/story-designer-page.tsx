'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  addStoryWidget,
  applyStoryTemplate,
  createStoryShareLink,
  deleteStoryWidget,
  diffStoryVersion,
  duplicateStoryWidget,
  getStoryDesignerState,
  getStoryShareUsage,
  listStoryTemplates,
  patchStoryShareLink,
  patchStoryWidget,
  putStoryCanvas,
  reorderStoryWidgetsBatch,
  restoreStoryVersion,
  revokeStoryShareLink,
  validateStoryWidget,
  type StoryShareUsageSummary,
  type StoryWidget,
  type StoryWidgetType,
  type StoryWidgetValidationIssue
} from '@/modules/story/api'
import { DesignerCanvas } from '@/modules/story/components/designer-canvas'
import { WidgetPropertiesPanel } from '@/modules/story/components/widget-properties-panel'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

const WIDGET_TYPES: StoryWidgetType[] = ['table', 'kpi', 'chart', 'text']

type WidgetFormState = {
  widgetType: StoryWidgetType
  title: string
  textContent: string
  kpiLabel: string
  kpiValue: string
  kpiFormatted: string
  kpiDelta: string
  tableColumns: string
  tableRowsJson: string
  chartPointsJson: string
}

const DEFAULT_FORM_STATE: WidgetFormState = {
  widgetType: 'chart',
  title: '',
  textContent: '',
  kpiLabel: 'KPI',
  kpiValue: '0',
  kpiFormatted: '',
  kpiDelta: '',
  tableColumns: '',
  tableRowsJson: '[]',
  chartPointsJson: '[{"name":"Jan","value":120},{"name":"Feb","value":130}]'
}

export default function StoryDesignerPage() {
  const params = useParams<{ id: string }>()
  const storyId = params.id

  const [status, setStatus] = useState<string | null>(null)
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | undefined>()
  const [widgetForm, setWidgetForm] = useState<WidgetFormState>(DEFAULT_FORM_STATE)
  const [validationIssues, setValidationIssues] = useState<StoryWidgetValidationIssue[]>([])

  const [canvasLayoutMode, setCanvasLayoutMode] = useState('grid')
  const [canvasColumns, setCanvasColumns] = useState('12')
  const [canvasGap, setCanvasGap] = useState('12')
  const [canvasTheme, setCanvasTheme] = useState('default')
  const [canvasText, setCanvasText] = useState('{}')

  const [shareExpiresAt, setShareExpiresAt] = useState('')
  const [usageByLinkId, setUsageByLinkId] = useState<Record<string, StoryShareUsageSummary>>({})

  const [templateStoryId, setTemplateStoryId] = useState('')
  const [templateMode, setTemplateMode] = useState<'append' | 'replace'>('append')

  const [fromVersion, setFromVersion] = useState('')
  const [toVersion, setToVersion] = useState('')
  const [versionDiff, setVersionDiff] = useState<Record<string, unknown> | null>(null)

  const designerStateQuery = useQuery({
    queryKey: ['story-designer-state', storyId],
    enabled: Boolean(storyId),
    queryFn: () => getStoryDesignerState(storyId, { limit: 20, offset: 0 })
  })

  const story = designerStateQuery.data?.story
  const widgets = designerStateQuery.data?.widgets ?? []
  const versions = designerStateQuery.data?.versions?.items ?? []
  const shareLinks = designerStateQuery.data?.shareLinks?.items ?? []

  const templatesQuery = useQuery({
    queryKey: ['story-template-library', story?.modelId],
    enabled: Boolean(story?.modelId),
    queryFn: () => listStoryTemplates(story?.modelId as string, { limit: 100, offset: 0 })
  })

  const templateItems = templatesQuery.data?.items ?? []

  useEffect(() => {
    if (widgets.length === 0) {
      setSelectedWidgetId(undefined)
      return
    }
    if (!selectedWidgetId || !widgets.some(item => item.id === selectedWidgetId)) {
      setSelectedWidgetId(widgets[0]?.id)
    }
  }, [widgets, selectedWidgetId])

  useEffect(() => {
    const canvas = designerStateQuery.data?.canvas?.canvas ?? {}
    setCanvasText(JSON.stringify(canvas, null, 2))
    const layout = asRecord(canvas.layout)
    setCanvasLayoutMode(asString(layout.mode) ?? 'grid')
    setCanvasColumns(String(asNumber(layout.columns, 12)))
    setCanvasGap(String(asNumber(layout.gap, 12)))
    setCanvasTheme(asString(asRecord(canvas.theme).name) ?? 'default')
  }, [designerStateQuery.data?.canvas?.canvas])

  useEffect(() => {
    if (versions.length === 0) {
      setFromVersion('')
      setToVersion('')
      return
    }
    if (!fromVersion) {
      setFromVersion(String(versions[0]?.version ?? ''))
    }
    if (!toVersion && versions[1]) {
      setToVersion(String(versions[1].version))
    }
  }, [versions, fromVersion, toVersion])

  useEffect(() => {
    if (templateStoryId) return
    if (templateItems.length > 0) {
      setTemplateStoryId(String(templateItems[0]?.storyId ?? ''))
    }
  }, [templateItems, templateStoryId])

  const selectedWidget = useMemo(
    () => widgets.find(item => item.id === selectedWidgetId),
    [widgets, selectedWidgetId]
  )

  async function refreshState() {
    await Promise.all([designerStateQuery.refetch(), templatesQuery.refetch()])
  }

  const saveCanvasMutation = useMutation({
    mutationFn: async () =>
      putStoryCanvas(storyId, {
        canvas: {
          layout: {
            mode: canvasLayoutMode,
            columns: asNumber(canvasColumns, 12),
            gap: asNumber(canvasGap, 12)
          },
          theme: {
            name: canvasTheme
          }
        },
        metadata: {
          updatedFrom: 'story_designer_visual_v2'
        }
      }),
    onSuccess: async () => {
      setStatus('Canvas settings saved')
      await refreshState()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Canvas save failed')
    }
  })

  const advancedCanvasMutation = useMutation({
    mutationFn: async () =>
      putStoryCanvas(storyId, {
        canvas: parseObjectJson(canvasText, 'canvas')
      }),
    onSuccess: async () => {
      setStatus('Canvas JSON saved')
      await refreshState()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Canvas JSON save failed')
    }
  })

  const addWidgetMutation = useMutation({
    mutationFn: async () => {
      const payload = buildWidgetPayload(widgetForm)
      return addStoryWidget(storyId, {
        widgetType: widgetForm.widgetType,
        title: widgetForm.title.trim() || undefined,
        payload,
        layout: {
          x: 0,
          y: widgets.length,
          w: 6,
          h: 4
        },
        sortOrder: widgets.length
      })
    },
    onSuccess: async widget => {
      setStatus('Widget added')
      setWidgetForm(prev => ({ ...DEFAULT_FORM_STATE, widgetType: prev.widgetType }))
      setSelectedWidgetId(widget.id)
      await refreshState()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Widget save failed')
    }
  })

  const reorderMutation = useMutation({
    mutationFn: async (items: Array<{ widgetId: string; sortOrder: number }>) =>
      reorderStoryWidgetsBatch(storyId, { items }),
    onSuccess: async payload => {
      if ((payload.summary?.failed ?? 0) > 0) {
        setStatus(`Reordered with ${payload.summary?.failed ?? 0} failed item(s)`)
      } else {
        setStatus('Widget order saved')
      }
      await refreshState()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Reorder failed')
    }
  })

  const saveWidgetMutation = useMutation({
    mutationFn: async (input: {
      widgetId: string
      title?: string
      payload: Record<string, unknown>
      layout: Record<string, unknown>
    }) =>
      patchStoryWidget(storyId, input.widgetId, {
        title: input.title,
        payload: input.payload,
        layout: input.layout
      }),
    onSuccess: async () => {
      setStatus('Widget updated')
      await refreshState()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Widget update failed')
    }
  })

  const validateWidgetMutation = useMutation({
    mutationFn: async (input: {
      widgetType: StoryWidgetType
      payload: Record<string, unknown>
      layout: Record<string, unknown>
    }) => validateStoryWidget(storyId, input),
    onSuccess: result => {
      setValidationIssues(result.issues ?? [])
      setStatus(result.ok ? 'Widget validation passed' : 'Widget validation returned issues')
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Widget validate failed')
    }
  })

  const duplicateWidgetMutation = useMutation({
    mutationFn: async (widgetId: string) =>
      duplicateStoryWidget(storyId, {
        widgetId,
        offset: { x: 1, y: 1 }
      }),
    onSuccess: async widget => {
      setStatus('Widget duplicated')
      setSelectedWidgetId(widget.id)
      await refreshState()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Widget duplicate failed')
    }
  })

  const deleteWidgetMutation = useMutation({
    mutationFn: async (widgetId: string) => deleteStoryWidget(storyId, widgetId),
    onSuccess: async () => {
      setStatus('Widget deleted')
      await refreshState()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Widget delete failed')
    }
  })

  const createShareMutation = useMutation({
    mutationFn: async () =>
      createStoryShareLink(storyId, {
        expiresAt: toIsoFromLocalDateTime(shareExpiresAt),
        options: {
          source: 'story_designer_v2'
        }
      }),
    onSuccess: async link => {
      setStatus(`Share link created (${link.id})`)
      setShareExpiresAt('')
      await refreshState()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Share link create failed')
    }
  })

  const patchShareMutation = useMutation({
    mutationFn: async (input: {
      linkId: string
      status?: 'active' | 'revoked'
      expiresAt?: string | null
    }) =>
      patchStoryShareLink(storyId, input.linkId, {
        status: input.status,
        expiresAt: input.expiresAt
      }),
    onSuccess: async shareLink => {
      setStatus(`Share link updated (${shareLink.status})`)
      await refreshState()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Share link update failed')
    }
  })

  const revokeShareMutation = useMutation({
    mutationFn: async (linkId: string) => revokeStoryShareLink(storyId, linkId),
    onSuccess: async shareLink => {
      setStatus(`Share link revoked (${shareLink.id})`)
      await refreshState()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Share link revoke failed')
    }
  })

  const usageMutation = useMutation({
    mutationFn: async (linkId: string) => getStoryShareUsage(storyId, linkId),
    onSuccess: usage => {
      setUsageByLinkId(current => ({
        ...current,
        [usage.linkId]: usage
      }))
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Share usage query failed')
    }
  })

  const applyTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!templateStoryId) throw new Error('Select template first')
      return applyStoryTemplate(storyId, {
        templateStoryId,
        mode: templateMode
      })
    },
    onSuccess: async result => {
      setStatus(
        `Template applied (${result.mode}), appended=${result.summary.appended}, replaced=${result.summary.replaced}`
      )
      await refreshState()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Template apply failed')
    }
  })

  const diffMutation = useMutation({
    mutationFn: async () => {
      const from = asNumber(fromVersion, 0)
      const to = asNumber(toVersion, 0)
      if (!from || !to) throw new Error('Select versions first')
      return diffStoryVersion(storyId, from, to)
    },
    onSuccess: result => {
      setVersionDiff(result)
      setStatus(`Version diff loaded (${result.changedFields.length} changed field)`)
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Version diff failed')
    }
  })

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const version = asNumber(fromVersion, 0)
      if (!version) throw new Error('Select restore version')
      return restoreStoryVersion(storyId, version)
    },
    onSuccess: async payload => {
      setStatus(`Version restored (${payload.story.latestVersion})`)
      await refreshState()
    },
    onError: error => {
      setStatus(error instanceof Error ? error.message : 'Version restore failed')
    }
  })

  const origin = typeof window === 'undefined' ? '' : window.location.origin

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section style={{ display: 'grid', gap: 16 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Story Designer V2</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link className="badge badge-warn" href={`/project/${storyId}`}>
                Story detail
              </Link>
              <Link className="badge badge-warn" href="/project">
                Stories
              </Link>
            </div>
          </div>
          {story ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-ok">{story.title}</span>
              <span className="badge badge-warn">status: {story.status}</span>
              <span className="badge badge-warn">canvas version: {designerStateQuery.data?.canvas?.version ?? 0}</span>
              <span className="badge badge-ok">widgets: {widgets.length}</span>
            </div>
          ) : null}
          {status ? (
            <span data-testid="story-designer-status" className="badge badge-warn" style={{ width: 'fit-content' }}>
              {status}
            </span>
          ) : null}
        </header>

        <LoadablePanel loading={designerStateQuery.isLoading} error={designerStateQuery.error}>
          <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(250px, 320px) minmax(420px, 1fr) minmax(280px, 360px)' }}>
            <aside style={{ display: 'grid', gap: 12 }}>
              <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
                <strong>Component library</strong>
                <form
                  data-testid="story-designer-widget-form"
                  onSubmit={async (event: FormEvent) => {
                    event.preventDefault()
                    await addWidgetMutation.mutateAsync()
                  }}
                  style={{ display: 'grid', gap: 8 }}
                >
                  <select
                    data-testid="story-designer-widget-type"
                    value={widgetForm.widgetType}
                    onChange={event =>
                      setWidgetForm(current => ({
                        ...current,
                        widgetType: event.target.value as StoryWidgetType
                      }))
                    }
                    style={inputStyle}
                  >
                    {WIDGET_TYPES.map(item => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <input
                    data-testid="story-designer-widget-title"
                    placeholder="Widget title"
                    value={widgetForm.title}
                    onChange={event => setWidgetForm(current => ({ ...current, title: event.target.value }))}
                    style={inputStyle}
                  />
                  {widgetForm.widgetType === 'text' ? (
                    <textarea
                      data-testid="story-designer-widget-text-content"
                      value={widgetForm.textContent}
                      onChange={event => setWidgetForm(current => ({ ...current, textContent: event.target.value }))}
                      rows={4}
                      placeholder="Write your story narrative"
                      style={inputStyle}
                    />
                  ) : null}
                  {widgetForm.widgetType === 'kpi' ? (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <input value={widgetForm.kpiLabel} onChange={event => setWidgetForm(current => ({ ...current, kpiLabel: event.target.value }))} placeholder="Label" style={inputStyle} />
                      <input value={widgetForm.kpiValue} onChange={event => setWidgetForm(current => ({ ...current, kpiValue: event.target.value }))} placeholder="Value" style={inputStyle} />
                    </div>
                  ) : null}
                  {widgetForm.widgetType === 'table' ? (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <input value={widgetForm.tableColumns} onChange={event => setWidgetForm(current => ({ ...current, tableColumns: event.target.value }))} placeholder="columns: product, revenue" style={inputStyle} />
                      <textarea value={widgetForm.tableRowsJson} onChange={event => setWidgetForm(current => ({ ...current, tableRowsJson: event.target.value }))} rows={5} style={{ ...inputStyle, fontFamily: 'var(--font-mono), monospace' }} />
                    </div>
                  ) : null}
                  {widgetForm.widgetType === 'chart' ? (
                    <textarea
                      value={widgetForm.chartPointsJson}
                      onChange={event => setWidgetForm(current => ({ ...current, chartPointsJson: event.target.value }))}
                      rows={5}
                      style={{ ...inputStyle, fontFamily: 'var(--font-mono), monospace' }}
                    />
                  ) : null}
                  <button
                    data-testid="story-designer-widget-add"
                    type="submit"
                    className="badge badge-ok"
                    style={{ border: 'none', cursor: 'pointer', width: 'fit-content' }}
                    disabled={addWidgetMutation.isPending}
                  >
                    {addWidgetMutation.isPending ? 'Saving...' : 'Add widget'}
                  </button>
                </form>
              </section>

              <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
                <strong>Canvas settings</strong>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  Layout mode
                  <select value={canvasLayoutMode} onChange={event => setCanvasLayoutMode(event.target.value)} style={inputStyle}>
                    <option value="grid">grid</option>
                    <option value="narrative">narrative</option>
                  </select>
                </label>
                <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
                  <input value={canvasColumns} onChange={event => setCanvasColumns(event.target.value)} placeholder="columns" style={inputStyle} />
                  <input value={canvasGap} onChange={event => setCanvasGap(event.target.value)} placeholder="gap" style={inputStyle} />
                </div>
                <input value={canvasTheme} onChange={event => setCanvasTheme(event.target.value)} placeholder="theme" style={inputStyle} />
                <button className="badge badge-ok" style={{ border: 'none', cursor: 'pointer', width: 'fit-content' }} onClick={() => saveCanvasMutation.mutate()} type="button">
                  Save settings
                </button>
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Advanced JSON</summary>
                  <textarea
                    data-testid="story-designer-canvas-input"
                    value={canvasText}
                    onChange={event => setCanvasText(event.target.value)}
                    rows={8}
                    style={{ ...inputStyle, fontFamily: 'var(--font-mono), monospace', marginTop: 8 }}
                  />
                  <button className="badge badge-warn" style={{ border: 'none', cursor: 'pointer', marginTop: 8 }} onClick={() => advancedCanvasMutation.mutate()} type="button">
                    Save JSON
                  </button>
                </details>
              </section>
            </aside>

            <section className="card" style={{ padding: 12 }}>
              <DesignerCanvas
                widgets={widgets}
                selectedWidgetId={selectedWidgetId}
                onSelect={setSelectedWidgetId}
                onReorder={async items => {
                  await reorderMutation.mutateAsync(items)
                }}
                onResize={async (widgetId, layout) => {
                  await saveWidgetMutation.mutateAsync({
                    widgetId,
                    title: widgets.find(item => item.id === widgetId)?.title,
                    payload: widgets.find(item => item.id === widgetId)?.payload ?? {},
                    layout
                  })
                }}
                onDuplicate={async widgetId => {
                  await duplicateWidgetMutation.mutateAsync(widgetId)
                }}
                onDelete={async widgetId => {
                  await deleteWidgetMutation.mutateAsync(widgetId)
                }}
              />
            </section>

            <aside style={{ display: 'grid', gap: 12 }}>
              <WidgetPropertiesPanel
                widget={selectedWidget}
                pending={saveWidgetMutation.isPending}
                validating={validateWidgetMutation.isPending}
                issues={validationIssues}
                onSave={async input => {
                  await saveWidgetMutation.mutateAsync(input)
                }}
                onValidate={async input => {
                  await validateWidgetMutation.mutateAsync(input)
                }}
              />

              <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
                <strong>Versions</strong>
                <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
                  <select data-testid="story-designer-version-from" value={fromVersion} onChange={event => setFromVersion(event.target.value)} style={inputStyle}>
                    {versions.map(item => (
                      <option key={`from-${item.id}`} value={item.version}>
                        v{item.version}
                      </option>
                    ))}
                  </select>
                  <select data-testid="story-designer-version-to" value={toVersion} onChange={event => setToVersion(event.target.value)} style={inputStyle}>
                    {versions.map(item => (
                      <option key={`to-${item.id}`} value={item.version}>
                        v{item.version}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button data-testid="story-designer-version-diff" className="badge badge-warn" style={buttonBadgeStyle} onClick={() => diffMutation.mutate()} type="button">
                    Load diff
                  </button>
                  <button data-testid="story-designer-version-restore" className="badge badge-warn" style={buttonBadgeStyle} onClick={() => restoreMutation.mutate()} type="button">
                    Restore from version
                  </button>
                </div>
                {versionDiff ? (
                  <article className="card" style={{ padding: 8, borderRadius: 10 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className="badge badge-ok">added: {Array.isArray((versionDiff as any).added) ? (versionDiff as any).added.length : 0}</span>
                      <span className="badge badge-ok">removed: {Array.isArray((versionDiff as any).removed) ? (versionDiff as any).removed.length : 0}</span>
                      <span className="badge badge-warn">updated: {Array.isArray((versionDiff as any).updated) ? (versionDiff as any).updated.length : 0}</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      changedFields: {Array.isArray((versionDiff as any).changedFields) ? (versionDiff as any).changedFields.join(', ') : '-'}
                    </div>
                  </article>
                ) : null}
              </section>

              <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
                <strong>Template Library</strong>
                <select data-testid="story-designer-template-select" value={templateStoryId} onChange={event => setTemplateStoryId(event.target.value)} style={inputStyle}>
                  {templateItems.map(template => (
                    <option key={template.storyId} value={template.storyId}>
                      {template.title} ({template.status})
                    </option>
                  ))}
                </select>
                <select data-testid="story-designer-template-mode" value={templateMode} onChange={event => setTemplateMode(event.target.value === 'replace' ? 'replace' : 'append')} style={inputStyle}>
                  <option value="append">append</option>
                  <option value="replace">replace</option>
                </select>
                <button
                  data-testid="story-designer-template-apply"
                  className="badge badge-ok"
                  style={buttonBadgeStyle}
                  onClick={() => applyTemplateMutation.mutate()}
                  type="button"
                >
                  Apply template
                </button>
              </section>
            </aside>
          </section>

          <section className="card" style={{ padding: 12, marginTop: 12, display: 'grid', gap: 10 }}>
            <strong>Share links</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="datetime-local"
                data-testid="story-designer-share-expires"
                value={shareExpiresAt}
                onChange={event => setShareExpiresAt(event.target.value)}
                style={inputStyle}
              />
              <button
                data-testid="story-designer-share-create"
                className="badge badge-ok"
                style={buttonBadgeStyle}
                onClick={() => createShareMutation.mutate()}
                type="button"
              >
                Create share link
              </button>
            </div>
            <div data-testid="story-designer-share-list" style={{ display: 'grid', gap: 8 }}>
              {shareLinks.map(link => {
                const publicHref = `${origin}/public/story/${encodeURIComponent(link.token)}`
                const usage = usageByLinkId[link.id]
                return (
                  <article key={link.id} className="card" style={{ padding: 10, borderRadius: 10, display: 'grid', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <strong style={{ fontSize: 13 }}>{link.id}</strong>
                      <span className={link.status === 'active' ? 'badge badge-ok' : 'badge badge-warn'}>{link.status}</span>
                    </div>
                    <a data-testid={`story-designer-share-open-${link.id}`} href={publicHref} target="_blank" rel="noreferrer" className="badge badge-warn" style={{ width: 'fit-content' }}>
                      {publicHref}
                    </a>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        data-testid={`story-designer-share-usage-${link.id}`}
                        type="button"
                        style={buttonBorderStyle}
                        onClick={() => usageMutation.mutate(link.id)}
                      >
                        Load usage
                      </button>
                      <button
                        data-testid={`story-designer-share-renew-${link.id}`}
                        type="button"
                        style={buttonBorderStyle}
                        onClick={() =>
                          patchShareMutation.mutate({
                            linkId: link.id,
                            status: 'active',
                            expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
                          })
                        }
                      >
                        Renew 7d
                      </button>
                      <button
                        data-testid={`story-designer-share-revoke-${link.id}`}
                        type="button"
                        style={buttonBorderStyle}
                        onClick={() => revokeShareMutation.mutate(link.id)}
                      >
                        Revoke
                      </button>
                    </div>
                    {usage ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span className="badge badge-ok">visits: {usage.totalVisits}</span>
                        <span className="badge badge-ok">unique: {usage.uniqueVisitors}</span>
                        <span className="badge badge-warn">last: {usage.lastVisitedAt ?? '-'}</span>
                      </div>
                    ) : null}
                  </article>
                )
              })}
              {shareLinks.length === 0 ? <span style={{ color: 'var(--muted)' }}>No share links yet.</span> : null}
            </div>
          </section>
        </LoadablePanel>
      </section>
    </AccessGuard>
  )
}

function buildWidgetPayload(form: WidgetFormState) {
  if (form.widgetType === 'text') {
    return {
      content: form.textContent.trim()
    }
  }
  if (form.widgetType === 'kpi') {
    return {
      label: form.kpiLabel.trim() || 'KPI',
      value: parseFloatOrFallback(form.kpiValue, 0),
      formatted: form.kpiFormatted.trim() || undefined,
      delta: form.kpiDelta.trim() || undefined
    }
  }
  if (form.widgetType === 'table') {
    const columns = form.tableColumns
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
    const rows = parseArrayJson(form.tableRowsJson)
    return {
      columns,
      rows
    }
  }
  const points = parseArrayJson(form.chartPointsJson)
  return {
    points
  }
}

function parseArrayJson(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseObjectJson(value: string, fieldName: string) {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`Invalid JSON for ${fieldName}`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${fieldName} must be a JSON object`)
  }
  return parsed as Record<string, unknown>
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function asString(value: unknown) {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function asNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) {
    return Math.floor(parsed)
  }
  return fallback
}

function parseFloatOrFallback(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toIsoFromLocalDateTime(value: string) {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }
  return parsed.toISOString()
}

const inputStyle = {
  border: '1px solid var(--line)',
  borderRadius: 10,
  padding: '8px 10px',
  background: '#fff'
}

const buttonBadgeStyle = {
  border: 'none',
  cursor: 'pointer',
  width: 'fit-content'
}

const buttonBorderStyle = {
  border: '1px solid var(--line)',
  borderRadius: 999,
  background: '#fff',
  padding: '4px 10px',
  cursor: 'pointer'
}
