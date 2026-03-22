# Multi-Batch Execution

This repo treats batch execution as a product feature, not an accident.

## The Trigger

If the agent has already produced a list of tasks, options, or todos, you can say:

```text
Kerjain Semua
```

That acts as permission to execute every unresolved item from the latest assistant-generated list.

## What Happens Next

The coordinator does four things:

1. recover the unresolved list
2. classify tasks as read-only or write-capable
3. build ownership groups and dependency waves
4. start every safe worker immediately

## Ownership Plan

Before a parallel write wave begins, the planner/orchestrator should emit an ownership plan with explicit bundle IDs.

Example:

```text
OWNERSHIP PLAN:
- Bundles:
  - O1: auth API updates -> src/api/auth/*, route registry
  - O2: readiness audit -> read-only
  - O3: dashboard UI changes -> src/ui/dashboard/*
- Collision Boundaries:
  - src/routes/index.ts shared by O1 and O3
- Serial Waves:
  - Wave 1: O1, O2
  - Wave 2: O3
- Draft-Start Tasks:
  - D1: roadmap synthesis can start as read-only draft
```

Without that structure, parallel writes are advisory at best.

## Read Work vs Write Work

### Read-only work

Read-only workers can run together even when they inspect the same files.

That includes:

- repo mapping
- test and config audits
- architecture analysis
- roadmap drafting
- review and documentation work

This is why multiple analysis todos can turn yellow at the same time.

### Write-capable work

Write-capable workers are isolated by ownership.

If two tasks touch the same shared resource, they do not write at the same time.

Collision boundaries include:

- same file
- same entrypoint
- same shared config
- same lockfile
- same schema or migration
- same route registry
- same barrel export
- same generated output
- tests for the same feature area

If overlap exists, the system merges the work or runs it in serial waves.

## Draft-Resume Workers

Some tasks depend on outputs from earlier tasks, but still have useful work they can start now.

Example:

- architecture map
- readiness review
- roadmap synthesis

The roadmap worker does not need to wait completely idle.

It can start as a draft worker, gather repo context, hold its session, then resume once the other workers finish.

That is how batch mode stays aggressive without becoming reckless.

## Progress Format

Batch mode emits compact checkpoints:

```text
AUTO -> parallel batch execution
AUTO BATCH -> groups: G1 ..., G2 ..., G3 ...
AUTO BATCH -> serial: ...
AUTO BATCH -> ownership: ...
AUTO STATUS -> running: ... | waiting: ... | serial next: ... | done: ...
AUTO RESULT -> completed: ... | skipped: ... | blocked: ...
```

## Multi-Yellow Todos

When multiple workers are genuinely active at the same time, their todos should all be marked `in_progress`.

This repo changes the todo discipline to allow that.

Parallel work should look parallel.
