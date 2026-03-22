# Release Notes Draft

Suggested title:

`Ownership Planning, Better Diagnostics, and Clearer Background Task Health`

Suggested tag/version:

`v0.1.1`

## Summary

This update makes `opencode-auto-batch` much more explicit about how parallel work is planned and tracked.

The biggest change is a new ownership-planning layer across Prometheus, Atlas, and runtime reminders.

Parallel work is no longer just “run a few things at once.”

Now the system pushes toward explicit ownership bundles, collision boundaries, serial waves, and draft-start tasks before parallel write work fans out.

This release also improves diagnostics:

- background task health is easier to read
- provider/model issues are easier to spot in `doctor`
- install/setup guidance is clearer for real-world provider workflows

## Highlights

### Ownership planning for parallel work

- Atlas prompt variants now require an `Ownership Plan`
- Prometheus plans now include explicit ownership bundle structure
- Atlas runtime reminders now warn when a usable ownership plan is missing before the next parallel write wave
- ownership bundles are expected to be named explicitly as `O1`, `O2`, `O3`, ...

What this means in practice:

- parallel read-only work can still fan out aggressively
- write-capable work is pushed into named ownership bundles
- collisions are expected to move into serial waves instead of being hand-waved away
- draft-start tasks are treated as first-class planning objects

### Better background task health visibility

Background task status now carries more useful health signals.

The formatter can now distinguish cases like:

- `queued`
- `queued-long`
- `starting`
- `silent-long`
- `healthy`
- `possibly-stalled`

This makes it easier to tell the difference between:

- a task that is merely waiting for concurrency
- a task that has started but not emitted progress yet
- a task that may actually be stuck

### New provider-aware doctor checks

`doctor` now has provider/auth-aware diagnostics for cases like:

- runtime overrides pointing to disconnected providers
- override models that do not appear in the cached provider model list
- incomplete runtime cache situations after setup/login

This does not magically fix provider auth bugs in OpenCode core, but it makes plugin-level diagnosis much more concrete.

### Clearer install/setup guidance

The installer now surfaces:

- the runtime config path directly
- a clearer note to reopen `opencode` after provider login so cache/runtime state can refresh

This reduces the classic “I changed config but nothing seems different yet” confusion.

## Files And Areas Touched

Main implementation areas:

- `src/agents/atlas/`
- `src/agents/prometheus/`
- `src/hooks/atlas/`
- `src/tools/background-task/`
- `src/cli/doctor/`
- `docs/examples/`
- `docs/guide/`

## Why This Matters

The plugin already had strong multi-agent behavior.

The weak point was that parallel execution could still feel too implicit.

This release moves the system closer to:

- inspectable orchestration
- explicit ownership
- clearer collision handling
- better trust in background execution
- better diagnostics when advanced setups go wrong

## Current Boundary

These improvements live at the plugin layer.

They improve:

- orchestration quality
- planning clarity
- background task visibility
- install/runtime diagnostics

They do **not** replace OpenCode core fixes for things like:

- OAuth callback bugs in core
- TUI/Web freezes or memory leaks
- internal plugin-loader bugs
- core task/session inheritance bugs

## Upgrade Notes

- reinstall the local package or pull the latest repo state
- restart `opencode`
- if provider checks seem incomplete, log in and reopen `opencode` once so runtime cache can refresh

## Suggested GitHub Release Body

```md
This update makes `opencode-auto-batch` much more explicit about how parallel work is planned and tracked.

## What's new

- ownership planning across Prometheus, Atlas, and runtime reminders
- better background task health visibility (`queued-long`, `silent-long`, `possibly-stalled`, etc.)
- provider-aware `doctor` diagnostics
- clearer installer/runtime guidance

## Why it matters

Parallel work should not just be “fast.” It should also be explainable.

This release pushes the system toward explicit ownership bundles, collision boundaries, serial waves, and draft-start tasks before parallel write work fans out.

That means better safety for concurrent execution and better visibility when things slow down or fail.

## Boundary

These improvements are plugin-layer improvements. They improve orchestration and diagnostics, but they do not replace OpenCode core fixes for OAuth callback bugs, TUI/Web freezes, memory leaks, or internal loader bugs.
```
