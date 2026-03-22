import type { BackgroundTask } from "../../features/background-agent"
import { formatDuration } from "./time-format"
import { truncateText } from "./truncate-text"

function formatElapsedMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`
  return `${Math.round(ms / 3_600_000)}h`
}

function buildHealthSummary(task: BackgroundTask): { label: string; note: string } | null {
  const now = Date.now()

  if (task.status === "pending") {
    if (!task.queuedAt) {
      return { label: "queued", note: "Task is waiting for a concurrency slot." }
    }

    const queuedForMs = now - task.queuedAt.getTime()
    return {
      label: queuedForMs >= 5 * 60_000 ? "queued-long" : "queued",
      note:
        queuedForMs >= 5 * 60_000
          ? `Task has been waiting for ${formatElapsedMs(queuedForMs)}. This usually means the concurrency budget is saturated.`
          : `Task has been queued for ${formatElapsedMs(queuedForMs)} and is still waiting for a concurrency slot.`,
    }
  }

  if (task.status !== "running") {
    return null
  }

  if (!task.progress?.lastUpdate) {
    if (!task.startedAt) {
      return { label: "starting", note: "Task has started but no progress timestamp is available yet." }
    }

    const runtimeMs = now - task.startedAt.getTime()
    return {
      label: runtimeMs >= 10 * 60_000 ? "silent-long" : "starting",
      note:
        runtimeMs >= 10 * 60_000
          ? `Task has been running for ${formatElapsedMs(runtimeMs)} without a recorded progress update.`
          : `Task has been running for ${formatElapsedMs(runtimeMs)} and has not emitted a progress update yet.`,
    }
  }

  const lastUpdateMs = now - task.progress.lastUpdate.getTime()
  if (lastUpdateMs >= 10 * 60_000) {
    return {
      label: "possibly-stalled",
      note: `Last recorded progress was ${formatElapsedMs(lastUpdateMs)} ago. The task may be stalled or waiting on a provider/tool response.`,
    }
  }

  return {
    label: "healthy",
    note: `Last recorded progress was ${formatElapsedMs(lastUpdateMs)} ago.`,
  }
}

export function formatTaskStatus(task: BackgroundTask): string {
  let duration: string
  if (task.status === "pending" && task.queuedAt) {
    duration = formatDuration(task.queuedAt, undefined)
  } else if (task.startedAt) {
    duration = formatDuration(task.startedAt, task.completedAt)
  } else {
    duration = "N/A"
  }

  const promptPreview = truncateText(task.prompt, 500)

  let progressSection = ""
  if (task.progress?.lastTool) {
    progressSection = `\n| Last tool | ${task.progress.lastTool} |`
  }

  if (task.progress?.lastUpdate) {
    progressSection += `\n| Last progress | ${task.progress.lastUpdate.toISOString()} |`
  }

  const health = buildHealthSummary(task)
  if (health) {
    progressSection += `\n| Health | ${health.label} |`
  }

  let lastMessageSection = ""
  if (task.progress?.lastMessage) {
    const truncated = truncateText(task.progress.lastMessage, 500)
    const messageTime = task.progress.lastMessageAt ? task.progress.lastMessageAt.toISOString() : "N/A"
    lastMessageSection = `

## Last Message (${messageTime})

\`\`\`
${truncated}
\`\`\``
  }

  let statusNote = ""
  if (task.status === "pending") {
    statusNote = `

> **Queued**: Task is waiting for a concurrency slot to become available.`
  } else if (task.status === "running") {
    statusNote = `

> **Note**: No need to wait explicitly - the system will notify you when this task completes.`
  } else if (task.status === "error") {
    statusNote = `

> **Failed**: The task encountered an error. Check the last message for details.`
  } else if (task.status === "interrupt") {
    statusNote = `

> **Interrupted**: The task was interrupted by a prompt error. The session may contain partial results.`
  }

  if (health) {
    statusNote += `

> **Health**: ${health.note}`
  }

  const durationLabel = task.status === "pending" ? "Queued for" : "Duration"

  return `# Task Status

| Field | Value |
|-------|-------|
| Task ID | \`${task.id}\` |
| Description | ${task.description} |
| Agent | ${task.agent} |
| Status | **${task.status}** |
| ${durationLabel} | ${duration} |
| Session ID | \`${task.sessionID}\` |${progressSection}
${statusNote}
## Original Prompt

\`\`\`
${promptPreview}
\`\`\`${lastMessageSection}`
}
