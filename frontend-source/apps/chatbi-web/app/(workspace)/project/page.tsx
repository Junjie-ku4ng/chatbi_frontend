import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import StoriesPage from '@/modules/story/pages/stories-page'

export default function ProjectPage() {
  return (
    <BiCanonicalShell
      activeTab="project"
      title="Project"
      description="Canonical BI project home mapped to story and indicator collaboration surfaces."
    >
      <BiCanonicalPanel
        testId="bi-project-home"
        title="Project Storyboard"
        description="Canonical /project now runs the live story workspace module."
      >
        <div className="bi-canonical-kpi-strip">
          <article className="bi-canonical-kpi-tile">
            <span>Story Designer</span>
            <strong>Online</strong>
          </article>
          <article className="bi-canonical-kpi-tile">
            <span>Version Recovery</span>
            <strong>Tracked</strong>
          </article>
          <article className="bi-canonical-kpi-tile">
            <span>Indicator Relay</span>
            <strong>Ready</strong>
          </article>
        </div>
        <div className="bi-canonical-highlight-grid">
          <article className="bi-canonical-highlight-card">
            <strong>Story Flow</strong>
            <span>Keep narrative design and governance checkpoints aligned.</span>
          </article>
          <article className="bi-canonical-highlight-card">
            <strong>Indicator Collab</strong>
            <span>Jump directly into approvals and register operations for each project.</span>
          </article>
        </div>
        <div className="bi-canonical-quick-links bi-canonical-quick-links-project">
          <Link href="/project" className="badge badge-ok">
            Open Story Workspace
          </Link>
          <Link href="/project/indicators" className="badge badge-ok">
            Open Project Indicators
          </Link>
          <Link href="/project/indicator" className="badge badge-warn">
            Open Indicator Register
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-project-runtime-frame" className="bi-canonical-runtime-frame">
        <section data-testid="bi-project-runtime-stories">
          <StoriesPage />
        </section>
      </section>
    </BiCanonicalShell>
  )
}
