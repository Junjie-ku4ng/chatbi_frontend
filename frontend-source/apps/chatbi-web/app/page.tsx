import Link from 'next/link'

const links = [
  { href: '/login', label: 'Login', desc: 'Sign in with machine identity session' },
  { href: '/chat', label: 'Ask Workspace', desc: 'Conversational analytics with streaming answers' },
  { href: '/models', label: 'Semantic Governance', desc: 'Workflow, impact and publish gates' },
  { href: '/indicator-contracts', label: 'Indicator Governance', desc: 'Contracts, diff and compatibility checks' },
  { href: '/ai/providers', label: 'AI Governance', desc: 'Providers, bindings, credentials and quotas' },
  { href: '/toolset/actions', label: 'Toolset Governance', desc: 'Actions, plugins, scenarios and learning traces' },
  { href: '/dashboard', label: 'Insights', desc: 'Persisted findings and collaboration history' },
  { href: '/collections', label: 'Collections', desc: 'Curated insight bundles for teams' },
  { href: '/ops', label: 'Ops', desc: 'SLA, drift and alert operations dashboards' }
]

export default function HomePage() {
  return (
    <main className="shell">
      <section className="card" style={{ padding: 28 }}>
        <div style={{ display: 'grid', gap: 18 }}>
          <div>
            <span className="badge badge-ok">PA Engine Ready</span>
            <h1 style={{ margin: '12px 0 8px', fontFamily: 'var(--font-title), sans-serif', fontSize: 42 }}>
              ChatBI Product Workspace
            </h1>
            <p style={{ margin: 0, color: 'var(--muted)', maxWidth: 760 }}>
              Use the modules below to run ask flows, capture insights, and operate the governance layer.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))'
            }}
          >
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="card"
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: 'linear-gradient(160deg,#fffaf1,#f4f8ff)'
                }}
              >
                <strong style={{ display: 'block', fontFamily: 'var(--font-title), sans-serif' }}>{link.label}</strong>
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>{link.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
