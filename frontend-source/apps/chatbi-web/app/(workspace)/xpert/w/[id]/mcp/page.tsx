'use client'

import { useParams } from 'next/navigation'
import { XpertWorkspacePageShell } from '@/modules/xpert/workspace'
import { XpertWorkspaceMcpPanel } from '@/modules/xpert/workspace-tab-content'

export default function XpertWorkspaceMcpPage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertWorkspacePageShell
      workspaceId={params.id}
      title="Workspace MCP"
      summary="Manage MCP integrations and connection metadata."
      activeTab="mcp"
    >
      <XpertWorkspaceMcpPanel workspaceId={params.id} />
    </XpertWorkspacePageShell>
  )
}
