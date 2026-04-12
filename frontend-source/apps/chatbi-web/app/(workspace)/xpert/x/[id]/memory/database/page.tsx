'use client'

import { useParams } from 'next/navigation'
import { XpertExpertDetailShell, XpertExpertMemoryDatabaseCard } from '@/modules/xpert/expert-detail'

export default function XpertExpertMemoryDatabasePage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertExpertDetailShell
      expertId={params.id}
      activeTab="memory-database"
      title="Expert Memory Database"
      summary="Physical memory persistence and table health."
    >
      <XpertExpertMemoryDatabaseCard />
    </XpertExpertDetailShell>
  )
}
