import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const settingsHomePath = path.resolve(__dirname, '../../../../app/(workspace)/settings/page.tsx')
const settingsBusinessAreaPath = path.resolve(__dirname, '../../../../app/(workspace)/settings/business-area/page.tsx')
const settingsCertificationPath = path.resolve(__dirname, '../../../../app/(workspace)/settings/certification/page.tsx')
const settingsEmailTemplatesPath = path.resolve(__dirname, '../../../../app/(workspace)/settings/email-templates/page.tsx')
const settingsCustomSmtpPath = path.resolve(__dirname, '../../../../app/(workspace)/settings/custom-smtp/page.tsx')
const settingsCopilotPath = path.resolve(__dirname, '../../../../app/(workspace)/settings/copilot/page.tsx')
const settingsShellPath = path.resolve(__dirname, '../shell.tsx')

function readSource(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

describe('settings page truthfulness contracts', () => {
  it('avoids static ready claims on overview-style settings pages without runtime checks', () => {
    const home = readSource(settingsHomePath)
    const businessArea = readSource(settingsBusinessAreaPath)
    const certification = readSource(settingsCertificationPath)
    const emailTemplates = readSource(settingsEmailTemplatesPath)
    const customSmtp = readSource(settingsCustomSmtpPath)
    const copilot = readSource(settingsCopilotPath)

    expect(home).not.toContain('xpert facade ready')
    expect(home).toContain('xpert facade surface')

    expect(businessArea).not.toContain('domain mapping active')
    expect(businessArea).toContain('domain mapping preview surface')

    expect(certification).not.toContain('compliance profile ready')
    expect(certification).toContain('compliance profile surface')

    expect(emailTemplates).not.toContain('route parity ready')
    expect(emailTemplates).toContain('route parity surface')

    expect(customSmtp).not.toContain('config surface enabled')
    expect(customSmtp).toContain('config surface')

    expect(copilot).not.toContain('model guardrail enabled')
    expect(copilot).toContain('model guardrail surface')
    expect(copilot).not.toContain('/xpert/x/expert-ctl/coplan')
    expect(copilot).toContain('href="/xpert/w"')
  })

  it('declares preview routes as having no durable save path on the route shell itself', () => {
    const shell = readSource(settingsShellPath)

    expect(shell).toContain('data-testid="settings-preview-durability"')
    expect(shell).toContain('No durable save on this route')
  })
})
