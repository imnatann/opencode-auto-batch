import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import type { BackgroundManager } from "../../features/background-agent"

export function createBackgroundRecover(manager: BackgroundManager): ToolDefinition {
  return tool({
    description: "Attempts recovery for a background task by continuing its session or relaunching it.",
    args: {
      taskId: tool.schema.string().describe("Background task ID to recover."),
      mode: tool.schema.enum(["continue", "relaunch", "cancel_and_relaunch"]).optional().describe("Recovery mode (default: continue)."),
      prompt: tool.schema.string().optional().describe("Optional recovery prompt override."),
    },
    async execute(args) {
      const mode = args.mode ?? "continue"
      const task = manager.getTask(args.taskId)
      if (!task) {
        return `[ERROR] Task not found: ${args.taskId}`
      }

      if (mode === "continue") {
        if (!task.sessionID) {
          return `[ERROR] Task ${task.id} does not have a session yet, so it cannot be continued.`
        }
        const resumed = await manager.resume({
          sessionId: task.sessionID,
          prompt: args.prompt ?? "Continue from the latest valid context and finish the task.",
          parentSessionID: task.parentSessionID,
          parentMessageID: task.parentMessageID,
          parentModel: task.parentModel,
          parentAgent: task.parentAgent,
          parentTools: task.parentTools,
        })
        return `Recovery started via continuation.

Task ID: ${resumed.id}
Session ID: ${resumed.sessionID}
Status: ${resumed.status}`
      }

      if (mode === "cancel_and_relaunch" && (task.status === "running" || task.status === "pending")) {
        await manager.cancelTask(task.id, {
          source: "background_recover",
          abortSession: task.status === "running",
          skipNotification: true,
        })
      }

      const relaunched = await manager.relaunchTask(args.taskId, args.prompt)
      return `Recovery started via relaunch.

Original Task ID: ${task.id}
New Task ID: ${relaunched.id}
Status: ${relaunched.status}`
    },
  })
}
