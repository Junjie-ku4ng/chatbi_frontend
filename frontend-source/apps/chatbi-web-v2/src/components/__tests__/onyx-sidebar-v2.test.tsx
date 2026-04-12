import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { OnyxSidebarV2 } from '../onyx/onyx-sidebar-v2'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement('a', { href, ...props }, children)
}))

describe('OnyxSidebarV2', () => {
  it('renders donor sidebar shell structure in SSR', () => {
    const markup = renderToStaticMarkup(
      <OnyxSidebarV2
        handoff={{
          queryLogId: 'query-demo-01',
          traceKey: 'trace-demo-01'
        }}
      />
    )

    expect(markup).toContain('data-testid="onyx-donor-sidebar-root"')
    expect(markup).toContain('data-testid="onyx-native-donor-sidebar-top-card"')
    expect(markup).toContain('data-testid="onyx-native-donor-sidebar-primary-card"')
    expect(markup).toContain('onyx-donor-sidebar-top')
    expect(markup).toContain('data-testid="onyx-donor-sidebar-primary"')
    expect(markup).toContain('data-testid="onyx-donor-sidebar-nav"')
    expect(markup).toContain('data-testid="onyx-native-donor-sidebar-section-card-智能体"')
    expect(markup).toContain('data-testid="onyx-donor-sidebar-section-header-智能体"')
    expect(markup).toContain('data-testid="onyx-native-donor-sidebar-section-card-项目"')
    expect(markup).toContain('data-testid="onyx-donor-sidebar-section-header-项目"')
    expect(markup).toContain('data-testid="onyx-native-donor-sidebar-section-card-最近"')
    expect(markup).toContain('data-testid="onyx-donor-sidebar-section-header-最近"')
    expect(markup).toContain('搜索会话')
    expect(markup).toContain('创作')
    expect(markup).toContain('探索智能体')
    expect(markup).toContain('新建项目')
    expect(markup).toContain('管理后台')
    expect(markup).toContain('data-testid="onyx-donor-agent-list"')
    expect(markup).toContain('data-testid="onyx-donor-project-list"')
    expect(markup).toContain('data-testid="onyx-native-donor-sidebar-footer-card"')
    expect(markup).toContain('data-testid="onyx-donor-sidebar-footer"')
    expect(markup).toContain('data-testid="onyx-donor-sidebar-account"')
    expect(markup).toContain('data-testid="onyx-donor-session-list"')
  })
})
