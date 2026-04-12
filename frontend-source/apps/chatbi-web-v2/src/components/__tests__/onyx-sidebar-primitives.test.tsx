import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SvgBubbleTextV2 } from '../onyx/icons'
import { OnyxInteractiveContainerV2 } from '../onyx/onyx-interactive-container-v2'
import { OnyxInteractiveStatefulV2 } from '../onyx/onyx-interactive-stateful-v2'
import { OnyxInteractiveStatelessV2 } from '../onyx/onyx-interactive-stateless-v2'
import { OnyxTextV2 } from '../onyx/onyx-text-v2'
import { OnyxButtonV2 } from '../onyx/onyx-button-v2'
import { OnyxSelectButtonV2 } from '../onyx/onyx-select-button-v2'
import { OnyxSidebarTabV2 } from '../onyx/onyx-sidebar-tab-v2'

describe('Onyx sidebar donor primitives', () => {
  it('renders the donor text primitive in SSR', () => {
    expect(() =>
      renderToStaticMarkup(
        <OnyxTextV2 color="text-02" font="main-ui-body">
          Chat
        </OnyxTextV2>,
      ),
    ).not.toThrow()
  })

  it('renders the localized donor button primitive in SSR', () => {
    const markup = renderToStaticMarkup(
      <OnyxButtonV2 href="/chat" icon={SvgBubbleTextV2} prominence="secondary" width="full">
        New Session
      </OnyxButtonV2>,
    )

    expect(markup).toContain('href="/chat"')
    expect(markup).not.toContain('absolute inset-0')
  })

  it('renders the localized donor button primitive without an icon in SSR', () => {
    expect(() =>
      renderToStaticMarkup(
        <OnyxButtonV2 href="/chat" prominence="secondary" width="full">
          New Session
        </OnyxButtonV2>,
      ),
    ).not.toThrow()
  })

  it('forwards aria and data attributes through the donor button primitive in SSR', () => {
    const markup = renderToStaticMarkup(
      <OnyxButtonV2 aria-label="Create session" data-testid="onyx-button-ssr" prominence="secondary" width="full">
        New Session
      </OnyxButtonV2>,
    )

    expect(markup).toContain('aria-label="Create session"')
    expect(markup).toContain('data-testid="onyx-button-ssr"')
  })

  it('renders the donor button primitive with native button attributes in SSR', () => {
    const markup = renderToStaticMarkup(
      <OnyxButtonV2 form="chat-form" name="chat-action" prominence="secondary" width="full">
        New Session
      </OnyxButtonV2>,
    )

    expect(markup).toContain('<button')
    expect(markup).toContain('form="chat-form"')
    expect(markup).toContain('name="chat-action"')
  })

  it('renders the donor button primitive with native anchor attributes in SSR', () => {
    const markup = renderToStaticMarkup(
      <OnyxButtonV2 href="/chat" prominence="secondary" target="_blank" width="full">
        Open Chat
      </OnyxButtonV2>,
    )

    expect(markup).toContain('href="/chat"')
    expect(markup).toContain('target="_blank"')
  })

  it('renders the localized donor sidebar tab primitive in SSR', () => {
    const markup = renderToStaticMarkup(
      <OnyxSidebarTabV2 href="/chat" icon={SvgBubbleTextV2} selected variant="sidebar-light">
        Chat
      </OnyxSidebarTabV2>,
    )

    expect(markup).toContain('group/SidebarTab')
    expect(markup).toContain('flex flex-row items-stretch w-full')
    expect(markup).toContain('flex-1 min-w-0 self-center')
  })

  it('renders the localized donor sidebar tab primitive without an icon in SSR', () => {
    expect(() =>
      renderToStaticMarkup(
        <OnyxSidebarTabV2 href="/chat" selected variant="sidebar-light">
          Chat
        </OnyxSidebarTabV2>,
      ),
    ).not.toThrow()
  })

  it('renders the localized donor select button primitive in SSR', () => {
    const markup = renderToStaticMarkup(
      <OnyxSelectButtonV2 icon={SvgBubbleTextV2} state="selected" variant="select-light">
        Deep Research
      </OnyxSelectButtonV2>,
    )

    expect(markup).toContain('opal-select-button')
    expect(markup).toContain('data-interactive-state="selected"')
  })

  it('renders the donor interactive container in SSR', () => {
    expect(() =>
      renderToStaticMarkup(
        <OnyxInteractiveContainerV2 type="button">
          <div>Chat</div>
        </OnyxInteractiveContainerV2>,
      ),
    ).not.toThrow()
  })

  it('renders the donor interactive stateless primitive in SSR', () => {
    expect(() =>
      renderToStaticMarkup(
        <OnyxInteractiveStatelessV2 type="button">
          <OnyxInteractiveContainerV2 type="button">
            <div>Chat</div>
          </OnyxInteractiveContainerV2>
        </OnyxInteractiveStatelessV2>,
      ),
    ).not.toThrow()
  })

  it('renders the donor interactive stateful primitive in SSR', () => {
    expect(() =>
      renderToStaticMarkup(
        <OnyxInteractiveStatefulV2 state="selected" type="button" variant="sidebar-light">
          <OnyxInteractiveContainerV2 type="button">
            <div>Chat</div>
          </OnyxInteractiveContainerV2>
        </OnyxInteractiveStatefulV2>,
      ),
    ).not.toThrow()
  })
})
