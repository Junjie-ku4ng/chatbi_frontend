const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const PORT = Number(process.env.PORT || 3790)
const HOST = process.env.HOST || '127.0.0.1'
const DATA_DIR = path.join(__dirname, 'data')

function loadJson(relativePath) {
  const filePath = path.join(DATA_DIR, relativePath)
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

const baseAgent = loadJson('published-agent.json')
const baseConversations = loadJson('conversations.json')
const scenarios = {
  'sales-summary': loadJson(path.join('scenarios', 'sales-summary.json')),
  'clarification-needed': loadJson(path.join('scenarios', 'clarification-needed.json')),
  'no-data': loadJson(path.join('scenarios', 'no-data.json'))
}

const store = {
  agent: clone(baseAgent),
  conversations: clone(baseConversations.items)
}

function nowIso() {
  return new Date().toISOString()
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    request.on('data', chunk => chunks.push(chunk))
    request.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        const body = Buffer.concat(chunks).toString('utf8')
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })
    request.on('error', reject)
  })
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  })
  response.end(JSON.stringify(payload, null, 2))
}

function writeNoContent(response) {
  response.writeHead(204, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  })
  response.end()
}

function writeSseHeaders(response) {
  response.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'access-control-allow-origin': '*'
  })
}

function pushSseEvent(response, type, payload) {
  response.write(`event: ${type}\n`)
  response.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function inferScenario(question) {
  const normalized = String(question || '')
  if (normalized.includes('哪个') || normalized.includes('哪一个') || normalized.includes('哪类')) {
    return 'clarification-needed'
  }
  if (normalized.includes('火星') || normalized.includes('不存在')) {
    return 'no-data'
  }
  return 'sales-summary'
}

function listConversationSummaries() {
  return store.conversations.map(conversation => ({
    conversationId: conversation.conversationId,
    title: conversation.title,
    lastQuestion: conversation.lastQuestion,
    lastUpdatedAt: conversation.lastUpdatedAt
  }))
}

function findConversation(conversationId) {
  return store.conversations.find(item => item.conversationId === conversationId)
}

function createConversation(title) {
  const conversation = {
    conversationId: generateId('conv'),
    title: title || '新建销售问答',
    lastQuestion: '',
    lastUpdatedAt: nowIso(),
    messages: []
  }
  store.conversations.unshift(conversation)
  return conversation
}

function updateConversationSummary(conversation, question) {
  conversation.lastQuestion = question
  conversation.lastUpdatedAt = nowIso()
  if (!conversation.title || conversation.title === '新建销售问答') {
    conversation.title = question.slice(0, 18) || '销售问答'
  }
}

function findMessage(conversation, messageId) {
  return conversation.messages.find(item => item.messageId === messageId)
}

function normalizeScenarioEvent(event, conversationId, assistantMessageId) {
  const normalized = {
    ...event,
    occurredAt: nowIso()
  }

  if (normalized.type === 'session.started') {
    normalized.conversationId = conversationId
    normalized.assistantMessageId = assistantMessageId
  }

  return normalized
}

function finalizeAssistantMessage(conversation, assistantMessageId, scenarioName) {
  const scenario = scenarios[scenarioName]
  const assistant = findMessage(conversation, assistantMessageId)
  if (!assistant || !scenario || !scenario.finalMessage) {
    return
  }
  assistant.state = scenario.finalMessage.state
  assistant.text = scenario.finalMessage.text
  assistant.blocks = scenario.finalMessage.blocks
}

function handleStream(response, conversation, assistantMessageId, scenarioName) {
  const scenario = scenarios[scenarioName] || scenarios['sales-summary']
  writeSseHeaders(response)

  const eventQueue = scenario.events.map(event =>
    normalizeScenarioEvent(event, conversation.conversationId, assistantMessageId)
  )
  let index = 0

  const timer = setInterval(() => {
    const event = eventQueue[index]
    if (!event) {
      clearInterval(timer)
      finalizeAssistantMessage(conversation, assistantMessageId, scenarioName)
      response.end()
      return
    }
    pushSseEvent(response, event.type, event)
    index += 1
  }, 350)

  response.on('close', () => {
    clearInterval(timer)
  })
}

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    writeJson(response, 400, { message: 'Missing URL' })
    return
  }

  const url = new URL(request.url, `http://localhost:${PORT}`)
  const pathname = url.pathname

  if (request.method === 'OPTIONS') {
    writeNoContent(response)
    return
  }

  if (request.method === 'GET' && pathname === '/health') {
    writeJson(response, 200, { ok: true, service: 'published-agent-ask-page-mock' })
    return
  }

  const parts = pathname.split('/').filter(Boolean)
  const isAgentRoute = parts[0] === 'api' && parts[1] === 'published-agents'
  const agentId = isAgentRoute ? parts[2] : null

  if (!isAgentRoute || agentId !== store.agent.agentId) {
    writeJson(response, 404, { message: 'Not found' })
    return
  }

  if (request.method === 'GET' && parts.length === 3) {
    writeJson(response, 200, store.agent)
    return
  }

  if (request.method === 'GET' && parts.length === 4 && parts[3] === 'suggestions') {
    writeJson(response, 200, { items: store.agent.starterQuestions })
    return
  }

  if (request.method === 'GET' && parts.length === 4 && parts[3] === 'conversations') {
    writeJson(response, 200, { items: listConversationSummaries() })
    return
  }

  if (request.method === 'POST' && parts.length === 4 && parts[3] === 'conversations') {
    const body = await readJsonBody(request)
    const conversation = createConversation(body.title)
    writeJson(response, 201, {
      agentId: store.agent.agentId,
      conversationId: conversation.conversationId,
      title: conversation.title
    })
    return
  }

  if (request.method === 'GET' && parts.length === 6 && parts[3] === 'conversations' && parts[5] === 'messages') {
    const conversation = findConversation(parts[4])
    if (!conversation) {
      writeJson(response, 404, { message: 'Conversation not found' })
      return
    }
    writeJson(response, 200, { items: conversation.messages })
    return
  }

  if (request.method === 'POST' && parts.length === 4 && parts[3] === 'messages') {
    const body = await readJsonBody(request)
    const scenarioName = body.scenario || inferScenario(body.question)
    const conversation = body.conversationId ? findConversation(body.conversationId) : createConversation()

    if (!conversation) {
      writeJson(response, 404, { message: 'Conversation not found' })
      return
    }

    const userMessage = {
      messageId: generateId('msg-user'),
      role: 'user',
      state: 'complete',
      text: body.question,
      createdAt: nowIso()
    }

    const assistantMessage = {
      messageId: generateId('msg-assistant'),
      role: 'assistant',
      state: 'streaming',
      text: '',
      createdAt: nowIso(),
      feedback: null,
      blocks: []
    }

    conversation.messages.push(userMessage, assistantMessage)
    updateConversationSummary(conversation, body.question)

    writeJson(response, 201, {
      agentId: store.agent.agentId,
      conversationId: conversation.conversationId,
      userMessageId: userMessage.messageId,
      assistantMessageId: assistantMessage.messageId,
      streamUrl:
        `/api/published-agents/${store.agent.agentId}/stream` +
        `?conversationId=${encodeURIComponent(conversation.conversationId)}` +
        `&assistantMessageId=${encodeURIComponent(assistantMessage.messageId)}` +
        `&scenario=${encodeURIComponent(scenarioName)}`,
      scenario: scenarioName
    })
    return
  }

  if (request.method === 'GET' && parts.length === 4 && parts[3] === 'stream') {
    const conversationId = url.searchParams.get('conversationId')
    const assistantMessageId = url.searchParams.get('assistantMessageId')
    const scenarioName = url.searchParams.get('scenario') || 'sales-summary'

    const conversation = conversationId ? findConversation(conversationId) : null
    if (!conversation || !assistantMessageId) {
      writeJson(response, 400, { message: 'Missing stream params' })
      return
    }

    handleStream(response, conversation, assistantMessageId, scenarioName)
    return
  }

  if (request.method === 'POST' && parts.length === 6 && parts[3] === 'messages' && parts[5] === 'feedback') {
    const body = await readJsonBody(request)
    const messageId = parts[4]

    for (const conversation of store.conversations) {
      const message = findMessage(conversation, messageId)
      if (message) {
        message.feedback = body.rating
        writeJson(response, 200, { ok: true })
        return
      }
    }

    writeJson(response, 404, { message: 'Message not found' })
    return
  }

  writeJson(response, 404, { message: 'Not found' })
})

server.listen(PORT, HOST, () => {
  console.log(`published-agent-ask-page mock listening on http://${HOST}:${PORT}`)
})
