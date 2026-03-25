# Standalone Installation

`opencode-auto-batch` installs as its own OpenCode plugin entry.

No wrapper repo.

No local overlay hack.

Install OpenCode, clone this repo, install it into OpenCode's local dependency space, copy the example configs, restart OpenCode.

This repo commits bundled `dist/`, so Git installs work even if the user does not have Bun.

## Quick Install

Install OpenCode first:

```bash
brew install opencode
```

This repo is currently pinned to OpenCode package compatibility `1.2.27` so the plugin can be reinstalled cleanly on other machines.

```bash
mkdir -p "$HOME/.config/opencode"
git clone https://github.com/imnatann/opencode-auto-batch.git "$HOME/opencode-auto-batch"
npm install --prefix "$HOME/.config/opencode" "$HOME/opencode-auto-batch"
cp "$HOME/opencode-auto-batch/docs/examples/opencode.json" "$HOME/.config/opencode/opencode.json"
cp "$HOME/opencode-auto-batch/docs/examples/runtime-config.json" "$HOME/.config/opencode/oh-my-opencode.json"
```

Then restart `opencode`.

## What The Install Does

- installs `opencode-auto-batch` into `~/.config/opencode/node_modules`
- makes `opencode-auto-batch` the plugin entry in `~/.config/opencode/opencode.json`
- sets `auto` as the default front-door agent
- installs the runtime config that powers route notifications, multi-batch execution, and high-concurrency background workers

## Update Flow

```bash
brew upgrade opencode
git -C "$HOME/opencode-auto-batch" pull --rebase
npm install --prefix "$HOME/.config/opencode" "$HOME/opencode-auto-batch"
```

Restart `opencode` after updating.

## Optional npm Install Later

If this package is published to npm, the install becomes:

```bash
npm install --prefix "$HOME/.config/opencode" opencode-auto-batch
```

and `~/.config/opencode/opencode.json` keeps:

```json
{
  "plugin": ["opencode-auto-batch"]
}
```

## Compatibility Note

The package identity is standalone.

The runtime config still lives at:

```text
~/.config/opencode/oh-my-opencode.json
```

That path remains for runtime compatibility only.
