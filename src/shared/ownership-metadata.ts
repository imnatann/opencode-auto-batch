export interface OwnershipMetadata {
  ownershipBundle?: string
  ownershipResources?: string[]
  writeCapable?: boolean
  serialWave?: number
  draftStart?: boolean
}

function parseList(raw: string): string[] {
  return raw
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseWave(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const match = raw.match(/(\d+)/)
  if (!match) return undefined
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : undefined
}

export function extractOwnershipMetadata(prompt: string): OwnershipMetadata {
  const bundle = prompt.match(/Ownership Bundle:\s*(O\d+)(?:\s*->\s*([^\n]+))?/i)
  const resources = prompt.match(/Owned Resources:\s*([^\n]+)/i)
  const readOnly = /\bRead-Only:\s*(true|yes)\b/i.test(prompt) || /\bread-only bundle\b/i.test(prompt)
  const writeCapable = /\bWrite-Capable:\s*(true|yes)\b/i.test(prompt) || /\bwrite-capable\b/i.test(prompt)
  const wave = prompt.match(/Serial Wave:\s*([^\n]+)/i)
  const draft = /\bDraft-Start:\s*(true|yes)\b/i.test(prompt) || /\bdraft-safe\b/i.test(prompt)

  const bundleResources = bundle?.[2] ? parseList(bundle[2]) : []
  const explicitResources = resources?.[1] ? parseList(resources[1]) : []
  const ownershipResources = Array.from(new Set([...bundleResources, ...explicitResources]))
  const ownershipBundle = bundle?.[1]
  const resolvedWriteCapable = writeCapable ? true : readOnly ? false : undefined

  return {
    ownershipBundle,
    ownershipResources: ownershipResources.length > 0 ? ownershipResources : undefined,
    writeCapable: resolvedWriteCapable,
    serialWave: parseWave(wave?.[1]),
    draftStart: draft || undefined,
  }
}

export function resolveOwnershipKeys(input: OwnershipMetadata & { parentSessionID: string }): string[] {
  if (!input.writeCapable) return []

  const keys = new Set<string>()
  for (const item of input.ownershipResources ?? []) {
    keys.add(`resource:${item.toLowerCase()}`)
  }
  if (keys.size === 0 && input.ownershipBundle) {
    keys.add(`bundle:${input.parentSessionID}:${input.ownershipBundle.toLowerCase()}`)
  }
  if (keys.size === 0) {
    keys.add(`unplanned-write:${input.parentSessionID}`)
  }
  return Array.from(keys)
}
