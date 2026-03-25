import type { PluginInput } from "@opencode-ai/plugin"

import type { SkillMcpManager } from "../../features/skill-mcp-manager"
import { contextCollector } from "../../features/context-injector"
import { normalizeSDKResponse, log } from "../../shared"
import { formatResumeContext, buildIdleSummary } from "./format"
import { resolveWorkspaceMemoryServer } from "./config"
import { extractToolPaths, extractToolTarget } from "./paths"

type HookInput = { tool: string; sessionID: string; callID: string; args?: Record<string, unknown> }
type HookOutput = { args: Record<string, unknown> }
type ToolOutput = { title: string; output: string; metadata: Record<string, unknown> }
type Msg = {
  info: { id?: string; role?: string }
  parts: Array<{
    id?: string
    type?: string
    text?: string
    tool?: string
    state?: Record<string, unknown>
  }>
}

const SERVER = "workspace_memory"
const SKILL = "workspace-memory-auto"
const WRITE_TOOLS = new Set(["write", "edit", "multiedit", "apply_patch", "ast_grep_replace"])

function partKey(sessionID: string, callID: string): string {
  return `${sessionID}:${callID}`
}

function parseResult(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  const text = value.find((item) => typeof item === "object" && item !== null && (item as { type?: string }).type === "text")
  if (!text || typeof (text as { text?: string }).text !== "string") return value
  const body = (text as { text: string }).text
  try {
    return JSON.parse(body)
  } catch {
    return body
  }
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function classifyFailure(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("outside workspace")) return "outside_workspace"
  if (lower.includes("verification failed") || lower.includes("failed to find expected lines")) return "missing_lines"
  if (lower.includes("session not found")) return "session_missing"
  if (lower.includes("stale") || lower.includes("drift")) return "stale_hash"
  return "tool_error"
}

export function createWorkspaceMemoryAutomationHook(ctx: PluginInput, manager: SkillMcpManager) {
  const sessions = new Map<string, string>()
  const calls = new Map<string, { tool: string; paths: string[] }>()
  const seen = new Set<string>()
  const saved = new Map<string, string>()
  const retried = new Set<string>()
  let cfg = resolveWorkspaceMemoryServer(ctx.directory)

  async function call(sessionID: string, name: string, args: Record<string, unknown>): Promise<any> {
    cfg ??= resolveWorkspaceMemoryServer(ctx.directory)
    if (!cfg) return null
    const result = await manager.callTool(
      { serverName: SERVER, skillName: SKILL, sessionID },
      { config: cfg, skillName: SKILL },
      name,
      args,
    )
    return parseResult(result)
  }

  async function ensure(sessionID: string, goal?: string): Promise<string | null> {
    const cached = sessions.get(sessionID)
    if (cached) return cached
    await call(sessionID, "workspace_init", { repoPath: ctx.directory })
    const started = await call(sessionID, "session_start", {
      repoPath: ctx.directory,
      externalSessionId: sessionID,
      toolName: "opencode",
      goal,
    })
    const id = typeof started?.sessionId === "string" ? started.sessionId : null
    if (id) sessions.set(sessionID, id)
    return id
  }

  async function inject(sessionID: string, prompt: string): Promise<void> {
    const prior = sessions.has(sessionID)
      ? null
      : await call(sessionID, "session_resume_get", { repoPath: ctx.directory }).catch(() => null)
    await ensure(sessionID, prompt)
    const resume = prior ?? await call(sessionID, "session_resume_get", { repoPath: ctx.directory }).catch(() => null)
    const handoff = await call(sessionID, "handoff_latest_get", { repoPath: ctx.directory }).catch(() => null)
    const text = formatResumeContext(resume, handoff)
    if (!text) return
    contextCollector.register(sessionID, {
      id: `workspace-memory-${Date.now()}`,
      source: "custom",
      priority: "critical",
      content: text,
    })
  }

  async function logError(sessionID: string, tool: string, args: Record<string, unknown>, error: string): Promise<void> {
    const session = await ensure(sessionID)
    const target = extractToolTarget(tool, args, ctx.directory)
    await call(sessionID, "attempt_record", {
      repoPath: ctx.directory,
      sessionId: session,
      kind: tool === "bash" ? "command" : "patch",
      target,
      summary: `${tool} failed: ${error}`,
      result: "failure",
      fingerprint: `${tool}:${classifyFailure(error)}`,
    }).catch(() => null)
    if (!WRITE_TOOLS.has(tool)) return
    const paths = extractToolPaths(tool, args, ctx.directory)
    await call(sessionID, "patch_failure_record", {
      repoPath: ctx.directory,
      sessionId: session,
      path: paths[0] ?? target ?? ctx.directory,
      expectedAnchor: tool === "edit" ? args.oldString : undefined,
      actualContext: error,
      failureType: classifyFailure(error),
      notes: error,
    }).catch(() => null)
  }

  async function summarize(sessionID: string): Promise<void> {
    const session = await ensure(sessionID)
    if (!session) return
    const response = await ctx.client.session.messages({ path: { id: sessionID } }).catch(() => null)
    const msgs = normalizeSDKResponse<Msg[]>(response, [])
    for (const msg of msgs) {
      for (const part of msg.parts ?? []) {
        if (!part.id || seen.has(part.id) || part.type !== "tool") continue
        const state = part.state ?? {}
        const status = typeof state.status === "string" ? state.status : "unknown"
        if (status !== "error") continue
        seen.add(part.id)
        const tool = typeof part.tool === "string" ? part.tool : "tool"
        const args = (state.input as Record<string, unknown> | undefined) ?? {}
        const error = stringify(state.error)
        await logError(
          sessionID,
          tool,
          args,
          error,
        )
        if (
          part.id &&
          !retried.has(part.id) &&
          WRITE_TOOLS.has(tool) &&
          classifyFailure(error) === "stale_hash"
        ) {
          retried.add(part.id)
          const paths = extractToolPaths(tool, args, ctx.directory)
          const body = {
            parts: [{
              type: "text" as const,
              text: `The last ${tool} call was blocked because these files drifted since the last snapshot: ${paths.join(", ") || "unknown"}. Read the affected files first, then retry the requested change automatically without asking the user.`,
            }],
          }
          const prompt = ctx.client.session.promptAsync
            ? ctx.client.session.promptAsync({ path: { id: sessionID }, body, query: { directory: ctx.directory } })
            : ctx.client.session.prompt({ path: { id: sessionID }, body, query: { directory: ctx.directory } })
          await prompt.catch(() => null)
        }
      }
    }
    const info = buildIdleSummary(msgs)
    if (!info.key || saved.get(sessionID) === info.key) return
    await call(sessionID, "session_summary_save", {
      repoPath: ctx.directory,
      sessionId: session,
      summary: info.summary,
      nextStep: info.next,
      status: "paused",
    }).catch(() => null)
    await call(sessionID, "handoff_generate", {
      repoPath: ctx.directory,
      sessionId: session,
    }).catch(() => null)
    saved.set(sessionID, info.key)
  }

  return {
    "chat.message": async (
      input: { sessionID: string },
      output: { parts: Array<{ type?: string; text?: string }> },
    ): Promise<void> => {
      const prompt = output.parts
        .filter((part) => part.type === "text" && typeof part.text === "string")
        .map((part) => part.text)
        .join("\n")
        .trim()
      await inject(input.sessionID, prompt)
    },

    "tool.execute.before": async (input: HookInput, output: HookOutput): Promise<void> => {
      if (input.tool.startsWith("workspace_memory_")) {
        throw new Error("workspace_memory MCP tools are reserved for automatic workflow enforcement. Use normal coding tools instead.")
      }
      if (!WRITE_TOOLS.has(input.tool)) return
      const session = await ensure(input.sessionID)
      if (!session) return
      const paths = extractToolPaths(input.tool, output.args, ctx.directory)
      if (paths.length === 0) return
      const drift = await call(input.sessionID, "files_drift_check", {
        repoPath: ctx.directory,
        paths,
      }).catch(() => [])
      const changed = Array.isArray(drift) ? drift.filter((item) => item?.changed === true) : []
      if (changed.length > 0) {
        const message = `workspace_memory blocked ${input.tool}: files drifted since last snapshot (${changed.map((item) => item.path).join(", ")}). Re-read affected files before writing.`
        await logError(input.sessionID, input.tool, output.args, message)
        throw new Error(message)
      }
      await call(input.sessionID, "files_snapshot_create", {
        repoPath: ctx.directory,
        sessionId: session,
        paths,
        reason: "before_write",
      })
      calls.set(partKey(input.sessionID, input.callID), { tool: input.tool, paths })
    },

    "tool.execute.after": async (input: HookInput, output: ToolOutput): Promise<void> => {
      const session = await ensure(input.sessionID)
      if (!session) return

      if (input.tool === "read") {
        const paths = extractToolPaths("write", input.args ?? {}, ctx.directory)
        if (paths.length > 0) {
          await call(input.sessionID, "files_snapshot_create", {
            repoPath: ctx.directory,
            sessionId: session,
            paths,
            reason: "after_read",
          }).catch(() => null)
        }
        return
      }

      if (input.tool === "bash") {
        const exit = typeof output.metadata?.exit === "number" ? output.metadata.exit : null
        const status = exit === 0 ? "success" : "failure"
        await call(input.sessionID, "execution_log_record", {
          repoPath: ctx.directory,
          sessionId: session,
          command: typeof input.args?.command === "string" ? input.args.command : "bash",
          cwd: typeof input.args?.workdir === "string" ? input.args.workdir : ctx.directory,
          exitCode: exit,
          stdoutExcerpt: typeof output.metadata?.output === "string" ? output.metadata.output : output.output,
          stderrExcerpt: exit === 0 ? undefined : output.output,
          status,
        }).catch(() => null)
        await call(input.sessionID, "attempt_record", {
          repoPath: ctx.directory,
          sessionId: session,
          kind: "command",
          target: typeof input.args?.workdir === "string" ? input.args.workdir : ctx.directory,
          summary: typeof output.metadata?.description === "string" ? output.metadata.description : output.title,
          result: exit === 0 ? "success" : "failure",
          fingerprint: exit === null ? "bash:unknown" : `bash:${exit}`,
        }).catch(() => null)
        return
      }

      if (!WRITE_TOOLS.has(input.tool)) return
      const tracked = calls.get(partKey(input.sessionID, input.callID))
      calls.delete(partKey(input.sessionID, input.callID))
      const paths = tracked?.paths ?? extractToolPaths(input.tool, input.args ?? {}, ctx.directory)
      if (paths.length === 0) return

      if (typeof output.output === "string" && /verification failed|failed to find expected lines/i.test(output.output)) {
        await logError(input.sessionID, input.tool, input.args ?? {}, output.output)
        return
      }

      await call(input.sessionID, "files_snapshot_create", {
        repoPath: ctx.directory,
        sessionId: session,
        paths,
        reason: "after_write",
      }).catch(() => null)
      await call(input.sessionID, "attempt_record", {
        repoPath: ctx.directory,
        sessionId: session,
        kind: "patch",
        target: paths[0],
        summary: `${input.tool} completed`,
        result: "success",
        fingerprint: input.tool,
      }).catch(() => null)
    },

    event: async (input: { event: { type: string; properties?: Record<string, unknown> } }): Promise<void> => {
      if (input.event.type === "session.deleted") {
        const info = input.event.properties?.info as { id?: string } | undefined
        if (info?.id) {
          sessions.delete(info.id)
          saved.delete(info.id)
        }
        return
      }

      if (input.event.type !== "session.idle") return
      const sessionID = typeof input.event.properties?.sessionID === "string"
        ? input.event.properties.sessionID
        : undefined
      if (!sessionID) return
      await summarize(sessionID).catch((error) => {
        log("[workspace-memory-automation] idle summarize failed", {
          sessionID,
          error,
        })
      })
    },
  }
}
