import { RuntimeAnalyticalCardPreview } from '@/modules/chat/components/answer-components/runtime-analytical-card-preview'

type RuntimeChartPreviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readSearchParam(input: Record<string, string | string[] | undefined>, key: string) {
  const value = input[key]
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value) && value.length > 0) {
    return value[0]
  }
  return undefined
}

export default async function RuntimeChartPreviewPage(props: RuntimeChartPreviewPageProps) {
  const searchParams = await props.searchParams
  const modelId = readSearchParam(searchParams, 'modelId')

  if (!modelId) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-3xl rounded-3xl border border-dashed border-slate-300 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
            Runtime AnalyticalCard Preview
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Missing `modelId`</h1>
          <p className="mt-3 text-sm text-slate-600">
            Open this route with a live semantic model id, for example
            {' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">
              /chart-runtime-preview?modelId=&lt;semantic-model-id&gt;
            </code>
            .
          </p>
        </div>
      </main>
    )
  }

  return (
    <RuntimeAnalyticalCardPreview
      cube={readSearchParam(searchParams, 'cube')}
      measure={readSearchParam(searchParams, 'measure')}
      modelId={modelId}
      slicerDimension={readSearchParam(searchParams, 'slicerDimension')}
      timeDimension={readSearchParam(searchParams, 'timeDimension')}
      timeHierarchy={readSearchParam(searchParams, 'timeHierarchy')}
      timeLevel={readSearchParam(searchParams, 'timeLevel')}
      title={readSearchParam(searchParams, 'title')}
      xpertId={readSearchParam(searchParams, 'xpertId')}
    />
  )
}
