/**
 * Atlas Orchestrator - Shared Utilities
 *
 * Common functions for building dynamic prompt sections used by both
 * default (Claude-optimized) and GPT-optimized prompts.
 */

import type { CategoryConfig } from "../../config/schema"
import type { AvailableAgent, AvailableSkill } from "../dynamic-agent-prompt-builder"
import { CATEGORY_DESCRIPTIONS } from "../../tools/delegate-task/constants"
import { mergeCategories } from "../../shared/merge-categories"
import { truncateDescription } from "../../shared/truncate-description"

export const getCategoryDescription = (name: string, userCategories?: Record<string, CategoryConfig>) =>
  userCategories?.[name]?.description ?? CATEGORY_DESCRIPTIONS[name] ?? "General tasks"

export function buildAgentSelectionSection(agents: AvailableAgent[]): string {
   if (agents.length === 0) {
     return `##### Option B: Use AGENT directly (for specialized experts)

 No agents available.`
   }

   const rows = agents.map((a) => {
     const shortDesc = truncateDescription(a.description)
     return `- **\`${a.name}\`** — ${shortDesc}`
   })

  return `##### Option B: Use AGENT directly (for specialized experts)

${rows.join("\n")}`
}

export function buildCategorySection(userCategories?: Record<string, CategoryConfig>): string {
  const allCategories = mergeCategories(userCategories)
  const categoryRows = Object.entries(allCategories).map(([name, config]) => {
    const temp = config.temperature ?? 0.5
    const desc = getCategoryDescription(name, userCategories)
    return `- **\`${name}\`** (${temp}): ${desc}`
  })

  return `##### Option A: Use CATEGORY (for domain-specific work)

Categories spawn \`Sisyphus-Junior-{category}\` with optimized settings:

${categoryRows.join("\n")}

\`\`\`typescript
task(category="[category-name]", load_skills=[...], run_in_background=false, prompt="...")
\`\`\``
}

export function buildSkillsSection(skills: AvailableSkill[]): string {
  if (skills.length === 0) {
    return ""
  }

  const builtinSkills = skills.filter((s) => s.location === "plugin")
  const customSkills = skills.filter((s) => s.location !== "plugin")

  return `
#### 3.2.2: Skill Selection (PREPEND TO PROMPT)

**Use the \`Category + Skills Delegation System\` section below as the single source of truth for skill details.**
- Built-in skills available: ${builtinSkills.length}
- User-installed skills available: ${customSkills.length}

**MANDATORY: Evaluate ALL skills (built-in AND user-installed) for relevance to your task.**

Read each skill's description in the section below and ask: "Does this skill's domain overlap with my task?"
- If YES: INCLUDE in load_skills=[...]
- If NO: You MUST justify why in your pre-delegation declaration

**Usage:**
\`\`\`typescript
task(category="[category]", load_skills=["skill-1", "skill-2"], run_in_background=false, prompt="...")
\`\`\`

**IMPORTANT:**
- Skills get prepended to the subagent's prompt, providing domain-specific instructions
- Subagents are STATELESS - they don't know what skills exist unless you include them
- Missing a relevant skill = suboptimal output quality`
}

export function buildDecisionMatrix(agents: AvailableAgent[], userCategories?: Record<string, CategoryConfig>): string {
  const allCategories = mergeCategories(userCategories)

  const categoryRows = Object.entries(allCategories).map(([name]) => {
    const desc = getCategoryDescription(name, userCategories)
    return `- **${desc}**: \`category="${name}", load_skills=[...]\``
  })

   const agentRows = agents.map((a) => {
     const shortDesc = truncateDescription(a.description)
     return `- **${shortDesc}**: \`agent="${a.name}"\``
   })

  return `##### Decision Matrix

${categoryRows.join("\n")}
${agentRows.join("\n")}

**NEVER provide both category AND agent - they are mutually exclusive.**`
}

export function buildOwnershipPlannerSection(): string {
  return `## Ownership Planner (MANDATORY for multi-task execution)

Before any parallel implementation wave, you MUST produce a semi-structured ownership plan.

### Required Planning Output

\`\`\`text
OWNERSHIP PLAN:
- Bundles:
  - O1: [task ids] -> [owned files/modules/entrypoints]
  - O2: [task ids] -> [owned files/modules/entrypoints]
- Collision boundaries:
  - [shared file/config/schema/test area]
- Serial waves:
  - Wave 1: [bundles]
  - Wave 2: [bundles]
- Draft-start tasks:
  - D1: [task] can start now because [independent context]
\`\`\`

### Non-Negotiable Rules

- Every write-capable task MUST belong to exactly one ownership bundle.
- Every ownership bundle MUST name the files, modules, entrypoints, or shared resources it owns.
- If two tasks touch the same shared resource, they MUST be merged into one bundle or separated into serial waves.
- Read-only tasks may overlap on files, but you MUST label them explicitly as read-only.
- If a task can start as a draft before prerequisites finish, mark it as a draft-start task and keep the same session/thread for continuation.

### Collision Boundaries You Must Check

- same file
- same entrypoint
- same shared config
- same lockfile
- same schema or migration
- same route registry
- same barrel/index export
- same generated output
- tests for the same feature area

If you cannot produce this ownership plan, you are NOT ready to launch a parallel wave.`
}
