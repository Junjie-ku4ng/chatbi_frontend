'use client'

import Link from 'next/link'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { listSemanticModels } from '@/lib/api-client'
import {
  addCollectionItem,
  addFavorite,
  createCollection,
  listCollections,
  listFavorites,
  listInsights
} from '@/modules/insight/api'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'

export default function CollectionsPage() {
  const [modelId, setModelId] = useState<string | undefined>()
  const [collectionName, setCollectionName] = useState('')
  const modelsQuery = useQuery({
    queryKey: ['semantic-models'],
    queryFn: listSemanticModels
  })
  const activeModelId = modelId ?? modelsQuery.data?.[0]?.id

  const collectionsQuery = useQuery({
    queryKey: ['collections', activeModelId],
    queryFn: () => listCollections(activeModelId as string),
    enabled: Boolean(activeModelId)
  })

  const insightsQuery = useQuery({
    queryKey: ['insights-collection', activeModelId],
    queryFn: () => listInsights(activeModelId as string),
    enabled: Boolean(activeModelId)
  })

  const favoritesQuery = useQuery({
    queryKey: ['favorites-collection', activeModelId],
    queryFn: () => listFavorites(activeModelId as string),
    enabled: Boolean(activeModelId)
  })

  const createCollectionMutation = useMutation({
    mutationFn: async () => {
      if (!activeModelId || !collectionName.trim()) {
        throw new Error('model and collection name are required')
      }
      return createCollection(activeModelId, collectionName.trim())
    },
    onSuccess: async () => {
      setCollectionName('')
      await collectionsQuery.refetch()
    }
  })

  const addItemMutation = useMutation({
    mutationFn: async (input: { collectionId: string; insightId: string }) => addCollectionItem(input.collectionId, input.insightId),
    onSuccess: async () => {
      await collectionsQuery.refetch()
    }
  })

  const favoriteCollectionMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      if (!activeModelId) return null
      return addFavorite(activeModelId, 'collection', collectionId)
    },
    onSuccess: async () => {
      await favoritesQuery.refetch()
    }
  })

  const collectionFavorites = new Set(
    (favoritesQuery.data?.items ?? [])
      .filter(item => item.resourceType === 'collection')
      .map(item => item.resourceId)
  )

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section data-testid="collections-page-root" style={{ display: 'grid', gap: 16 }}>
      <header className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Collections & Favorites</strong>
        <select
          value={activeModelId ?? ''}
          onChange={event => setModelId(event.target.value)}
          style={{
            borderRadius: 10,
            border: '1px solid var(--line)',
            background: '#fff',
            padding: '9px 10px',
            maxWidth: 360
          }}
        >
          {(modelsQuery.data ?? []).map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <form
          onSubmit={async (event: FormEvent) => {
            event.preventDefault()
            await createCollectionMutation.mutateAsync()
          }}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          <input
            value={collectionName}
            onChange={event => setCollectionName(event.target.value)}
            placeholder="New collection name"
            style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 240 }}
          />
          <button type="submit" style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}>
            Create
          </button>
        </form>
      </header>

      <section style={{ display: 'grid', gap: 10 }}>
        {(collectionsQuery.data?.items ?? []).map(collection => (
          <article key={collection.id} className="card" style={{ padding: 14, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <strong style={{ fontFamily: 'var(--font-title), sans-serif' }}>{collection.name}</strong>
              <button
                type="button"
                disabled={collectionFavorites.has(collection.id)}
                onClick={() => favoriteCollectionMutation.mutate(collection.id)}
                style={{ border: '1px solid var(--line)', borderRadius: 999, padding: '4px 10px', background: '#fff' }}
              >
                {collectionFavorites.has(collection.id) ? 'Favorited' : 'Favorite Collection'}
              </button>
            </div>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{collection.description ?? 'No description'}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(insightsQuery.data?.items ?? []).slice(0, 5).map(insight => (
                <button
                  key={insight.id}
                  type="button"
                  onClick={() => addItemMutation.mutate({ collectionId: collection.id, insightId: insight.id })}
                  style={{ border: '1px solid var(--line)', borderRadius: 999, padding: '4px 10px', background: '#fff' }}
                >
                  Add {insight.title.slice(0, 20)}...
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="card" style={{ padding: 14, display: 'grid', gap: 8 }}>
        <strong style={{ fontFamily: 'var(--font-title), sans-serif' }}>Favorites</strong>
        {(favoritesQuery.data?.items ?? []).map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <span>
              {item.resourceType}: {item.resourceId}
            </span>
            {item.resourceType === 'insight' ? <Link href={`/dashboard/${item.resourceId}`}>Open</Link> : null}
          </div>
        ))}
      </section>
      </section>
    </AccessGuard>
  )
}
