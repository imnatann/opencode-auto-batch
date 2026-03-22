import { existsSync, readFileSync } from "node:fs"

export type OwnershipPlanStatus = {
  exists: boolean
  hasSection: boolean
  hasBundles: boolean
  hasCollisionBoundaries: boolean
  hasSerialWaves: boolean
  hasDraftStarts: boolean
  bundleCount: number
}

export function inspectOwnershipPlan(planPath: string): OwnershipPlanStatus {
  if (!existsSync(planPath)) {
    return {
      exists: false,
      hasSection: false,
      hasBundles: false,
      hasCollisionBoundaries: false,
      hasSerialWaves: false,
      hasDraftStarts: false,
      bundleCount: 0,
    }
  }

  try {
    const content = readFileSync(planPath, "utf-8")
    const bundleMatches = content.match(/\bO\d+\b/g) || []

    return {
      exists: true,
      hasSection: /^##\s+Ownership Plan/m.test(content) || /^OWNERSHIP PLAN:/m.test(content),
      hasBundles: /\bBundles:\b/m.test(content),
      hasCollisionBoundaries: /Collision Boundaries:/m.test(content),
      hasSerialWaves: /Serial Waves:/m.test(content),
      hasDraftStarts: /Draft-Start Tasks:/m.test(content),
      bundleCount: new Set(bundleMatches).size,
    }
  } catch {
    return {
      exists: true,
      hasSection: false,
      hasBundles: false,
      hasCollisionBoundaries: false,
      hasSerialWaves: false,
      hasDraftStarts: false,
      bundleCount: 0,
    }
  }
}

export function hasUsableOwnershipPlan(status: OwnershipPlanStatus): boolean {
  return status.hasSection && status.hasBundles && status.hasCollisionBoundaries && status.hasSerialWaves && status.bundleCount > 0
}

export function buildOwnershipPlanReminder(planName: string, status: OwnershipPlanStatus): string {
  const missing: string[] = []
  if (!status.hasSection) missing.push("Ownership Plan section")
  if (!status.hasBundles) missing.push("Bundles")
  if (!status.hasCollisionBoundaries) missing.push("Collision Boundaries")
  if (!status.hasSerialWaves) missing.push("Serial Waves")
  if (!status.hasDraftStarts) missing.push("Draft-Start Tasks")
  if (status.bundleCount === 0) missing.push("bundle IDs like O1/O2")

  return `
**OWNERSHIP PLAN GATE**

Before launching the next parallel write wave, verify ".sisyphus/plans/${planName}.md" contains a usable ownership plan.

- Bundles detected: ${status.bundleCount}
- Missing: ${missing.join(", ") || "none"}

Minimum required structure:
- \`## Ownership Plan\`
- \`Bundles:\` with explicit ownership labels such as \`O1\`, \`O2\`
- \`Collision Boundaries:\`
- \`Serial Waves:\`
- \`Draft-Start Tasks:\`

If any of those are missing, update the plan before starting another parallel write wave.`
}
