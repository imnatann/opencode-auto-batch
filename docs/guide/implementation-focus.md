# Implementation Focus

This package currently concentrates on five areas that are realistic to improve from the plugin layer.

## 1. Background Reliability

- better status output for queued, silent, healthy, and possibly-stalled tasks
- clearer parent-session notifications
- more useful diagnostics when delegated work does not progress

## 2. Safe Parallel Ownership

- batch prompts are expected to assign explicit ownership bundles before parallel writes begin
- ownership bundles should be named explicitly as `O1`, `O2`, `O3`, ...
- read-only work can fan out aggressively
- write-capable work must be grouped into non-overlapping bundles or serial waves
- if the plan lacks an ownership section, Atlas should pause the next parallel write wave and remind the user/agent to add it

## 3. Routing And Observability

- route is announced first
- batch execution uses explicit `AUTO BATCH`, `AUTO STATUS`, and `AUTO RESULT` lines
- status should refresh at wave boundaries, not only at the end

## 4. Config And Install UX

- installer surfaces the runtime config path directly
- runtime refresh expectations are stated after login/setup
- examples are tuned for `auto` as the default front door

## 5. Provider And Auth Diagnostics

- doctor can warn when runtime overrides target disconnected providers
- doctor can warn when override models are not advertised in the cached provider model list
- diagnostics remain non-destructive and rely on the current runtime cache/state

## 6. Workflow Presets And Analytics

- workflow presets can bias front-door prompts toward bugfix, feature, audit, or refactor behavior
- analytics stay local and lightweight: running, queued, completed, stalled, and retried counts are enough to expose bottlenecks

## 7. Workspace-Aware Batching

- monorepo/package boundaries should influence ownership planning
- package roots, lockfiles, shared configs, schemas, generated outputs, and cross-package tests should be treated as collision boundaries

## Important Boundary

These improvements live at the plugin layer.

They help with orchestration, visibility, scheduling, diagnostics, and workflow safety.

They do not replace OpenCode core fixes for issues like:

- OAuth callback bugs in core
- TUI/Web freezes and memory leaks
- internal plugin-loader bugs
- core session-engine permission inheritance bugs
