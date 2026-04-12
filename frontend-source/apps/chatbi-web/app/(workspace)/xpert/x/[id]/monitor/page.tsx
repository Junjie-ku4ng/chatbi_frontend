'use client'

import { useParams } from 'next/navigation'
import { XpertExpertDetailShell, XpertExpertMonitorCard } from '@/modules/xpert/expert-detail'

export default function XpertExpertMonitorPage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertExpertDetailShell
      expertId={params.id}
      activeTab="monitor"
      title="Expert Monitor"
      summary="Preview metrics surface for latency, quality, and throughput markers."
      routeTruthLabel="preview metrics surface"
    >
      <XpertExpertMonitorCard />
    </XpertExpertDetailShell>
  )
}
