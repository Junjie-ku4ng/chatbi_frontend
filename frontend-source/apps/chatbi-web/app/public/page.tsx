import Link from 'next/link'

export default function PublicHomePage() {
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 20, display: 'grid', gap: 16 }}>
      <section className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <strong data-testid="public-home-title" style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 26 }}>
          Public Sharing Hub
        </strong>
        <span style={{ color: 'var(--muted)' }}>
          Open public story links and onboarding entry pages without workspace navigation.
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link data-testid="public-home-open-demo-story" href="/public/story/token-demo" className="badge badge-ok">
            Open demo shared story
          </Link>
          <Link href="/onboarding" className="badge badge-warn">
            Open onboarding
          </Link>
        </div>
      </section>
    </main>
  )
}
