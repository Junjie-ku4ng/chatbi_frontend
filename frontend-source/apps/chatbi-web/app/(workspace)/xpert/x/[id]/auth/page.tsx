'use client'

import { useParams } from 'next/navigation'
import { XpertExpertAuthCard, XpertExpertDetailShell } from '@/modules/xpert/expert-detail'

export default function XpertExpertAuthPage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertExpertDetailShell
      expertId={params.id}
      activeTab="auth"
      title="Expert Auth"
      summary="Read-only policy view for authentication mode and model-scope permissions."
      routeTruthLabel="read-only policy view"
    >
      <XpertExpertAuthCard />
    </XpertExpertDetailShell>
  )
}
