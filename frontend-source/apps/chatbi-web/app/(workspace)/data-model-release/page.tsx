import DataModelReleasePage from '@/modules/data-model-release/page'

export default async function DataModelReleaseWorkbenchRoute({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolved = (await searchParams) ?? {}
  const dataSourceId = typeof resolved.dataSourceId === 'string' ? resolved.dataSourceId : undefined
  const draftId = typeof resolved.draftId === 'string' ? resolved.draftId : undefined
  const modelId = typeof resolved.modelId === 'string' ? resolved.modelId : undefined
  const deploymentId = typeof resolved.deploymentId === 'string' ? resolved.deploymentId : undefined

  return <DataModelReleasePage dataSourceId={dataSourceId} draftId={draftId} modelId={modelId} deploymentId={deploymentId} />
}
