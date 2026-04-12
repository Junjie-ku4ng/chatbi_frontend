import { afterEach, describe, expect, it, vi } from 'vitest'
import { getChatTask, listChatTasks, retryChatTask } from '@/modules/chat/tasks/api'

function mockJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload
  } as Response
}

describe('chat tasks api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('serializes list query to xpert-task endpoint and maps runtime status', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          items: [
            {
              id: 'task-1',
              xpertId: 'model-1',
              name: 'Weekly analysis task',
              status: 'scheduled',
              options: {
                runtimeStatus: 'failed',
                retryCount: 2,
                sourceType: 'chat',
                detail: 'retry from unit'
              }
            }
          ],
          total: 1
        }
      })
    )

    const page = await listChatTasks({ modelId: 'model-1', limit: 20, offset: 0 })

    const [url] = fetchMock.mock.calls[0] ?? []
    const parsed = new URL(String(url), 'http://localhost')
    expect(parsed.pathname).toContain('/api/xpert/xpert-task/my')
    const data = JSON.parse(parsed.searchParams.get('data') ?? '{}') as {
      where?: Record<string, unknown>
      take?: number
      skip?: number
    }
    expect(data.where?.xpertId).toBe('model-1')
    expect(data.take).toBe(20)
    expect(data.skip).toBe(0)

    expect(page.items[0]?.status).toBe('failed')
    expect(page.items[0]?.retryCount).toBe(2)
    expect(page.items[0]?.sourceType).toBe('chat')
  })

  it('loads task detail from xpert-task by id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          id: 'task-7',
          xpertId: 'model-7',
          name: 'Task 7',
          status: 'scheduled',
          options: {
            runtimeStatus: 'running',
            progress: 35
          }
        }
      })
    )

    const task = await getChatTask('task-7')

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/api/xpert/xpert-task/task-7')
    expect(task.status).toBe('running')
    expect(task.progress).toBe(35)
  })

  it('retries task via xpert-task test endpoint then reloads task', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse({ data: { ok: true } }))
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: {
            id: 'task-9',
            xpertId: 'model-9',
            name: 'Task 9',
            status: 'scheduled',
            options: {
              runtimeStatus: 'queued',
              retryCount: 1
            }
          }
        })
      )

    const task = await retryChatTask('task-9', 'tester')

    const [retryUrl, retryOptions] = fetchMock.mock.calls[0] ?? []
    expect(String(retryUrl)).toContain('/api/xpert/xpert-task/task-9/test')
    expect(String(retryOptions?.method)).toBe('POST')
    const retryBody = JSON.parse(String(retryOptions?.body))
    expect(retryBody.actor).toBe('tester')

    const [getUrl] = fetchMock.mock.calls[1] ?? []
    expect(String(getUrl)).toContain('/api/xpert/xpert-task/task-9')
    expect(task.status).toBe('queued')
    expect(task.retryCount).toBe(1)
  })
})
