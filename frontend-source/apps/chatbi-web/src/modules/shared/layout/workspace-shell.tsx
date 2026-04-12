'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { logout } from '@/modules/auth/api'
import { frontendPlatformAdapter } from '@/modules/shared/contracts/frontend-platform-adapter'
import { useSessionStore } from '@/modules/auth/session-store'
import { hasAccess } from '@/modules/shared/rbac/access'
import { useRbacCapabilities } from '@/modules/shared/rbac/use-capabilities'
import { useWorkbenchMachine } from '@/modules/shared/workbench/workbench-machine'
import { resolveCanonicalPath } from '../routing/route-parity'
import { isNavItemActive, resolveActiveGroup, workspaceNavGroups } from './workspace-nav'

function resolveAuthMode() {
  return process.env.NEXT_PUBLIC_AUTH_MODE === 'bearer' ? 'bearer' : 'dev_headers'
}

function RailIcon({ id }: { id: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  }

  if (id === 'ask') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M5 8.5c0-2.2 1.8-4 4-4h6c2.2 0 4 1.8 4 4v4c0 2.2-1.8 4-4 4h-4.5L7 19.5v-3c-1.1-.6-2-1.9-2-3.3z" />
        <path {...common} d="M9 10h6M9 13h4" />
      </svg>
    )
  }

  if (id === 'xpert') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="m6 6 12 12M18 6 6 18" />
        <circle {...common} cx="12" cy="12" r="9" />
      </svg>
    )
  }

  if (id === 'settings') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
        <path {...common} d="m19 12 1.5-1-1-2-1.8.2-.9-1.6.9-1.6-2-1-1 1.5h-1.8L12 4l-2 .5v1.8l-1.6.9-1.6-.9-1 2 1.5 1v1.8L4 12l.5 2h1.8l.9 1.6-.9 1.6 2 1 1-1.5h1.8l1 .5 2-.5v-1.8l1.6-.9 1.6.9 1-2-1.5-1Z" />
      </svg>
    )
  }

  if (id === 'governance') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M12 4 4.5 7.5 12 11l7.5-3.5L12 4Z" />
        <path {...common} d="M6 10v4.5c0 2.6 2.7 4.5 6 4.5s6-1.9 6-4.5V10" />
      </svg>
    )
  }

  if (id === 'collaboration') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M9.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM16 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path {...common} d="M4.5 18c0-2.5 2.3-4.5 5-4.5s5 2 5 4.5M12.5 18c.2-1.7 1.7-3 3.5-3s3.3 1.3 3.5 3" />
      </svg>
    )
  }

  if (id === 'bi') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M5 18V8m7 10V5m7 13v-6" />
        <path {...common} d="M3.5 18h17" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path {...common} d="M6 12h12M12 6v12" />
      <circle {...common} cx="12" cy="12" r="9" />
    </svg>
  )
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const authMode = resolveAuthMode()
  const { capabilities } = useRbacCapabilities()
  const session = useSessionStore(state => state.session)
  const clearSession = useSessionStore(state => state.clearSession)
  const activeModelId = useWorkbenchMachine(state => state.activeModelId)
  const activeConversationId = useWorkbenchMachine(state => state.activeConversationId)
  const canonicalPathname = resolveCanonicalPath(pathname)
  const isChatSurface = canonicalPathname === '/chat' || canonicalPathname.startsWith('/chat/')
  const isSettingsSurface = canonicalPathname === '/settings' || canonicalPathname.startsWith('/settings/')
  const isXpertSurface = canonicalPathname === '/explore' || canonicalPathname.startsWith('/xpert/')
  const isStreamlinedSurface = isChatSurface || isSettingsSurface || isXpertSurface

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearSession()
      router.push('/login')
    }
  })

  const visibleGroups = useMemo(
    () =>
      workspaceNavGroups
        .map(group => ({
          ...group,
          items: group.items.filter(item => hasAccess({ scopes: item.scopes }, capabilities))
        }))
        .filter(group => group.items.length > 0),
    [capabilities]
  )

  const visibleItems = useMemo(() => visibleGroups.flatMap(group => group.items), [visibleGroups])
  const railItems = useMemo(
    () =>
      visibleGroups
        .map(group => ({
          id: group.id,
          title: group.title,
          item: group.items[0]
        }))
        .filter(entry => entry.item),
    [visibleGroups]
  )
  const activeItem = visibleItems.find(item => isNavItemActive(canonicalPathname, item))
  const activeGroup = resolveActiveGroup(canonicalPathname, visibleGroups) ?? visibleGroups[0]
  const breadcrumb = useMemo(() => [activeGroup?.title, activeItem?.label].filter(Boolean), [activeGroup?.title, activeItem?.label])
  const buildNavHref = (href: string) => {
    const canonicalHref = resolveCanonicalPath(href)
    if (canonicalHref === '/chat' && activeModelId) {
      return frontendPlatformAdapter.ask.buildHref({
        modelId: activeModelId,
        conversationId: activeConversationId
      })
    }
    return canonicalHref
  }

  return (
    <main className={`workspace-shell ${isChatSurface ? 'is-chat-surface' : ''}`}>
      <aside className="workspace-rail">
        <Link href="/" className="workspace-rail-brand" title="PA Nexus">
          PA
        </Link>

        <nav className="workspace-rail-nav">
          {railItems.map(entry => {
            if (!entry.item) return null
            const active = isNavItemActive(canonicalPathname, entry.item)
            return (
              <Link
                key={entry.id}
                href={buildNavHref(entry.item.href)}
                className={`workspace-rail-item ${active ? 'is-active' : ''}`}
                title={entry.title}
              >
                <span className="workspace-rail-icon">
                  <RailIcon id={entry.id} />
                </span>
                <span className="workspace-rail-label">{entry.title}</span>
              </Link>
            )
          })}
        </nav>

        <div className="workspace-rail-foot">
          {session ? <span className="workspace-rail-session">{session.authenticated ? '在线' : '访客'}</span> : null}
          {authMode === 'bearer' ? (
            <button
              type="button"
              className="workspace-rail-logout"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              退出
            </button>
          ) : null}
        </div>
      </aside>

      <section className="workspace-content">
        {!isStreamlinedSurface ? (
          <header className="workspace-topbar-x">
            <div className="workspace-topbar-x-main">
              <div className="workspace-topbar-x-title">
                <span className="workspace-route-label">{activeItem?.label ?? '工作台'}</span>
                <div className="workspace-breadcrumb">
                  {breadcrumb.map((item, index) => (
                    <span key={`${item}-${index}`} className="workspace-breadcrumb-item">
                      {index === 0 ? item : `/${item}`}
                    </span>
                  ))}
                </div>
              </div>
              <div className="workspace-topbar-x-actions">
                <label htmlFor="workspace-jump" className="workspace-jump-label">
                  页面
                </label>
                <select
                  id="workspace-jump"
                  value={activeItem ? resolveCanonicalPath(activeItem.href) : ''}
                  onChange={event => router.push(buildNavHref(event.target.value))}
                  className="workspace-jump-select"
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  {visibleItems.map(item => (
                    <option key={item.id} value={resolveCanonicalPath(item.href)}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {activeGroup ? (
              <div className="workspace-group-tabs">
                {activeGroup.items.map(item => (
                  <Link
                    key={item.id}
                    href={buildNavHref(item.href)}
                    className={`workspace-group-tab ${isNavItemActive(canonicalPathname, item) ? 'is-active' : ''}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </header>
        ) : null}

        <div className={`workspace-body ${isChatSurface ? 'is-chat-surface' : ''}`}>
          {isStreamlinedSurface ? (
            <select
              id="workspace-jump"
              value={activeItem ? resolveCanonicalPath(activeItem.href) : canonicalPathname}
              onChange={event => router.push(buildNavHref(event.target.value))}
              className="workspace-jump-select workspace-jump-select-hidden"
              aria-hidden="true"
              tabIndex={-1}
            >
              {visibleItems.map(item => (
                <option key={item.id} value={resolveCanonicalPath(item.href)}>
                  {item.label}
                </option>
              ))}
            </select>
          ) : null}
          {isChatSurface && activeGroup ? (
            <div className="workspace-chat-tabs">
              {activeGroup.items.map(item => (
                <Link
                  key={item.id}
                  href={buildNavHref(item.href)}
                  className={`workspace-chat-tab ${isNavItemActive(canonicalPathname, item) ? 'is-active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
          {children}
        </div>
      </section>
    </main>
  )
}
