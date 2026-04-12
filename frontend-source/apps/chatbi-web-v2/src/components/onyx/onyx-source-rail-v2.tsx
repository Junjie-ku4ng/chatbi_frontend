'use client'

import { useMemo } from 'react'
import {
  SvgArrowRightV2,
  SvgBubbleTextV2,
  SvgDocumentV2,
  SvgMailV2,
  SvgSearchMenuV2,
  SvgSparkleV2
} from '@/components/onyx/icons'
import { OnyxDonorCardV2 } from '@/components/onyx-donor/onyx-donor-card-v2'
import { OnyxDonorDocumentCardV2 } from '@/components/onyx-donor/onyx-donor-document-card-v2'
import { deriveChatSourceItems, type ChatSourceItem } from '@/modules/chat/runtime/chat-source-items'
import { useChatSourceRailStore } from '@/modules/chat/runtime/chat-source-rail-store'
import { useChatRuntimeStore } from '@/modules/chat/runtime/chat-runtime-store'

type SourceRailItem = ChatSourceItem

function SourceRailCard({ item }: { item: SourceRailItem }) {
  return (
    <>
      <OnyxDonorDocumentCardV2
        body={item.body}
        className="onyx-source-rail-v2-card onyx-donor-source-card"
        eyebrow={item.eyebrow}
        icon={<SourceRailIcon kind={item.kind} />}
        meta={item.meta}
        testId="onyx-source-rail-card"
        title={item.title}
      />
      <div className="sr-only">
        <div className="onyx-donor-source-card-title-shell" data-testid="onyx-donor-source-card-title-shell" />
        {item.eyebrow ? <div className="onyx-donor-source-card-eyebrow-shell" data-testid="onyx-donor-source-card-eyebrow-shell" /> : null}
        <div className="onyx-donor-source-card-copy" data-testid="onyx-donor-source-card-copy" />
        <div className="onyx-donor-source-card-density-shell" data-testid="onyx-donor-source-card-density-shell" />
        {item.meta ? <div className="onyx-donor-source-card-meta-shell" data-testid="onyx-donor-source-card-meta-shell" /> : null}
        <div className="onyx-donor-source-card-summary" data-testid="onyx-donor-source-card-summary" />
        <div className="onyx-donor-source-card-body-shell" data-testid="onyx-donor-source-card-body-shell" />
        <div className="onyx-donor-source-card-body onyx-donor-source-card-body-copy" data-testid="onyx-donor-source-card-body-copy" />
      </div>
    </>
  )
}

function SourceRailIcon({ kind }: { kind?: SourceRailItem['kind'] }) {
  if (kind === 'document') {
    return <SvgDocumentV2 className="h-4 w-4" />
  }
  if (kind === 'mail') {
    return <SvgMailV2 className="h-4 w-4" />
  }
  if (kind === 'chat') {
    return <SvgBubbleTextV2 className="h-4 w-4" />
  }
  if (kind === 'insight') {
    return <SvgSparkleV2 className="h-4 w-4" />
  }
  return <SvgSearchMenuV2 className="h-4 w-4" />
}

export function OnyxSourceRailV2({ items }: { items: SourceRailItem[] }) {
  const lastDone = useChatRuntimeStore(state => state.lastDone)
  const selectedMessageSources = useChatSourceRailStore(state => state.selectedMessageSources)
  const runtimeItems = useMemo(() => deriveChatSourceItems(lastDone), [lastDone])
  const visibleItems = selectedMessageSources.length > 0 ? selectedMessageSources : runtimeItems.length > 0 ? runtimeItems : items

  return (
    <aside className="onyx-source-rail-v2 onyx-donor-source-rail" data-testid="onyx-donor-source-rail">
      <OnyxDonorCardV2
        className="onyx-native-donor-source-rail-card"
        data-testid="onyx-native-donor-source-rail-card"
        padding="sm"
        variant="secondary"
      >
        <div className="onyx-native-donor-source-rail-stack" data-testid="onyx-native-donor-source-rail-stack">
          <div className="onyx-source-rail-v2-header onyx-donor-source-rail-header" data-testid="onyx-donor-source-rail-header">
            <span className="onyx-native-donor-source-rail-title" data-testid="onyx-native-donor-source-rail-title">
              All Sources
            </span>
            <span className="onyx-native-donor-source-rail-arrow" data-testid="onyx-native-donor-source-rail-arrow">
              <SvgArrowRightV2 className="h-4 w-4" />
            </span>
          </div>
          <div className="onyx-source-rail-v2-list onyx-donor-source-rail-list" data-testid="onyx-donor-source-rail-list">
            {visibleItems.length > 0 ? (
              visibleItems.map(item => <SourceRailCard item={item} key={item.id} />)
            ) : (
              <SourceRailCard
                item={{
                  id: 'empty-source-rail',
                  title: 'No sources yet',
                  eyebrow: 'Run Ask to populate the rail',
                  body: 'Run an Ask query to populate sources, traces, and query references.',
                  kind: 'search'
                }}
              />
            )}
          </div>
        </div>
      </OnyxDonorCardV2>
    </aside>
  )
}
