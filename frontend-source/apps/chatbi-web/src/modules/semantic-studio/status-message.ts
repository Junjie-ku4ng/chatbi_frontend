const PUBLISH_STATUS_KEYWORDS = /\b(publish|blocked|failed|succeeded)\b/i

export function formatPublishErrorStatus(error: unknown) {
  const fallback = 'Publish failed'
  if (!(error instanceof Error)) {
    return fallback
  }
  const message = error.message.trim()
  if (!message) {
    return fallback
  }
  if (PUBLISH_STATUS_KEYWORDS.test(message)) {
    return message
  }
  return `${fallback}: ${message}`
}
