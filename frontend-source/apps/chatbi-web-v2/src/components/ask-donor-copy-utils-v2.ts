'use client'

import type { ClipboardEvent, RefObject } from 'react'

export function handleDonorMarkdownCopy(
  event: ClipboardEvent<HTMLDivElement>,
  markdownRef: RefObject<HTMLDivElement | null>
) {
  const selection = window.getSelection()
  if (!selection?.rangeCount) {
    return
  }

  const range = selection.getRangeAt(0)
  if (!markdownRef.current || !markdownRef.current.contains(range.commonAncestorContainer)) {
    return
  }

  event.preventDefault()

  const fragment = range.cloneContents()
  const tempDiv = document.createElement('div')
  tempDiv.appendChild(fragment)

  event.clipboardData.setData('text/html', tempDiv.innerHTML)
  event.clipboardData.setData('text/plain', selection.toString())
}

export async function copyDonorAnswerV2({
  text,
  html
}: {
  text: string
  html?: string
}) {
  const normalizedText = text.trim()
  if (!normalizedText) {
    return
  }

  if (
    typeof ClipboardItem !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    navigator.clipboard?.write &&
    html?.trim()
  ) {
    const clipboardItem = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([normalizedText], { type: 'text/plain' })
    })
    await navigator.clipboard.write([clipboardItem])
    return
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(normalizedText)
  }
}
