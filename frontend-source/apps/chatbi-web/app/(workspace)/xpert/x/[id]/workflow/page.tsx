'use client'

import { useParams } from 'next/navigation'
import { XpertExpertDetailShell } from '@/modules/xpert/expert-detail'
import { XpertExpertWorkflowStudioCard } from '@/modules/xpert/expert-studio'

export default function XpertExpertWorkflowPage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertExpertDetailShell
      expertId={params.id}
      activeTab="workflow"
      title="Expert Workflow Studio"
      summary="Workflow graph, execution debugging and toolset signal traces."
    >
      <XpertExpertWorkflowStudioCard expertId={params.id} />
    </XpertExpertDetailShell>
  )
}
