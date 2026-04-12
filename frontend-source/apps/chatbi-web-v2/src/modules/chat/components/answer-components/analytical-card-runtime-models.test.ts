import { describe, expect, it } from 'vitest'
import { getAnalyticalCardRuntimeModelKey } from './analytical-card-runtime-models'

describe('getAnalyticalCardRuntimeModelKey', () => {
  it('falls back to model key when id is unavailable', () => {
    expect(
      getAnalyticalCardRuntimeModelKey({
        key: 'semantic-model-key',
        name: 'Semantic Model Name'
      } as any)
    ).toBe('semantic-model-key')
  })

  it('falls back to model name when both id and key are unavailable', () => {
    expect(
      getAnalyticalCardRuntimeModelKey({
        name: 'Semantic Model Name'
      } as any)
    ).toBe('Semantic Model Name')
  })
})
