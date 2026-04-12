import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import SemanticModelsPage from '@/modules/governance/pages/semantic-models-page'

export default function ModelsPage() {
  return (
    <BiCanonicalShell
      activeTab="models"
      title="Models"
      description="Canonical semantic model route aligned to xpert menu (`/models`)."
    >
      <BiCanonicalPanel
        testId="bi-models-home"
        title="Model Governance"
        description="Canonical /models now runs the semantic governance queue and workflows directly."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/models" className="badge badge-ok">
            Open Model Governance
          </Link>
          <Link href="/semantic-studio" className="badge badge-ok">
            Open Semantic Studio
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-models-runtime-governance">
        <SemanticModelsPage />
      </section>
    </BiCanonicalShell>
  )
}
