import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const appRoot = path.resolve(__dirname, '../../../../..')

describe('frontend api route contract', () => {
  it('insight api no longer references deprecated collection insight owners', () => {
    const source = fs.readFileSync(path.join(appRoot, 'src/modules/insight/api.ts'), 'utf8')

    expect(source).not.toMatch(/\/collection(?=\/|\?|['"`])/)
    expect(source).not.toContain('/chatbi/collections')
  })

  it('story api no longer references deprecated chatbi story aliases', () => {
    const source = fs.readFileSync(path.join(appRoot, 'src/modules/story/api.ts'), 'utf8')

    expect(source).not.toContain('/chatbi/stories')
    expect(source).not.toContain('/public/chatbi/stories')
  })

  it('story api no longer uses story-point, story-template, or story-widget as primary owners', () => {
    const source = fs.readFileSync(path.join(appRoot, 'src/modules/story/api.ts'), 'utf8')

    expect(source).not.toContain('/story-point')
    expect(source).not.toContain('/story-template')
    expect(source).not.toContain('/story-widget')
  })

  it('feed api no longer references deprecated chatbi feed aliases', () => {
    const source = fs.readFileSync(path.join(appRoot, 'src/modules/feed/api.ts'), 'utf8')

    expect(source).not.toContain('/chatbi/feed')
  })

  it('feed api no longer references removed legacy feed owners', () => {
    const source = fs.readFileSync(path.join(appRoot, 'src/modules/feed/api.ts'), 'utf8')

    expect(source).not.toContain('/feeds/my')
    expect(source).not.toContain('`/feeds/${encodeURIComponent(eventId)}`')
  })

  it('e2e api fixture no longer references deprecated chatbi resource aliases', () => {
    const source = fs.readFileSync(path.join(appRoot, 'e2e/helpers/api-fixture.ts'), 'utf8')

    expect(source).not.toContain('/chatbi/stories')
    expect(source).not.toContain('/chatbi/collections')
  })

  it('e2e api fixture uses canonical resource owners', () => {
    const source = fs.readFileSync(path.join(appRoot, 'e2e/helpers/api-fixture.ts'), 'utf8')

    expect(source).not.toMatch(/\/collection(?=\/|\?|['"`])/)
    expect(source).not.toContain('/story-point')
    expect(source).not.toContain('/feeds/my')
  })
})
