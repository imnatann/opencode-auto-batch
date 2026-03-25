import { join } from "node:path"

import type { ClaudeCodeMcpServer } from "../../features/claude-code-mcp-loader/types"
import { detectConfigFile, getOpenCodeConfigPaths, readJsoncFile } from "../../shared"

type LocalMcp = {
  type?: string
  command?: string[]
  environment?: Record<string, string>
}

type OpenCodeCfg = {
  mcp?: Record<string, LocalMcp>
}

function readCfg(path: string): OpenCodeCfg | null {
  const file = detectConfigFile(path)
  if (file.format === "none") return null
  return readJsoncFile<OpenCodeCfg>(file.path)
}

function mapServer(cfg: OpenCodeCfg | null): ClaudeCodeMcpServer | null {
  const item = cfg?.mcp?.workspace_memory
  if (!item || item.type !== "local" || !Array.isArray(item.command) || item.command.length === 0) {
    return null
  }

  return {
    type: "stdio",
    command: item.command[0],
    args: item.command.slice(1),
    env: item.environment,
  }
}

export function resolveWorkspaceMemoryServer(dir: string): ClaudeCodeMcpServer | null {
  const user = getOpenCodeConfigPaths({ binary: "opencode", version: null, checkExisting: true })
  const project = readCfg(join(dir, "opencode"))
  return mapServer(project) ?? mapServer(readCfg(join(user.configDir, "opencode")))
}
