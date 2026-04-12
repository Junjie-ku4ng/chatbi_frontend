import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import IndicatorContractsPage from '../../indicator-contracts/page'

export default function ProjectIndicatorRegisterPage() {
  return (
    <BiCanonicalShell
      activeTab="project-indicators"
      title="Project Indicator Register"
      description="Canonical project indicator register route aligned with xpert project IA."
    >
      <BiCanonicalPanel
        testId="bi-project-indicator"
        title="Indicator Register"
        description="Project indicator register now runs the live indicator contracts module."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/project/indicators" className="badge badge-ok">
            Back To Indicator Ops
          </Link>
          <Link href="/project/indicators/approvals" className="badge badge-warn">
            Open Approvals
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-project-indicator-runtime">
        <IndicatorContractsPage />
      </section>
    </BiCanonicalShell>
  )
}
