'use client'

export interface Step {
  value: unknown
  label: string
  active?: boolean
}

function updateActiveSteps(steps: Step[], step: Step) {
  let index = steps.indexOf(step)
  if (step.active && !steps[index + 1]?.active) {
    index -= 1
  }

  return steps.map((value, currentIndex) => ({
    ...value,
    active: currentIndex <= index
  }))
}

export function ReactBreadcrumbBar({
  close,
  disabled = false,
  selectedChange,
  steps
}: {
  steps: Step[]
  disabled?: boolean
  selectedChange: (steps: Step[]) => void
  close: () => void
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 ${disabled ? 'opacity-60' : ''}`}
      data-testid="react-breadcrumb-bar"
    >
      <nav className="flex flex-1 flex-wrap items-center gap-2" aria-label="Drill breadcrumbs">
        {steps.map((step, index) => (
          <button
            key={`${step.label}-${index}`}
            className={
              step.active
                ? 'rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-medium text-white'
                : 'rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600'
            }
            data-testid={`react-breadcrumb-step-${index}`}
            disabled={disabled}
            onClick={() => {
              selectedChange(updateActiveSteps(steps, step).filter(value => value.active))
            }}
            type="button"
          >
            {step.label}
          </button>
        ))}
      </nav>
      <button
        className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600"
        data-testid="react-breadcrumb-close"
        disabled={disabled}
        onClick={close}
        type="button"
      >
        Close
      </button>
    </div>
  )
}
