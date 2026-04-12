'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getPublicStory } from '@/modules/story/api'
import { StoryWidgetRenderer } from '@/modules/story/components/story-widget-renderer'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

export default function PublicStoryPage() {
  const params = useParams<{ token: string }>()
  const token = params.token

  const query = useQuery({
    queryKey: ['public-story', token],
    enabled: Boolean(token),
    queryFn: () => getPublicStory(token)
  })

  const payload = query.data
  const story = payload?.story
  const canvas = payload?.canvas

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 20, display: 'grid', gap: 16 }}>
      <header className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
        <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 26 }}>Public Story Token View</strong>
        <span className="badge badge-ok" style={{ width: 'fit-content' }}>
          Shared Story
        </span>
        <Link href="/public" className="badge badge-warn" style={{ width: 'fit-content' }}>
          Back to public hub
        </Link>
      </header>

      <LoadablePanel loading={query.isLoading} error={query.error} empty={!story} emptyLabel="Story unavailable">
        <section className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
          <h1 style={{ margin: 0 }}>{story?.title}</h1>
          {story?.summary ? <p style={{ margin: 0 }}>{story.summary}</p> : null}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-ok">items: {story?.items?.length ?? 0}</span>
            <span className="badge badge-warn">version: {story?.latestVersion ?? 0}</span>
            <span className="badge badge-warn">canvas version: {canvas?.version ?? 0}</span>
          </div>
        </section>

        <section className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
          <strong>Widgets</strong>
          {(canvas?.widgets ?? []).map(widget => (
            <article key={widget.id} className="card" style={{ padding: 10, display: 'grid', gap: 6, background: '#fff' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="badge badge-ok">{widget.widgetType}</span>
                <span>{widget.title ?? '(untitled)'}</span>
              </div>
              <StoryWidgetRenderer widget={widget} />
            </article>
          ))}
        </section>
      </LoadablePanel>
    </main>
  )
}
