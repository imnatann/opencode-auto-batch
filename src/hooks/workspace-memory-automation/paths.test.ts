import { describe, expect, it } from "bun:test"

import { extractToolPaths } from "./paths"

describe("workspace-memory path extraction", () => {
  it("extracts direct file tools", () => {
    expect(extractToolPaths("edit", { filePath: "/tmp/a.ts" }, "/repo")).toEqual(["/tmp/a.ts"])
  })

  it("extracts apply_patch targets", () => {
    const patchText = [
      "*** Begin Patch",
      "*** Update File: src/a.ts",
      "@@",
      "-a",
      "+b",
      "*** Move to: src/b.ts",
      "*** End Patch",
    ].join("\n")

    expect(extractToolPaths("apply_patch", { patchText }, "/repo")).toEqual([
      "/repo/src/a.ts",
      "/repo/src/b.ts",
    ])
  })
})
