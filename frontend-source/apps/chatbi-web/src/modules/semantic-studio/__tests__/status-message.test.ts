import { describe, expect, it } from 'vitest'
import { formatPublishErrorStatus } from '@/modules/semantic-studio/status-message'

describe('semantic publish status message', () => {
  it('prefixes generic backend error with publish failed', () => {
    const result = formatPublishErrorStatus(new Error('Schema version not found'))
    expect(result).toBe('Publish failed: Schema version not found')
  })

  it('keeps publish-related message as-is', () => {
    const result = formatPublishErrorStatus(new Error('Publish blocked: pending approval'))
    expect(result).toBe('Publish blocked: pending approval')
  })

  it('falls back when error is not Error', () => {
    const result = formatPublishErrorStatus(null)
    expect(result).toBe('Publish failed')
  })
})
