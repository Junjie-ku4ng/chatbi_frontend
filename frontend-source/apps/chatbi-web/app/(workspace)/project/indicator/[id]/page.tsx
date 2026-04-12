import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import IndicatorContractDetailPage from '../../../indicator-contracts/[id]/page'

type ProjectIndicatorDetailPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function ProjectIndicatorDetailPage({ params }: ProjectIndicatorDetailPageProps) {
  const { id } = await params

  return (
    <BiCanonicalShell
      activeTab="project-indicators"
      title="Project Indicator Detail"
      description="Canonical project indicator detail route aligned to xpert indicator register detail."
    >
      <BiCanonicalPanel
        testId="bi-project-indicator-detail"
        title={`Indicator ${id}`}
        description="Indicator detail now runs the live contract presentation and compatibility diff module."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/project/indicator" className="badge badge-ok">
            Back To Register
          </Link>
          <Link href={`/indicator-contracts/${encodeURIComponent(id)}`} className="badge badge-warn">
            Open Legacy Detail
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-project-indicator-detail-runtime">
        <IndicatorContractDetailPage />
      </section>
    </BiCanonicalShell>
  )
}
