type Resume = {
  latestSession?: {
    summary?: string | null
    goal?: string | null
    nextStep?: string | null
  } | null
  activeConstraints?: Array<{ kind?: string; content?: string }>
  recentDecisions?: Array<{ title?: string; status?: string }>
  recentPatchFailures?: Array<{ path?: string; failureType?: string }>
  recentExecutionFailures?: Array<{ command?: string; status?: string }>
}

type Handoff = {
  summary?: string | null
}

type Msg = {
  info?: { id?: string; role?: string }
  parts?: Array<{ type?: string; text?: string; tool?: string; state?: Record<string, unknown> }>
}

function clip(text: string | null | undefined, limit = 800): string {
  if (!text) return ""
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

function text(parts: Array<{ type?: string; text?: string }> | undefined): string {
  return (parts ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim()
}

export function formatResumeContext(resume: Resume | null, handoff: Handoff | null): string {
  const blocks: string[] = []
  const goal = clip(resume?.latestSession?.goal)
  const summary = clip(resume?.latestSession?.summary)
  const next = clip(resume?.latestSession?.nextStep)
  const constraints = (resume?.activeConstraints ?? []).slice(0, 5)
  const decisions = (resume?.recentDecisions ?? []).slice(0, 5)
  const patches = (resume?.recentPatchFailures ?? []).slice(0, 3)
  const execs = (resume?.recentExecutionFailures ?? []).slice(0, 3)

  if (goal || summary || next) {
    blocks.push([
      "<workspace_memory_resume>",
      goal ? `Goal: ${goal}` : "",
      summary ? `Latest summary: ${summary}` : "",
      next ? `Next step: ${next}` : "",
      "</workspace_memory_resume>",
    ].filter(Boolean).join("\n"))
  }

  if (constraints.length > 0) {
    blocks.push([
      "<workspace_memory_constraints>",
      ...constraints.map((item) => `- [${item.kind ?? "unknown"}] ${item.content ?? ""}`),
      "</workspace_memory_constraints>",
    ].join("\n"))
  }

  if (decisions.length > 0) {
    blocks.push([
      "<workspace_memory_decisions>",
      ...decisions.map((item) => `- ${item.title ?? "Untitled"} (${item.status ?? "unknown"})`),
      "</workspace_memory_decisions>",
    ].join("\n"))
  }

  if (patches.length > 0 || execs.length > 0) {
    blocks.push([
      "<workspace_memory_recent_failures>",
      ...patches.map((item) => `- patch ${item.path ?? "unknown"}: ${item.failureType ?? "unknown"}`),
      ...execs.map((item) => `- command ${item.command ?? "unknown"}: ${item.status ?? "unknown"}`),
      "</workspace_memory_recent_failures>",
    ].join("\n"))
  }

  const hand = clip(handoff?.summary, 1000)
  if (hand) {
    blocks.push(`<workspace_memory_handoff>\n${hand}\n</workspace_memory_handoff>`)
  }

  return blocks.filter(Boolean).join("\n\n")
}

export function buildIdleSummary(msgs: Msg[]): { key: string | null; summary: string; next: string } {
  const last = msgs.at(-1)
  const key = last?.info?.id ?? null
  const user = [...msgs].reverse().find((msg) => msg.info?.role === "user")
  const assistant = [...msgs].reverse().find((msg) => msg.info?.role === "assistant")
  const tools = msgs
    .flatMap((msg) => msg.parts ?? [])
    .filter((part) => part.type === "tool")
    .slice(-6)
    .map((part) => {
      const status = typeof part.state?.status === "string" ? part.state.status : "unknown"
      const tool = typeof part.tool === "string" ? part.tool : "tool"
      return `- ${tool}: ${status}`
    })

  const summary = [
    text(user?.parts),
    text(assistant?.parts) ? `Assistant: ${clip(text(assistant?.parts), 1200)}` : "",
    tools.length > 0 ? `Tools:\n${tools.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  const next = tools.some((item) => item.includes("error"))
    ? "Investigate the latest failing tool result and continue from the recorded errors."
    : "Continue from the latest user request and assistant state."

  return { key, summary: summary || "Session completed without a text summary.", next }
}
