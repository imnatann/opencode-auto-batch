# Publishing

This repo publishes a single standalone npm package:

```text
opencode-auto-batch
```

No dual-package release train.

No platform package fan-out.

No version bump automation hidden inside a workflow.

## Release Shape

The release flow is intentionally small:

1. update `package.json` version
2. update `CHANGELOG.md`
3. commit the release changes
4. create and push a tag like `v0.1.0`
5. let GitHub Actions publish to npm

## Required Secret

Add this repository secret in GitHub:

```text
NPM_TOKEN
```

The token must belong to an npm account that can publish `opencode-auto-batch`.

## Publish Workflow

The workflow lives at:

```text
.github/workflows/publish.yml
```

It runs on:

- `workflow_dispatch`
- pushed tags matching `v*`

Before publishing, it:

- installs dependencies
- runs typecheck
- runs tests
- verifies tag version matches `package.json`
- runs `npm pack --dry-run`

Then it publishes with provenance.

## First Publish Checklist

- make sure `opencode-auto-batch` is available on npm
- add `NPM_TOKEN` in GitHub secrets
- push a version tag

Example:

```bash
git tag v0.1.0
git push origin v0.1.0
```
