import { resolve } from "node:path"

function collectPatchPaths(text: string, root: string): string[] {
  const out = new Set<string>()
  const lines = text.split("\n")
  for (const line of lines) {
    const match = line.match(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/)
    if (match?.[1]) out.add(resolve(root, match[1].trim()))
    const move = line.match(/^\*\*\* Move to: (.+)$/)
    if (move?.[1]) out.add(resolve(root, move[1].trim()))
  }
  return [...out]
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

export function extractToolPaths(tool: string, args: Record<string, unknown>, root: string): string[] {
  if (tool === "edit" || tool === "write" || tool === "multiedit") {
    const file = asString(args.filePath)
    return file ? [resolve(root, file)] : []
  }

  if (tool === "ast_grep_replace") {
    const paths = Array.isArray(args.paths) ? args.paths.filter((item): item is string => typeof item === "string") : []
    return paths.map((item) => resolve(root, item))
  }

  if (tool === "apply_patch") {
    const patch = asString(args.patchText)
    return patch ? collectPatchPaths(patch, root) : []
  }

  return []
}

export function extractToolTarget(tool: string, args: Record<string, unknown>, root: string): string | null {
  return extractToolPaths(tool, args, root)[0] ?? null
}
