const DEFAULT_DEV_ASK_HARNESS_XPERT_ID = 'de6dacb4-2ac8-4bb5-bedf-087f3a09ecc3'

function asNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

export function resolveAskHarnessXpertId(value?: string) {
  const explicit =
    asNonEmptyString(value) ??
    asNonEmptyString(process.env.NEXT_PUBLIC_XPERT_ID) ??
    asNonEmptyString(process.env.PA_LIVE_GATE_XPERT_ID) ??
    asNonEmptyString(process.env.PA_LIVE_GATE_OPERATIONS_XPERT_ID)

  if (explicit) {
    return explicit
  }

  if (process.env.NODE_ENV === 'production') {
    return undefined
  }

  return DEFAULT_DEV_ASK_HARNESS_XPERT_ID
}

export { DEFAULT_DEV_ASK_HARNESS_XPERT_ID }
