import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import IndicatorOpsPage from '@/modules/governance/pages/indicator-ops-page'

export default function ProjectIndicatorsPage() {
  return (
    <BiCanonicalShell
      activeTab="project-indicators"
      title="Project Indicators"
      description="Canonical project indicator branch preserving xpert route semantics."
    >
      <BiCanonicalPanel
        testId="bi-project-indicators"
        title="Indicator Governance"
        description="Canonical project indicators route now runs live indicator operations workflows."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/project/indicators/approvals" className="badge badge-ok">
            Open Approvals
          </Link>
          <Link href="/project/indicator" className="badge badge-ok">
            Open Indicator Register
          </Link>
          <Link href="/indicator-app" className="badge badge-warn">
            Open Indicator App
          </Link>
          <Link href="/indicator-contracts" className="badge badge-warn">
            Open Indicator Contracts
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-project-runtime-indicators">
        <IndicatorOpsPage />
      </section>
    </BiCanonicalShell>
  )
}
