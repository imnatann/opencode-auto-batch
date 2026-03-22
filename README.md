# OpenCode Auto Batch

[![CI](https://img.shields.io/github/actions/workflow/status/imnatann/opencode-auto-batch/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/imnatann/opencode-auto-batch/actions/workflows/ci.yml)
[![Stars](https://img.shields.io/github/stars/imnatann/opencode-auto-batch?style=flat-square)](https://github.com/imnatann/opencode-auto-batch/stargazers)
[![Issues](https://img.shields.io/github/issues/imnatann/opencode-auto-batch?style=flat-square)](https://github.com/imnatann/opencode-auto-batch/issues)
[![License](https://img.shields.io/github/license/imnatann/opencode-auto-batch?style=flat-square)](https://github.com/imnatann/opencode-auto-batch/blob/main/LICENSE.md)

OpenCode is good.

Manually choosing agents is not.

This plugin makes OpenCode feel like a small engineering team:

- one default `auto` front door
- visible routing notifications on every request
- `Kerjain Semua` batch execution for option lists and todo lists
- aggressive parallelism for read-heavy work
- strict ownership rules for write-heavy work
- multiple active todos showing `in_progress` at the same time when work is truly concurrent

You ask for work.

It decides the route.

It tells you the route.

It fans out the safe parts.

It keeps overlapping edits from stepping on each other.

## Why This Exists

Most agent setups break in the same place.

They can reason. They can code. They can even plan.

But once the work turns into a list of real tasks, they start doing one of two bad things:

- ask you to pick agents manually
- serialize everything, even when half the work could run right now

`opencode-auto-batch` fixes that.

It is opinionated on purpose.

The default path is simple:

1. start in `auto`
2. let it route itself
3. say `Kerjain Semua` when you want the whole list executed

## What You Get

### `auto` front door

You do not start by choosing between seven modes.

You start with one agent.

`auto` decides whether the work should be:

- answered directly
- routed to a specialist
- executed as a parallel batch

### visible route notifications

The first line always tells you what happened.

Examples:

```text
AUTO -> direct execution
AUTO -> routed to Oracle
AUTO -> routed to Hephaestus
AUTO -> parallel batch execution
```

No guessing. No black box.

### `Kerjain Semua`

After analysis, options, or a todo breakdown, you can just say:

```text
Kerjain Semua
```

That means:

- recover the latest unresolved task list
- classify tasks as read-only or write-capable
- start every safe task immediately
- keep draft workers alive for tasks that can start before dependencies fully land
- serialize only the parts that would collide

### multi-batch execution

This plugin treats parallel work as first-class.

It does not wait for the architecture read to finish before starting the risk review if both are read-only.

It does not wait for roadmap synthesis to fully start if it can begin as a draft and refine later.

It pushes independent work into separate workers, then converges for integration.

### multi-yellow todo visibility

If three tasks are genuinely running at the same time, three todos should show `in_progress`.

This repo changes that behavior.

Parallel work is not hidden behind a fake single yellow line.

### safe parallel write rules

Parallelism is aggressive for reads.

Parallelism is strict for writes.

Two workers do **not** edit the same resource at once when they touch:

- the same file
- the same entrypoint
- the same shared config
- the same lockfile
- the same schema or migration
- the same route registry
- the same barrel export or generated output
- tests for the same feature area

If ownership overlaps, work gets merged or moved into serial waves.

## Agent Setup

### Front-door agents

- `auto` - default router and batch coordinator
- `implement` - execution-first coding
- `research` - repo reading, docs, mapping, explanation
- `debug` - root-cause analysis and minimal safe fixes
- `review` - risk checks, correctness, verification
- `frontend` - UI-heavy work and visual tasks
- `planner` - planning-first execution design
- `deep` - large, clear, multi-file implementation

### Internal specialists used by routing

- `Explore` - fast codebase discovery
- `Librarian` - external docs and research
- `Oracle` - architecture and hard debugging
- `Prometheus` / `Plan` - planning and decomposition
- `Hephaestus` - deep implementation
- `Momus` - review and verification
- `Multimodal-Looker` - visual reasoning

## How Batch Mode Behaves

When batch mode starts, it emits a compact status dashboard like this:

```text
AUTO -> parallel batch execution
AUTO BATCH -> groups: G1 architecture map, G2 readiness review, G3 roadmap draft
AUTO BATCH -> serial: final integration only
AUTO BATCH -> ownership: G1 read-only, G2 read-only, G3 read-only-draft
AUTO STATUS -> running: G1, G2, G3 | waiting: none | serial next: integration only | done: none
```

That is the intended shape:

- clear route
- clear grouping
- clear ownership
- clear serial boundary
- clear progress

## Install

From GitHub:

```bash
git clone https://github.com/imnatann/opencode-auto-batch.git "$HOME/opencode-auto-batch"
npm install --prefix "$HOME/.config/opencode" "$HOME/opencode-auto-batch"
cp "$HOME/opencode-auto-batch/docs/examples/opencode.json" "$HOME/.config/opencode/opencode.json"
cp "$HOME/opencode-auto-batch/docs/examples/runtime-config.json" "$HOME/.config/opencode/oh-my-opencode.json"
```

Then restart `opencode`.

Full install guide: `docs/guide/standalone-installation.md`

## Example Flow

Ask for analysis:

```text
analyze this project and give me the highest-value tasks
```

Then execute the whole list:

```text
Kerjain Semua
```

Or go straight into active work:

```text
ultrawork audit this repo, fix the highest-risk issue, run the relevant verification, and summarize the result
```

## Repository Layout

- `docs/guide/standalone-installation.md` - install and update flow
- `docs/guide/agents-and-routing.md` - front-door agents and route behavior
- `docs/guide/multi-batch.md` - execution waves, ownership, and todo visibility
- `docs/guide/publishing.md` - npm publish and release flow
- `docs/examples/opencode.json` - OpenCode config with `auto` as default
- `docs/examples/runtime-config.json` - runtime config copied to `~/.config/opencode/oh-my-opencode.json`

## Release

- latest changelog: `CHANGELOG.md`
- publish guide: `docs/guide/publishing.md`

## Current Compatibility Note

The package is standalone.

The runtime config file is still copied to:

```text
~/.config/opencode/oh-my-opencode.json
```

That compatibility path stays in place because the underlying runtime still expects it.

The GitHub repo, npm package identity, install flow, and OpenCode plugin entry are all standalone.

## Status

- standalone package name: `opencode-auto-batch`
- standalone repo: `https://github.com/imnatann/opencode-auto-batch`
- local Git install works without Bun because bundled `dist/` is committed

If OpenCode is the shell, this plugin is the routing brain that stops you from babysitting it.
