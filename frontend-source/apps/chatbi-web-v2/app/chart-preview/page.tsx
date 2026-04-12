import { ChartAnswerComponent } from '@/modules/chat/components/answer-components/chart-component'

export default function ChartPreviewPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Chart Preview</p>
          <h1 className="text-3xl font-semibold tracking-tight">ECharts preview</h1>
        </header>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <ChartAnswerComponent
            payload={{
              option: {
                tooltip: { trigger: 'axis' },
                xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr'] },
                yAxis: { type: 'value' },
                series: [{ type: 'line', smooth: true, data: [12, 18, 15, 24] }]
              }
            }}
          />
        </section>
      </div>
    </main>
  )
}
