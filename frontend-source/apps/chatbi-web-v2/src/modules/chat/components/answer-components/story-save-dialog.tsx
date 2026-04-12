'use client'

import { FormEvent, useEffect, useState } from 'react'
import { buildStoryDesignerHref } from '@/modules/story/api'
import { saveAnswerSurfaceToStory } from './interactive-actions'
import type { AnswerComponentPayload, AnswerSurfaceView } from './types'

type StorySaveDialogProps = {
  isOpen: boolean
  type: AnswerSurfaceView
  payload: AnswerComponentPayload
  onClose: () => void
}

export function StorySaveDialog(props: StorySaveDialogProps) {
  const [storyTitle, setStoryTitle] = useState('')
  const [storySummary, setStorySummary] = useState('')
  const [widgetTitle, setWidgetTitle] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [savedStoryId, setSavedStoryId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!props.isOpen) {
      return
    }

    const defaultTitle =
      (typeof props.payload.interaction?.story?.title === 'string' && props.payload.interaction.story.title.trim()) ||
      (typeof props.payload.label === 'string' && props.payload.label.trim()) ||
      '分析结果'

    setStoryTitle(defaultTitle)
    setStorySummary('')
    setWidgetTitle(defaultTitle)
    setStatus(null)
    setSavedStoryId(null)
    setIsSaving(false)
  }, [props.isOpen, props.payload, props.type])

  if (!props.isOpen) {
    return null
  }

  const openStoryHref = savedStoryId ? buildStoryDesignerHref(savedStoryId) : undefined

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setStatus(null)

    try {
      const result = await saveAnswerSurfaceToStory({
        type: props.type,
        payload: props.payload,
        storyTitle,
        storySummary,
        widgetTitle
      })
      setSavedStoryId(result.story.id)
      setStatus(`故事已保存（${result.story.id}）`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '保存故事失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="chat-assistant-answer-surface-dialog onyx-donor-answer-surface-dialog"
      data-testid="answer-story-save-dialog"
      role="dialog"
      aria-modal="true"
    >
      <div className="chat-assistant-answer-surface-dialog-bar onyx-donor-answer-surface-dialog-bar">
        <button
          type="button"
          data-testid="answer-story-save-close"
          className="chat-assistant-answer-action onyx-donor-answer-surface-action"
          onClick={props.onClose}
        >
          关闭
        </button>
      </div>
      <form
        className="chat-assistant-component-panel onyx-donor-answer-panel onyx-donor-story-save-form"
        onSubmit={handleSubmit}
        style={{ display: 'grid', gap: 12 }}
      >
        <strong>加入故事</strong>
        <label className="onyx-donor-story-save-label" style={{ display: 'grid', gap: 6 }}>
          <span>故事标题</span>
          <input
            className="onyx-donor-story-save-input"
            data-testid="answer-story-save-title"
            value={storyTitle}
            onChange={event => setStoryTitle(event.target.value)}
            placeholder="故事标题"
          />
        </label>
        <label className="onyx-donor-story-save-label" style={{ display: 'grid', gap: 6 }}>
          <span>故事摘要</span>
          <input
            className="onyx-donor-story-save-input"
            data-testid="answer-story-save-summary"
            value={storySummary}
            onChange={event => setStorySummary(event.target.value)}
            placeholder="摘要"
          />
        </label>
        <label className="onyx-donor-story-save-label" style={{ display: 'grid', gap: 6 }}>
          <span>组件标题</span>
          <input
            className="onyx-donor-story-save-input"
            data-testid="answer-story-save-widget-title"
            value={widgetTitle}
            onChange={event => setWidgetTitle(event.target.value)}
            placeholder="组件标题"
          />
        </label>
        <div className="onyx-donor-story-save-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="submit"
            data-testid="answer-story-save-submit"
            className="chat-assistant-answer-action onyx-donor-answer-surface-action"
            disabled={isSaving || storyTitle.trim() === '' || widgetTitle.trim() === ''}
          >
            {isSaving ? '正在保存...' : '保存到故事'}
          </button>
          {openStoryHref ? (
            <a
              data-testid="answer-story-save-open-story"
              className="chat-assistant-answer-action onyx-donor-answer-surface-action"
              href={openStoryHref}
            >
              打开故事
            </a>
          ) : null}
        </div>
        {status ? (
          <p className="onyx-donor-story-save-status" data-testid="answer-story-save-status" style={{ margin: 0 }}>
            {status}
          </p>
        ) : null}
      </form>
    </div>
  )
}
