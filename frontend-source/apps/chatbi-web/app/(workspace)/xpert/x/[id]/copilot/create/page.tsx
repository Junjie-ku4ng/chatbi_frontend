'use client'

import { useParams } from 'next/navigation'
import { XpertExpertCopilotCreateCard, XpertExpertDetailShell } from '@/modules/xpert/expert-detail'

export default function XpertExpertCopilotCreatePage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertExpertDetailShell
      expertId={params.id}
      activeTab="copilot-create"
      title="Expert Copilot Create"
      summary="Preview drafting surface; publish handoff stays on the primary copilot workflow."
      routeTruthLabel="preview-only authoring surface"
    >
      <XpertExpertCopilotCreateCard expertId={params.id} />
    </XpertExpertDetailShell>
  )
}
