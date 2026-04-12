'use client'

import { useParams } from 'next/navigation'
import { XpertExpertCopilotDetailCard, XpertExpertDetailShell } from '@/modules/xpert/expert-detail'

export default function XpertExpertCopilotDetailPage() {
  const params = useParams<{ id: string; copilotId: string }>()

  return (
    <XpertExpertDetailShell
      expertId={params.id}
      activeTab="copilot-testing"
      title="Expert Copilot Detail"
      summary="Inspect one copilot version and lineage."
    >
      <XpertExpertCopilotDetailCard copilotId={params.copilotId} />
    </XpertExpertDetailShell>
  )
}
