import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import type { BackgroundManager } from "../../features/background-agent"
import type { BackgroundTask } from "../../features/background-agent"
import type { TaskHistoryEntry } from "../../features/background-agent/task-history"
import { formatDuration } from "../background-task/time-format"
import type { SubagentPanelArgs } from "./types"

type TodoItem = {
  id: string
  content: string
  status: string
  priority: string
}

type ToolContextWithSession = {
  sessionID: string
  metadata?: (input: { title?: string; metadata?: Record<string, unknown> }) => void
}

function truncatePreview(value: string | undefined, max = 180): string | null {
  if (!value) return null
  const normalized = value.replace(/\s+/g, " ").trim()
  if (normalized.length === 0) return null
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 3)}...`
}

function taskPreview(task: BackgroundTask): string | null {
  return truncatePreview(task.progress?.lastMessage) ?? truncatePreview(task.result) ?? truncatePreview(task.error)
}

function historyPreview(entry: TaskHistoryEntry): string | null {
  return truncatePreview(entry.description)
}

function sortTask(a: BackgroundTask, b: BackgroundTask): number {
  const aTime = a.startedAt?.getTime() ?? a.queuedAt?.getTime() ?? 0
  const bTime = b.startedAt?.getTime() ?? b.queuedAt?.getTime() ?? 0
  return bTime - aTime
}

function formatTaskLine(task: BackgroundTask): string {
  const durationStart = task.startedAt ?? task.queuedAt ?? new Date()
  const duration = formatDuration(durationStart, task.completedAt)
  const category = task.category ? ` [${task.category}]` : ""
  const model = task.model ? ` | model: ${task.model.providerID}/${task.model.modelID}` : ""
  const lastTool = task.progress?.lastTool ? ` | last tool: ${task.progress.lastTool}` : ""
  const session = task.sessionID ? ` | session: \`${task.sessionID}\`` : ""
  const preview = taskPreview(task)

  return [
    `- **${task.description}**`,
    `  - status: \`${task.status}\` | agent: \`${task.agent}\`${category}${model}${lastTool}${session}`,
    `  - duration: ${duration}`,
    ...(preview ? [`  - preview: ${preview}`] : []),
  ].join("\n")
}

function formatHistoryLine(entry: TaskHistoryEntry): string {
  const duration = entry.startedAt ? formatDuration(entry.startedAt, entry.completedAt) : "n/a"
  const session = entry.sessionID ? ` | session: \`${entry.sessionID}\`` : ""
  const category = entry.category ? ` [${entry.category}]` : ""
  const preview = historyPreview(entry)

  return [
    `- **${entry.description}**`,
    `  - status: \`${entry.status}\` | agent: \`${entry.agent}\`${category}${session}`,
    `  - duration: ${duration}`,
    ...(preview ? [`  - preview: ${preview}`] : []),
  ].join("\n")
}

function pickFocus(tasks: BackgroundTask[]): BackgroundTask | null {
  return tasks.find((task) => task.status === "running")
    ?? tasks.find((task) => task.status === "pending")
    ?? tasks[0]
    ?? null
}

function formatTodoLine(item: TodoItem): string {
  return `- [${item.status}] ${item.content}`
}

function formatActions(task: BackgroundTask): string[] {
  const out = [
    `- Inspect: \`background_output(task_id=\"${task.id}\", full_session=true)\``,
  ]
  if (task.sessionID) {
    out.push(`- Open session: \`session_read(session_id=\"${task.sessionID}\", include_todos=true)\``)
    out.push(`- Continue: \`background_recover(taskId=\"${task.id}\", mode=\"continue\")\``)
  }
  out.push(`- Retry cleanly: \`background_recover(taskId=\"${task.id}\", mode=\"cancel_and_relaunch\")\``)
  if (task.status === "running" || task.status === "pending") {
    out.push(`- Cancel: \`background_cancel(taskId=\"${task.id}\")\``)
  }
  return out
}

export function createSubagentPanelTool(manager: BackgroundManager): ToolDefinition {
  return tool({
    description: "Shows a sidebar-style snapshot of subagents, statuses, and previews for the current or specified session tree.",
    args: {
      session_id: tool.schema.string().optional().describe("Root session ID to inspect. Defaults to the current session."),
      include_completed: tool.schema.boolean().optional().describe("Include recent completed history for the selected session tree (default: true)."),
      limit: tool.schema.number().optional().describe("Max rows per section (default: 12)."),
    },
    async execute(args: SubagentPanelArgs, toolContext) {
      const ctx = toolContext as ToolContextWithSession
      const rootSessionID = args.session_id ?? ctx.sessionID
      const limit = Math.max(1, Math.min(args.limit ?? 12, 50))
      const includeCompleted = args.include_completed ?? true

      const descendantTasks = manager.getAllDescendantTasks(rootSessionID).sort(sortTask)
      const descendantSessionIDs = new Set(descendantTasks.map((task) => task.sessionID).filter((value): value is string => Boolean(value)))
      descendantSessionIDs.add(rootSessionID)

      const history = includeCompleted
        ? manager
            .listAllTaskHistory()
            .filter(({ parentSessionID }) => descendantSessionIDs.has(parentSessionID))
            .map(({ entry }) => entry)
            .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
        : []

      const running = descendantTasks.filter((task) => task.status === "running").slice(0, limit)
      const queued = descendantTasks.filter((task) => task.status === "pending").slice(0, limit)
      const terminal = descendantTasks.filter((task) => ["completed", "error", "cancelled", "interrupt"].includes(task.status)).slice(0, limit)
      const completedHistory = history.filter((entry) => ["completed", "error", "cancelled", "interrupt"].includes(entry.status)).slice(0, limit)
      const focused = pickFocus(descendantTasks)
      const stalled = descendantTasks.filter((task) => {
        if (task.status !== "running") return false
        const last = task.progress?.lastUpdate?.getTime()
        return typeof last === "number" && Date.now() - last > 10 * 60_000
      }).length
      const retried = descendantTasks.filter((task) => (task.attemptCount ?? 0) > 0).length
      const writeCapable = descendantTasks.filter((task) => task.writeCapable).length
      const workspaces = new Set(
        descendantTasks
          .flatMap((task) => task.ownershipResources ?? [])
          .map((item) => item.split("/")[0])
          .filter(Boolean),
      )

      ctx.metadata?.({
        title: `Subagent Panel - ${rootSessionID}`,
        metadata: {
          sessionId: rootSessionID,
          running: running.length,
          queued: queued.length,
          terminal: terminal.length,
          history: completedHistory.length,
          stalled,
          retried,
        },
      })

      const sections: string[] = []
      sections.push(`# Subagent Panel`)
      sections.push(`- Root session: \`${rootSessionID}\``)
      sections.push(`- Active descendants: ${descendantTasks.length}`)
      sections.push(`- Running: ${running.length} | Queued: ${queued.length} | Terminal in memory: ${terminal.length}${includeCompleted ? ` | History: ${completedHistory.length}` : ""}`)
      sections.push(`- Stalled: ${stalled} | Retried: ${retried} | Write-capable: ${writeCapable} | Workspace roots: ${workspaces.size}`)

      sections.push(`\n## Running`)
      sections.push(running.length > 0 ? running.map(formatTaskLine).join("\n") : `- None`)

      sections.push(`\n## Queued`)
      sections.push(queued.length > 0 ? queued.map(formatTaskLine).join("\n") : `- None`)

      sections.push(`\n## Terminal (still in memory)`)
      sections.push(terminal.length > 0 ? terminal.map(formatTaskLine).join("\n") : `- None`)

      if (focused) {
        const todos = focused.sessionID ? await manager.getSessionTodos(focused.sessionID) : []
        const active = todos.filter((item) => item.status !== "completed" && item.status !== "cancelled")
        sections.push(`\n## Focused Task`)
        sections.push(`- Task ID: \`${focused.id}\``)
        sections.push(`- Description: ${focused.description}`)
        sections.push(`- Status: \`${focused.status}\` | Agent: \`${focused.agent}\`${focused.category ? ` [${focused.category}]` : ""}`)
        if (focused.sessionID) {
          sections.push(`- Session: \`${focused.sessionID}\``)
        }
        if (focused.progress?.lastTool) {
          sections.push(`- Last tool: \`${focused.progress.lastTool}\``)
        }
        const preview = taskPreview(focused)
        if (preview) {
          sections.push(`- Preview: ${preview}`)
        }
        sections.push(`\n### Suggested Actions`)
        sections.push(formatActions(focused).join("\n"))
        sections.push(`\n### Active Todos`)
        sections.push(active.length > 0 ? active.slice(0, 4).map(formatTodoLine).join("\n") : `- None`)
      }

      if (includeCompleted) {
        sections.push(`\n## Recent Completed History`)
        sections.push(completedHistory.length > 0 ? completedHistory.map(formatHistoryLine).join("\n") : `- None`)
      }

      sections.push(`\n> This is the plugin-side sidebar snapshot. If your OpenCode core includes the newer session sidebar patch, this output now mirrors the same open, continue, retry, and cancel workflow more closely.`)

      return sections.join("\n")
    },
  })
}
