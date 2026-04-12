'use client'

import { useParams } from 'next/navigation'
import { XpertExpertCopilotTestingCard, XpertExpertDetailShell } from '@/modules/xpert/expert-detail'

export default function XpertExpertCopilotTestingPage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertExpertDetailShell
      expertId={params.id}
      activeTab="copilot-testing"
      title="Expert Copilot Testing"
      summary="Replay suites and evaluate copilot quality."
    >
      <XpertExpertCopilotTestingCard />
    </XpertExpertDetailShell>
  )
}
