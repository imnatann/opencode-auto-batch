# Standalone Installation

`opencode-auto-batch` is a standalone OpenCode plugin package.

It installs as its own plugin entry and adds:

- `auto` routing with visible agent notifications
- `Kerjain Semua` batch execution with aggressive safe parallelism
- multiple simultaneous `in_progress` todos in the UI when tasks are truly running together

This repo includes bundled `dist/` output, so users do not need Bun just to install from Git.

## Recommended Repo Name

- `opencode-auto-batch`

## Local Install From Git Repo

1. Clone the repository:

```bash
git clone https://github.com/imnatann/opencode-auto-batch.git "$HOME/opencode-auto-batch"
```

2. Install the plugin into OpenCode's local dependency directory:

```bash
npm install --prefix "$HOME/.config/opencode" "$HOME/opencode-auto-batch"
```

3. Copy the example configs:

```bash
cp "$HOME/opencode-auto-batch/docs/examples/opencode.json" "$HOME/.config/opencode/opencode.json"
cp "$HOME/opencode-auto-batch/docs/examples/oh-my-opencode.json" "$HOME/.config/opencode/oh-my-opencode.json"
```

4. Restart `opencode`.

## Update After Pulling Changes

```bash
git -C "$HOME/opencode-auto-batch" pull --rebase
npm install --prefix "$HOME/.config/opencode" "$HOME/opencode-auto-batch"
```

## Optional Publish Workflow

If you publish this package to npm later, users can install it with:

```bash
npm install --prefix "$HOME/.config/opencode" opencode-auto-batch
```

and keep this in `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-auto-batch"]
}
```

## Current Compatibility Note

The plugin package is standalone, but it currently reuses the `~/.config/opencode/oh-my-opencode.json` compatibility config file for runtime settings.
