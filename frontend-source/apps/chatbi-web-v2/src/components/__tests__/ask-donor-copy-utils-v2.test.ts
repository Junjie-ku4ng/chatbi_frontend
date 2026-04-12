// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copyDonorAnswerV2 } from '../ask-donor-copy-utils-v2'

const writeTextMock = vi.fn()

beforeEach(() => {
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: writeTextMock
    }
  })
  Object.defineProperty(globalThis, 'ClipboardItem', {
    configurable: true,
    value: undefined
  })
  writeTextMock.mockReset()
  writeTextMock.mockResolvedValue(undefined)
})

describe('copyDonorAnswerV2', () => {
  it('copies plain text through the clipboard fallback when rich clipboard is unavailable', async () => {
    await copyDonorAnswerV2({
      text: 'Revenue is up 12% month over month.',
      html: '<p>Revenue is up 12% month over month.</p>'
    })

    expect(writeTextMock).toHaveBeenCalledWith('Revenue is up 12% month over month.')
  })
})
