import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import SemanticImpactPage from '@/modules/governance/pages/semantic-model-impact-page'

type ModelsImpactPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function ModelsImpactPage({ params }: ModelsImpactPageProps) {
  const { id } = await params

  return (
    <BiCanonicalShell
      activeTab="models"
      title="Model Impact"
      description="Canonical impact route mirrors xpert model impact navigation."
    >
      <BiCanonicalPanel
        testId="bi-models-impact"
        title={`Impact ${id}`}
        description="Canonical impact route now runs the semantic impact analysis module."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href={`/models/${encodeURIComponent(id)}/impact`} className="badge badge-warn">
            Open Model Impact
          </Link>
          <Link href={`/models/${encodeURIComponent(id)}`} className="badge badge-ok">
            Back To Model Detail
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-models-runtime-impact">
        <SemanticImpactPage />
      </section>
    </BiCanonicalShell>
  )
}
