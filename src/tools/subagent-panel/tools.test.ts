import { describe, expect, test } from "bun:test"
import { createSubagentPanelTool } from "./tools"

describe("subagent-panel tool", () => {
  test("shows focused task actions and todos", async () => {
    const tool = createSubagentPanelTool({
      getAllDescendantTasks() {
        return [
          {
            id: "task_run",
            sessionID: "ses_child",
            parentSessionID: "ses_root",
            parentMessageID: "msg_root",
            description: "Inspect auth regressions",
            prompt: "Check auth",
            agent: "oracle",
            status: "running",
            startedAt: new Date("2026-03-25T10:00:00Z"),
            progress: {
              toolCalls: 2,
              lastTool: "grep",
              lastUpdate: new Date("2026-03-25T10:01:00Z"),
              lastMessage: "Investigating provider mismatch",
            },
            category: "unspecified-high",
          },
        ]
      },
      listAllTaskHistory() {
        return []
      },
      async getSessionTodos() {
        return [
          { id: "todo_1", content: "Trace failing auth path", status: "in_progress", priority: "high" },
          { id: "todo_2", content: "Write regression test", status: "pending", priority: "medium" },
        ]
      },
    } as any)

    const result = await tool.execute({}, {
      sessionID: "ses_root",
      metadata: () => {},
    } as any)

    expect(result).toContain("## Focused Task")
    expect(result).toContain("background_recover(taskId=\"task_run\", mode=\"continue\")")
    expect(result).toContain("background_cancel(taskId=\"task_run\")")
    expect(result).toContain("[in_progress] Trace failing auth path")
  })
})
