'use client'

import { useParams } from 'next/navigation'
import { XpertExpertDetailShell, XpertExpertMemoryStoreCard } from '@/modules/xpert/expert-detail'

export default function XpertExpertMemoryStorePage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertExpertDetailShell
      expertId={params.id}
      activeTab="memory-store"
      title="Expert Memory Store"
      summary="Session and preference memory blocks."
    >
      <XpertExpertMemoryStoreCard />
    </XpertExpertDetailShell>
  )
}
