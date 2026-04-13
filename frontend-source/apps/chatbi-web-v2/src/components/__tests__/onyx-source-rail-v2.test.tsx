// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { OnyxSourceRailV2 } from '../onyx/onyx-source-rail-v2'
import { resetChatRuntimeStore, useChatRuntimeStore } from '@/modules/chat/runtime/chat-runtime-store'
import { resetChatSourceRailStore, useChatSourceRailStore } from '@/modules/chat/runtime/chat-source-rail-store'

type MountedRoot = {
  container: HTMLDivElement
  root: Root
}

const mountedRoots: MountedRoot[] = []

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop()
    if (!mounted) continue
    act(() => {
      mounted.root.unmount()
    })
    mounted.container.remove()
  }

  resetChatRuntimeStore()
  resetChatSourceRailStore()
})

async function renderRail(
  items: Array<{
    id: string
    title: string
    body: string
    eyebrow?: string
    meta?: string
    kind?: 'document' | 'mail' | 'chat' | 'insight' | 'search'
  }> = [
    {
      id: 'fallback-session',
      title: '会话记录',
      body: '备用工作区卡片'
    }
  ]
) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.push({ container, root })

  await act(async () => {
    root.render(
      <OnyxSourceRailV2 items={items} />
    )
    await Promise.resolve()
  })

  return container
}

describe('OnyxSourceRailV2', () => {
  it('prefers runtime-derived source cards over fallback workspace placeholders', async () => {
    useChatRuntimeStore.setState(state => ({
      ...state,
      lastDone: {
        artifacts: [
          {
            kind: 'result_set',
            cube: 'Finance',
            visualType: 'trend',
            rowCount: 2,
            colCount: 1,
            queryLogId: 'query-log-1'
          },
          {
            kind: 'query_reference',
            queryLogId: 'query-log-1',
            traceKey: 'trace-1',
            warningCount: 1
          }
        ],
        meta: {
          queryLogId: 'query-log-1',
          traceKey: 'trace-1'
        }
      }
    }))

    const container = await renderRail()
    const rail = container.querySelector('[data-testid="onyx-donor-source-rail"]')
    const header = container.querySelector('[data-testid="onyx-donor-source-rail-header"]')
    const railShell = container.querySelector('[data-testid="onyx-native-donor-source-rail-card"]')
    const railStack = container.querySelector('[data-testid="onyx-native-donor-source-rail-stack"]')
    const headerTitle = container.querySelector('[data-testid="onyx-native-donor-source-rail-title"]')
    const headerArrow = container.querySelector('[data-testid="onyx-native-donor-source-rail-arrow"]')
    const list = container.querySelector('[data-testid="onyx-donor-source-rail-list"]')
    const firstCard = container.querySelector('[data-testid="onyx-source-rail-card"]')
    const firstNativePrimitive = container.querySelector('[data-testid="onyx-native-donor-card"]')
    const firstTitleShell = container.querySelector('[data-testid="onyx-donor-source-card-title-shell"]')
    const firstEyebrowShell = container.querySelector('[data-testid="onyx-donor-source-card-eyebrow-shell"]')
    const firstCopy = container.querySelector('[data-testid="onyx-donor-source-card-copy"]')
    const firstDensityShell = container.querySelector('[data-testid="onyx-donor-source-card-density-shell"]')
    const firstMetaShell = container.querySelector('[data-testid="onyx-donor-source-card-meta-shell"]')
    const firstSummary = container.querySelector('[data-testid="onyx-donor-source-card-summary"]')
    const firstBodyShell = container.querySelector('[data-testid="onyx-donor-source-card-body-shell"]')
    const firstBodyCopy = container.querySelector('[data-testid="onyx-donor-source-card-body-copy"]')

    expect(rail?.className).toContain('onyx-donor-source-rail')
    expect(header?.className).toContain('onyx-donor-source-rail-header')
    expect(railShell?.className).toContain('onyx-native-donor-source-rail-card')
    expect(railStack?.className).toContain('onyx-native-donor-source-rail-stack')
    expect(headerTitle?.className).toContain('onyx-native-donor-source-rail-title')
    expect(headerArrow?.className).toContain('onyx-native-donor-source-rail-arrow')
    expect(headerTitle?.textContent).toBe('回答来源')
    expect(headerArrow?.getAttribute('aria-label')).toBe('隐藏回答来源')
    expect(list?.className).toContain('onyx-donor-source-rail-list')
    expect(firstCard?.className).toContain('onyx-donor-source-card')
    expect(firstCard?.className).toContain('onyx-native-donor-document-card')
    expect(firstNativePrimitive?.className).toContain('onyx-native-donor-card')
    expect(firstTitleShell?.className).toContain('onyx-donor-source-card-title-shell')
    expect(firstEyebrowShell?.className).toContain('onyx-donor-source-card-eyebrow-shell')
    expect(firstCopy?.className).toContain('onyx-donor-source-card-copy')
    expect(firstDensityShell?.className).toContain('onyx-donor-source-card-density-shell')
    expect(firstMetaShell?.className).toContain('onyx-donor-source-card-meta-shell')
    expect(firstSummary?.className).toContain('onyx-donor-source-card-summary')
    expect(firstBodyShell?.className).toContain('onyx-donor-source-card-body-shell')
    expect(firstBodyCopy?.className).toContain('onyx-donor-source-card-body-copy')
    expect(container.textContent).toContain('查询日志引用')
    expect(container.textContent).toContain('Finance 结果集')
    expect(container.textContent).not.toContain('会话记录')
    expect(container.innerHTML).toContain('onyx-native-donor-card')
  })

  it('prefers explicitly selected message sources over the generic runtime rail', async () => {
    useChatRuntimeStore.setState(state => ({
      ...state,
      lastDone: {
        artifacts: [
          {
            kind: 'query_reference',
            queryLogId: 'query-log-1',
            traceKey: 'trace-1'
          }
        ]
      }
    }))
    useChatSourceRailStore.setState({
      selectedMessageId: 'msg-9',
      selectedMessageSources: [
        {
          id: 'doc:selected',
          title: '选中回答来源',
          body: '消息专属来源卡片',
          kind: 'document'
        }
      ]
    })

    const container = await renderRail()

    expect(container.textContent).toContain('选中回答来源')
    expect(container.textContent).not.toContain('查询日志引用')
    expect(container.innerHTML).toContain('data-testid="onyx-native-donor-card"')
    expect(container.innerHTML).toContain('data-testid="onyx-native-donor-source-rail-card"')
    expect(container.innerHTML).toContain('onyx-donor-source-card-title-shell')
    expect(container.innerHTML).toContain('onyx-donor-source-card-copy')
    expect(container.innerHTML).toContain('onyx-donor-source-card-density-shell')
    expect(container.innerHTML).toContain('onyx-donor-source-card-body')
    expect(container.innerHTML).toContain('onyx-donor-source-card-body-shell')
    expect(container.innerHTML).toContain('onyx-donor-source-card-body-copy')
    expect(container.innerHTML).toContain('onyx-donor-source-card-summary')
  })

  it('renders the empty donor source placeholder when no runtime or fallback cards exist', async () => {
    const container = await renderRail([])

    expect(container.textContent).toContain('暂无来源')
    expect(container.textContent).toContain('运行问答后展示来源')
    expect(container.querySelector('[data-testid="onyx-donor-source-rail"]')?.className).toContain('onyx-donor-source-rail')
    expect(container.querySelector('[data-testid="onyx-native-donor-source-rail-card"]')?.className).toContain('onyx-native-donor-source-rail-card')
    expect(container.querySelector('[data-testid="onyx-source-rail-card"]')?.className).toContain('onyx-donor-source-card')
    expect(container.querySelector('[data-testid="onyx-source-rail-card"]')?.className).toContain('onyx-native-donor-document-card')
    expect(container.querySelector('[data-testid="onyx-native-donor-card"]')?.className).toContain('onyx-native-donor-card')
  })

  it('closes the answer source rail from the header action', async () => {
    useChatSourceRailStore.setState({ isRailOpen: true })

    const container = await renderRail()
    const closeButton = container.querySelector('[aria-label="隐藏回答来源"]')

    expect(useChatSourceRailStore.getState().isRailOpen).toBe(true)

    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(useChatSourceRailStore.getState().isRailOpen).toBe(false)
  })
})
