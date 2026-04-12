'use client'

import { useParams } from 'next/navigation'
import { XpertExpertAgentsCard, XpertExpertDetailShell } from '@/modules/xpert/expert-detail'

export default function XpertExpertAgentsPage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertExpertDetailShell
      expertId={params.id}
      activeTab="agents"
      title="Expert Agents"
      summary="Agent orchestration and role assignments."
    >
      <XpertExpertAgentsCard />
    </XpertExpertDetailShell>
  )
}
