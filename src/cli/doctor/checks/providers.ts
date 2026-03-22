import { readConnectedProvidersCache, readProviderModelsCache, transformModelForProvider } from "../../../shared"
import { CHECK_IDS, CHECK_NAMES } from "../constants"
import type { CheckResult, DoctorIssue } from "../types"
import { loadOmoConfig } from "./model-resolution-config"

type OverrideRecord = {
  scope: "agent" | "category"
  name: string
  model: string
}

function collectOverrides(config: Record<string, unknown> | null): OverrideRecord[] {
  if (!config) return []

  const result: OverrideRecord[] = []
  const agents = config.agents
  if (agents && typeof agents === "object") {
    for (const [name, value] of Object.entries(agents)) {
      const model = typeof (value as { model?: unknown }).model === "string" ? (value as { model: string }).model : undefined
      if (model) result.push({ scope: "agent", name, model })
    }
  }

  const categories = config.categories
  if (categories && typeof categories === "object") {
    for (const [name, value] of Object.entries(categories)) {
      const model = typeof (value as { model?: unknown }).model === "string" ? (value as { model: string }).model : undefined
      if (model) result.push({ scope: "category", name, model })
    }
  }

  return result
}

function splitModelID(model: string): { provider: string; modelID: string } | null {
  const slashIndex = model.indexOf("/")
  if (slashIndex <= 0 || slashIndex === model.length - 1) return null
  return {
    provider: model.slice(0, slashIndex),
    modelID: model.slice(slashIndex + 1),
  }
}

export async function checkProviders(): Promise<CheckResult> {
  const config = (loadOmoConfig() as Record<string, unknown> | null) ?? null
  const connected = readConnectedProvidersCache() ?? []
  const providerModels = readProviderModelsCache()
  const overrides = collectOverrides(config)
  const issues: DoctorIssue[] = []
  const details: string[] = []

  details.push(`Connected providers: ${connected.length > 0 ? connected.join(", ") : "none cached"}`)
  details.push(`Runtime model overrides: ${overrides.length}`)

  if (connected.length === 0) {
    issues.push({
      title: "Provider cache not populated",
      description: "No connected provider cache was found, so auth/model routing diagnostics are incomplete.",
      fix: "Launch OpenCode once with your providers connected, then rerun doctor.",
      severity: "warning",
      affects: ["provider diagnostics", "model routing"],
    })
  }

  for (const override of overrides) {
    const parsed = splitModelID(override.model)
    if (!parsed) continue

    if (connected.length > 0 && !connected.includes(parsed.provider)) {
      issues.push({
        title: `${override.scope} override targets a disconnected provider`,
        description: `${override.scope} \`${override.name}\` uses \`${override.model}\`, but provider \`${parsed.provider}\` is not present in the connected provider cache.`,
        fix: `Connect ${parsed.provider} or change the override for ${override.scope} ${override.name}.`,
        severity: "warning",
        affects: ["provider auth", "agent routing"],
      })
      continue
    }

    const advertisedModels = providerModels?.models?.[parsed.provider]
    if (!Array.isArray(advertisedModels) || advertisedModels.length === 0) {
      continue
    }

    const normalized = transformModelForProvider(parsed.provider, parsed.modelID)
    const availableIDs = advertisedModels.filter((entry): entry is string => typeof entry === "string")
    if (!availableIDs.includes(normalized)) {
      issues.push({
        title: `${override.scope} override model not advertised by provider cache`,
        description: `${override.scope} \`${override.name}\` uses \`${override.model}\`, but cached models for \`${parsed.provider}\` do not include \`${normalized}\`.`,
        fix: `Refresh models or update the override for ${override.scope} ${override.name}.`,
        severity: "warning",
        affects: ["model resolution", "provider diagnostics"],
      })
    }
  }

  return {
    name: CHECK_NAMES[CHECK_IDS.PROVIDERS],
    status: issues.length > 0 ? "warn" : "pass",
    message: issues.length > 0 ? `${issues.length} provider/auth warning(s) detected` : "Provider/auth diagnostics look healthy",
    details,
    issues,
  }
}
