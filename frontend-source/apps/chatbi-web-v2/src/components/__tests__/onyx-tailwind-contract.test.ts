import { describe, expect, it } from 'vitest'
// @ts-expect-error local Tailwind config is a JS module in test context.
import tailwindConfig from '../../../tailwind.config.js'

describe('Onyx donor tailwind contract', () => {
  it('includes the donor design tokens required by imported Onyx css', () => {
    const theme = tailwindConfig.theme?.extend

    expect(theme?.borderRadius?.['16']).toBeDefined()
    expect(theme?.borderRadius?.['08']).toBeDefined()
    expect(theme?.colors?.['background-neutral-dark-03']).toBeDefined()
    expect(theme?.colors?.['background-tint-inverted-04']).toBeDefined()
    expect(theme?.colors?.['shadow-01']).toBeDefined()
    expect(theme?.backdropBlur?.['01']).toBeDefined()
  })
})
