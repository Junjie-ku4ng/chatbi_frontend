'use client'

import { useParams } from 'next/navigation'
import { XpertExpertDetailShell, XpertExpertLogsCard } from '@/modules/xpert/expert-detail'

export default function XpertExpertLogsPage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertExpertDetailShell
      expertId={params.id}
      activeTab="logs"
      title="Expert Logs"
      summary="Execution stream and trace-level events."
    >
      <XpertExpertLogsCard />
    </XpertExpertDetailShell>
  )
}
