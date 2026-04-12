'use client'

import type { ClipboardEventHandler, ReactNode, RefObject } from 'react'

export function DonorFinalAnswerShellV2({
  children,
  markdownRef,
  finalAnswerRef,
  onCopy
}: {
  children: ReactNode
  markdownRef?: RefObject<HTMLDivElement | null>
  finalAnswerRef?: RefObject<HTMLDivElement | null>
  onCopy?: ClipboardEventHandler<HTMLDivElement>
}) {
  return (
    <div
      ref={markdownRef}
      className="onyx-donor-final-answer-shell-surface overflow-x-visible focus:outline-none select-text cursor-text px-3"
      data-testid="onyx-donor-final-answer-shell"
      onCopy={onCopy}
    >
      <div data-testid="onyx-donor-markdown-ref">
        <div data-testid="onyx-donor-markdown-root">
          <section className="flex flex-col gap-3" data-testid="onyx-final-answer">
            <div ref={finalAnswerRef} data-testid="onyx-donor-final-answer-ref" className="flex flex-col gap-3">
              <div data-testid="onyx-donor-final-answer-body" className="onyx-donor-final-answer-body flex flex-col gap-3">
                <div
                  data-testid="onyx-donor-final-answer-content-stack"
                  className="onyx-donor-final-answer-content-stack flex flex-col gap-3"
                >
                  <div className="flex flex-col gap-3" data-testid="onyx-donor-final-answer-stack">
                    {children}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
