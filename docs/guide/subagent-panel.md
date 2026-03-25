# Subagent Panel

`opencode-auto-batch` now exposes a plugin-side subagent panel snapshot.

Current command surface:

```text
subagent_panel
```

What it shows:

- running subagents
- queued subagents
- terminal tasks still in memory
- recent completed history
- session IDs, agent names, and short previews

Important boundary:

- this is the plugin-side data/view layer
- a persistent right sidebar inside OpenCode still requires an OpenCode core UI patch if your OpenCode build does not already include it

If you are running a newer OpenCode core with the session sidebar patch, this plugin-side panel now lines up more closely with that flow:

- focused subagent details
- continue / retry / cancel guidance
- active todo preview for the focused subagent

## Example

The tool returns a sidebar-style snapshot like:

```text
# Subagent Panel
- Root session: `ses_...`
- Active descendants: 4
- Running: 2 | Queued: 1 | Terminal in memory: 1 | History: 3

## Running
- **Read repo config**
  - status: `running` | agent: `oracle` | session: `ses_abc`
  - duration: 42s
  - preview: checking provider mismatch and config drift...
```

## Why this exists

This is meant to provide the data and formatting layer that a native sidebar can reuse.

It also gives you a usable fallback when the plugin can track subagents but the OpenCode core UI does not yet expose a dedicated right-side panel.
