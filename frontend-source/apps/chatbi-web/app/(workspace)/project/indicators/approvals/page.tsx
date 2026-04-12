import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import IndicatorOpsPage from '@/modules/governance/pages/indicator-ops-page'

export default function ProjectIndicatorsApprovalsPage() {
  return (
    <BiCanonicalShell
      activeTab="project-indicators"
      title="Project Indicator Approvals"
      description="Canonical approvals branch for project indicators."
    >
      <BiCanonicalPanel
        testId="bi-project-indicators-approvals"
        title="Approvals"
        description="This route runs the live indicator approval queue and history workflow."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/project/indicators" className="badge badge-ok">
            Back To Indicators
          </Link>
          <Link href="/project/indicator" className="badge badge-ok">
            Open Register
          </Link>
          <Link href="/indicator-app" className="badge badge-warn">
            Open Indicator App
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-project-indicators-approvals-runtime">
        <IndicatorOpsPage />
      </section>
    </BiCanonicalShell>
  )
}
