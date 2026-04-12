import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import SemanticModelDetailPage from '@/modules/governance/pages/semantic-model-detail-page'

type ModelsDetailPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function ModelsDetailPage({ params }: ModelsDetailPageProps) {
  const { id } = await params

  return (
    <BiCanonicalShell
      activeTab="models"
      title="Model Detail"
      description="Canonical model detail route with compatibility adapters for existing semantic modules."
    >
      <BiCanonicalPanel
        testId="bi-models-detail"
        title={`Model ${id}`}
        description="Canonical model route now runs the full semantic detail runtime module."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href={`/models/${encodeURIComponent(id)}`} className="badge badge-ok">
            Open Model Detail
          </Link>
          <Link href={`/models/${encodeURIComponent(id)}/impact`} className="badge badge-warn">
            Open Impact
          </Link>
          <Link href={`/semantic-studio/${encodeURIComponent(id)}`} className="badge badge-ok">
            Open Semantic Studio
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-models-runtime-detail">
        <SemanticModelDetailPage />
      </section>
    </BiCanonicalShell>
  )
}
